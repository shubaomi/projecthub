#!/bin/bash
# ProjectHub Mac/Linux startup script

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "========================================"
echo "  ProjectHub - Local Development Hub"
echo "========================================"
echo ""

# Get the actual paths to node first (needed for npm install too)
NODE_BIN=$(which node 2>/dev/null)
if [ -z "$NODE_BIN" ]; then
    echo "[Error] node not found in PATH"
    echo "Please ensure Node.js is installed and in your PATH"
    echo "Press Enter to exit..."
    read
    exit 1
fi
echo "[Debug] Node: $NODE_BIN"

# Set PATH to include node's directory for npm child processes
export PATH="$(dirname "$NODE_BIN"):$PATH"

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo "[Info] Dependencies not found, running npm install..."
    npm install
    install_result=$?
    if [ $install_result -ne 0 ]; then
        echo ""
        echo "[Error] npm install failed with exit code $install_result"
        echo "Press Enter to exit..."
        read
        exit 1
    fi
    echo "[OK] Dependencies installed"
    echo ""
fi

# Check if required packages exist
required_packages=("tsx" "vite")
for pkg in "${required_packages[@]}"; do
    if [ ! -d "node_modules/$pkg" ]; then
        echo "[Info] Package '$pkg' not found, running npm install..."
        npm install
        install_result=$?
        if [ $install_result -ne 0 ]; then
            echo ""
            echo "[Error] npm install failed with exit code $install_result"
            echo "Press Enter to exit..."
            read
            exit 1
        fi
        echo "[OK] Dependencies installed"
        echo ""
        break
    fi
done

echo "[Check] Dependencies ready"
echo ""

# Detect if we're on Windows (Git Bash / MSYS / Cygwin)
is_windows=false
if [[ "$(uname)" == *"MINGW"* ]] || [[ "$(uname)" == *"MSYS"* ]] || [[ "$(uname)" == *"CYGWIN"* ]]; then
    is_windows=true
fi

# Kill process on specific port - cross-platform implementation
kill_by_port() {
    local port=$1

    if $is_windows; then
        # Windows: use netstat + taskkill
        local output=$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING)
        if [ -n "$output" ]; then
            local pids=$(echo "$output" | awk '{print $NF}' | sort -u)
            for pid in $pids; do
                echo "  Port $port: killing PID $pid"
                taskkill //F //PID $pid 2>/dev/null
            done
        else
            echo "  Port $port: no process found"
        fi
    elif command -v lsof &> /dev/null; then
        # macOS/Linux with lsof
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "  Port $port: killing PIDs $pids"
            echo "$pids" | xargs kill -9 2>/dev/null
        else
            echo "  Port $port: no process found"
        fi
    elif command -v ss &> /dev/null; then
        # Linux with ss
        local pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+')
        if [ -n "$pids" ]; then
            echo "  Port $port: killing PIDs $pids"
            echo "$pids" | xargs kill -9 2>/dev/null
        else
            echo "  Port $port: no process found"
        fi
    else
        echo "  Port $port: no available tool to check (lsof/ss)"
    fi
}

# Cleanup function - kill only processes on our ports
cleanup() {
    echo ""
    echo "Shutting down..."
    kill_by_port 13001
    kill_by_port 13000
    echo "ProjectHub stopped"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Kill any existing processes on our ports
echo "[Cleanup] Checking ports 13001 and 13000..."
kill_by_port 13001
kill_by_port 13000
sleep 1

TSX_CLI="$SCRIPT_DIR/../node_modules/tsx/dist/cli.mjs"
VITE_CLI="$SCRIPT_DIR/../node_modules/vite/bin/vite.js"

echo "[Debug] TSX: $TSX_CLI"
echo "[Debug] Vite: $VITE_CLI"
echo ""

# Start backend with nohup to prevent SIGHUP from terminating it
echo "[Backend] Starting on port 13001..."
export PORT=13001
nohup "$NODE_BIN" "$TSX_CLI" server/index.ts > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend started with PID: $BACKEND_PID"

sleep 3

# Check if backend is actually running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "  [Error] Backend failed to start. Log:"
    cat /tmp/backend.log
    echo "Press Enter to exit..."
    read
    exit 1
fi

echo "[Frontend] Starting on port 13000..."
nohup "$NODE_BIN" "$VITE_CLI" --port=13000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend started with PID: $FRONTEND_PID"

echo ""
echo "ProjectHub is running:"
echo "  Frontend: http://localhost:13000"
echo "  Backend:  http://localhost:13001"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Monitor jobs and keep running
failed=0
while true; do
    sleep 2

    # Check if processes are still running
    backend_running=false
    frontend_running=false

    if kill -0 $BACKEND_PID 2>/dev/null; then
        backend_running=true
    fi

    if kill -0 $FRONTEND_PID 2>/dev/null; then
        frontend_running=true
    fi

    if [ "$backend_running" = false ] && [ "$frontend_running" = false ]; then
        echo ""
        echo "[Error] Both services have stopped unexpectedly"
        echo "Backend log:"
        cat /tmp/backend.log 2>/dev/null | tail -20
        echo "Frontend log:"
        cat /tmp/frontend.log 2>/dev/null | tail -20
        failed=1
        break
    fi

    if [ "$backend_running" = false ]; then
        echo "[Warning] Backend service stopped"
    fi
    if [ "$frontend_running" = false ]; then
        echo "[Warning] Frontend service stopped"
    fi
done

echo "Press Enter to exit..."
read
[ $failed -eq 1 ] && echo "Services exited with errors"