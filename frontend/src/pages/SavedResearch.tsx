import { useState, useMemo } from 'react';
import { 
  Bookmark, 
  Search, 
  FileText, 
  Trash2, 
  Eye, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  CheckCircle, 
  Filter
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSavedResearch, type SavedDocument } from '../context/SavedResearchContext';
import { DocumentModal } from '../components/DocumentModal';

export function SavedResearch() {
  const navigate = useNavigate();
  const { savedDocs, removeSaved, totalSaved } = useSavedResearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeDoc, setActiveDoc] = useState<SavedDocument | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    savedDocs.forEach(d => {
      if (d.category) set.add(d.category);
      if (d.document_type) set.add(d.document_type);
    });
    return ['All', ...Array.from(set)];
  }, [savedDocs]);

  const filteredDocs = useMemo(() => {
    return savedDocs.filter(doc => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (doc.title && doc.title.toLowerCase().includes(q)) ||
        (doc.content && doc.content.toLowerCase().includes(q)) ||
        (doc.author && doc.author.toLowerCase().includes(q)) ||
        (doc.organization && doc.organization.toLowerCase().includes(q)) ||
        (doc.keywords && doc.keywords.toLowerCase().includes(q))
      );

      const matchesCat = selectedCategory === 'All' || 
        doc.category === selectedCategory || 
        doc.document_type === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [savedDocs, searchQuery, selectedCategory]);

  const handleAskAI = (doc: SavedDocument) => {
    navigate('/ai', {
      state: {
        initialPrompt: `Analyze the following saved research document: "${doc.title}". Provide an executive synthesis, key empirical metrics, and actionable policy takeaways.`
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Saved Research</h1>
            <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-gov-blue text-xs font-bold rounded-full">
              {totalSaved} {totalSaved === 1 ? 'Paper' : 'Papers'} Saved
            </span>
          </div>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            Your personal library of bookmarked research papers, statutory acts, and ground-truth policy evidence.
          </p>
        </div>

        <Link
          to="/research/repository"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-gov-blue hover:text-gov-blue text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-xs self-start md:self-center"
        >
          <BookOpen className="w-4 h-4 text-gov-blue" />
          <span>Explore Repository</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
      
      {/* Content Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {totalSaved > 0 && (
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search inside your saved research papers..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-blue/20 outline-none transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Bookmark className="w-3.5 h-3.5 text-gov-blue fill-gov-blue" />
                <span>Showing {filteredDocs.length} of {totalSaved}</span>
              </div>
            </div>

            {categories.length > 2 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" /> Category:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-gov-blue text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List of Saved Papers or Empty State */}
        {totalSaved === 0 ? (
          <div className="p-16 md:p-20 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-blue-50 text-gov-blue rounded-3xl flex items-center justify-center mb-5 border border-blue-100 shadow-inner">
              <Bookmark className="w-10 h-10 text-gov-blue/60" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Saved Research Yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              You haven't bookmarked any research documents. Browse our repository of statutory acts, policy circulars, and scientific papers to save key evidence for your research.
            </p>
            <Link
              to="/research/repository"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gov-blue hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-500/20"
            >
              <FileText className="w-4 h-4" />
              <span>Browse Research Repository</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No saved papers match "{searchQuery}"</p>
            <p className="text-slate-400 text-xs mt-1">Try another search term or reset your category filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map(doc => (
              <div 
                key={doc.id}
                onClick={() => setActiveDoc(doc)}
                className="p-5 hover:bg-slate-50/80 transition-colors group cursor-pointer flex flex-col md:flex-row gap-4 items-start"
              >
                <div className="mt-0.5 shrink-0 hidden md:block">
                  <div className="w-11 h-11 bg-blue-50 text-gov-blue rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                    <Bookmark className="w-5 h-5 fill-gov-blue" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-gov-blue rounded text-xs font-semibold">
                      {doc.category || doc.document_type}
                    </span>
                    {doc.verification_status === 'VERIFIED' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Ground-Truth
                      </span>
                    )}
                    <span className="text-xs text-slate-400">DOC-{doc.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-gov-blue transition-colors mb-1.5 leading-snug">
                    {doc.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 flex-wrap">
                    <span className="font-medium text-slate-700">{doc.author || 'Author Unspecified'}</span>
                    {doc.organization && (
                      <>
                        <span>•</span>
                        <span>{doc.organization}</span>
                      </>
                    )}
                    {doc.publication_date && (
                      <>
                        <span>•</span>
                        <span>{doc.publication_date}</span>
                      </>
                    )}
                    {doc.state && (
                      <>
                        <span>•</span>
                        <span>{doc.state}</span>
                      </>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {doc.content || doc.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAskAI(doc);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                      title="Analyze with AI Evidence Assistant"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ask AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDoc(doc);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-gov-blue hover:text-gov-blue text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      title="Read Full Paper"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSaved(doc.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
                      title="Remove from saved research"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      <DocumentModal
        document={activeDoc}
        onClose={() => setActiveDoc(null)}
      />
    </div>
  );
}
