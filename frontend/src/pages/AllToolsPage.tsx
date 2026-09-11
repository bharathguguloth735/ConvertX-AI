import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, ArrowRight, X, Sparkles } from 'lucide-react';
import { TOOL_CATEGORIES, searchTools, getToolsByCategory } from '@/utils/tools';

const AllToolsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    setActiveCategory(cat);
  }, [searchParams]);

  const handleCategorySelect = (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'all') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: catId });
    }
  };

  const tools = query ? searchTools(query) : getToolsByCategory(activeCategory);

  const handleToolClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>35+ High-Performance Tools</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            All <span className="gradient-text">Tools & Utilities</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Convert, compress, edit, and analyze documents, media, and images in seconds.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <div className="flex items-center bg-slate-900/90 border-2 border-slate-800 hover:border-slate-700 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-xl transition-all">
            <Search className="w-5 h-5 text-blue-400 mr-3.5 flex-shrink-0" />
            <input
              id="all-tools-search"
              type="text"
              placeholder="Search tools by name, format, or keyword (e.g. PDF, MP3, OCR, Compress)..."
              className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none min-w-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                title="Clear search"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        {!query && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {TOOL_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`cat-btn-${cat.id}`}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-glow border border-blue-400/30 scale-105'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
          <span>
            Showing <strong className="text-white">{tools.length}</strong> {tools.length === 1 ? 'tool' : 'tools'}
            {query && <> for "<span className="text-blue-400">{query}</span>"</>}
          </span>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-blue-400 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="tool-card group cursor-pointer"
              onClick={() => handleToolClick(tool.route)}
              id={`tool-${tool.id}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="tool-icon w-11 h-11 rounded-xl bg-surface-800 border border-surface-700/50 flex items-center justify-center text-2xl flex-shrink-0">
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">{tool.title}</h3>
                    {tool.isNew && <span className="badge badge-info text-xs px-1.5 py-0.5">New</span>}
                    {tool.isPremium && <Star className="w-3 h-3 text-amber-400" fill="currentColor" />}
                  </div>
                  <span className="text-slate-600 text-xs capitalize">{tool.category}</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{tool.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {tool.acceptedFormats.slice(0, 3).map(f => (
                    <span key={f} className="text-xs px-1.5 py-0.5 bg-surface-800 rounded font-mono text-slate-600 uppercase">
                      {f}
                    </span>
                  ))}
                  {tool.acceptedFormats.length > 3 && (
                    <span className="text-xs text-slate-600">+{tool.acceptedFormats.length - 3}</span>
                  )}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>

        {tools.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No tools found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllToolsPage;
