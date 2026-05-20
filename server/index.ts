// server/index.ts
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiRouter } from './routes/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(express.json())
app.use('/api', createApiRouter())

// Production: serve frontend static files
const distPath = path.resolve(__dirname, '..', 'dist')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`ProjectHub backend running on http://127.0.0.1:${PORT}`)
})
