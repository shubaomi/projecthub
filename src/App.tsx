import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Folder, Terminal, LayoutGrid, List, Settings, 
  Code2, ExternalLink, Play, Database, Server, Smartphone, 
  MoreVertical, Cpu
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_PROJECTS = [
  {
    id: 1,
    name: 'E-commerce Frontend',
    path: '~/Workspace/company/ecommerce-frontend',
    type: 'React',
    icon: LayoutGrid,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    lastModified: '2 hours ago',
    tags: ['Frontend', 'Vite', 'Tailwind'],
  },
  {
    id: 2,
    name: 'Auth Microservice',
    path: '~/Workspace/backend/auth-service',
    type: 'Go',
    icon: Server,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    lastModified: 'Yesterday',
    tags: ['Backend', 'Go', 'gRPC'],
  },
  {
    id: 3,
    name: 'Mobile App',
    path: '~/Workspace/personal/finance-app',
    type: 'React Native',
    icon: Smartphone,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    lastModified: '3 days ago',
    tags: ['Mobile', 'Expo'],
  },
  {
    id: 4,
    name: 'Data Pipeline',
    path: '~/Workspace/data/pipeline-scripts',
    type: 'Python',
    icon: Database,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    lastModified: 'Last week',
    tags: ['Data', 'Python', 'Pandas'],
  },
  {
    id: 5,
    name: 'Personal Website',
    path: '~/Workspace/personal/portfolio-v3',
    type: 'Next.js',
    icon: Code2,
    color: 'text-slate-300',
    bg: 'bg-slate-300/10',
    lastModified: '1 month ago',
    tags: ['Frontend', 'Next.js'],
  },
  {
    id: 6,
    name: 'Machine Learning Model',
    path: '~/Workspace/research/ml-vision',
    type: 'Python',
    icon: Cpu,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    lastModified: '2 months ago',
    tags: ['AI', 'PyTorch'],
  }
];

const CATEGORIES = ['All', 'Frontend', 'Backend', 'Mobile', 'Data', 'Personal'];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredProjects = MOCK_PROJECTS.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'All' || project.tags.includes(activeCategory) || project.tags.some(t => activeCategory.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(activeCategory.toLowerCase()));
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-stone-950 text-stone-300 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-64 border-r border-stone-800 bg-stone-950/50 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 text-stone-100 font-semibold text-lg tracking-tight">
            <div className="bg-orange-500 p-1.5 rounded-lg text-white">
              <Folder size={20} strokeWidth={2.5} />
            </div>
            Project Hub
          </div>
        </div>

        <div className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Categories
        </div>
        <div className="px-3 flex-1 overflow-y-auto space-y-1">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3
                ${activeCategory === category 
                  ? 'bg-stone-800 text-stone-100 font-medium' 
                  : 'hover:bg-stone-800/50 text-stone-400 hover:text-stone-200'}`}
            >
              {category === 'All' && <LayoutGrid size={16} />}
              {category === 'Frontend' && <LayoutGrid size={16} />}
              {category === 'Backend' && <Server size={16} />}
              {category === 'Mobile' && <Smartphone size={16} />}
              {category === 'Data' && <Database size={16} />}
              {category === 'Personal' && <Folder size={16} />}
              {category}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-stone-800">
          <button className="flex items-center gap-3 text-sm text-stone-400 hover:text-stone-200 w-full px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors">
            <Settings size={18} />
            Settings
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="h-20 border-b border-stone-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
              <input 
                type="text" 
                placeholder="Search projects, tags, or frameworks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600 transition-all placeholder-stone-600 text-stone-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-orange-500/20">
              + Scan Directory
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-stone-100 flex items-center gap-2">
              {activeCategory === 'All' ? 'All Projects' : `${activeCategory} Projects`}
              <span className="text-stone-500 text-lg font-normal">({filteredProjects.length})</span>
            </h1>
            <p className="text-stone-400 text-sm mt-1">
              Visualize and manage your local development workspace.
            </p>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-800 rounded-2xl">
              <Folder className="text-stone-700 mb-4" size={48} />
              <p className="text-stone-400">No projects found for this filter.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-stone-900/50 border border-stone-800 rounded-2xl p-5 hover:border-stone-700 transition-colors group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${project.bg}`}>
                        <project.icon className={project.color} size={24} />
                      </div>
                      <button className="text-stone-600 hover:text-stone-300 transition-colors p-1">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                    
                    <h3 className="text-stone-100 font-medium text-lg mb-1 truncate">
                      {project.name}
                    </h3>
                    
                    <div className="font-mono text-xs text-stone-500 mb-4 truncate flex items-center gap-1.5" title={project.path}>
                      <Terminal size={12} />
                      {project.path}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-stone-800 text-stone-300 rounded-md text-xs font-medium border border-stone-700/50">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-stone-800/50 flex items-center justify-between">
                      <span className="text-xs text-stone-500">
                        Updated {project.lastModified}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors group-hover:text-white"
                          title="Open in VS Code"
                        >
                          <Code2 size={16} />
                        </button>
                        <button 
                          className="bg-stone-800 hover:bg-stone-700 text-stone-200 p-2 rounded-lg transition-colors group-hover:text-white"
                          title="Start Dev Server"
                        >
                          <Play size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </main>
      </div>
      
      {/* DEMO NOTICE */}
      <div className="absolute bottom-4 right-6 max-w-sm bg-stone-800/90 backdrop-blur-sm border border-stone-700 p-4 rounded-xl shadow-2xl z-50">
        <h4 className="flex items-center gap-2 font-medium text-stone-200 mb-2">
          <Terminal size={16} className="text-orange-400" />
          Prototype Architecture
        </h4>
        <p className="text-xs text-stone-400 leading-relaxed">
          This UI demonstrates the recommended approach: a <strong>Local Web App</strong>. 
          To make this functional, we would connect this frontend to a lightweight Node.js backend running on your machine, enabling automatic file scanning and one-click IDE opening.
        </p>
      </div>
    </div>
  );
}
