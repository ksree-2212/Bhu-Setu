import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  CheckCircle, 
  Clock, 
  Bookmark, 
  Eye, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { useSavedResearch, type SavedDocument } from '../context/SavedResearchContext';
import { DocumentModal } from '../components/DocumentModal';

export function Research() {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeDoc, setActiveDoc] = useState<SavedDocument | null>(null);

  const { isSaved, toggleSave, totalSaved } = useSavedResearch();

  useEffect(() => {
    fetchApi<{ documents: SavedDocument[] }>('/documents')
      .then(res => setDocuments(res.documents || []))
      .catch(err => console.error("Error fetching docs", err))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => {
      if (d.category) set.add(d.category);
      if (d.document_type) set.add(d.document_type);
    });
    return ['All', ...Array.from(set)];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (doc.title && doc.title.toLowerCase().includes(q)) ||
        (doc.content && doc.content.toLowerCase().includes(q)) ||
        (doc.author && doc.author.toLowerCase().includes(q)) ||
        (doc.organization && doc.organization.toLowerCase().includes(q)) ||
        (doc.keywords && doc.keywords.toLowerCase().includes(q)) ||
        (doc.state && doc.state.toLowerCase().includes(q))
      );

      const matchesCat = selectedCategory === 'All' || 
        doc.category === selectedCategory || 
        doc.document_type === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Research Knowledge Repository</h1>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            Verified catalog of statutory acts, policy circulars, and peer-reviewed research papers used as ground-truth evidence for AI intelligence.
          </p>
        </div>

        <Link
          to="/research/saved"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 border border-blue-200 text-gov-blue hover:bg-blue-100/80 rounded-xl text-sm font-semibold transition-all shadow-sm group self-start md:self-center"
        >
          <Bookmark className="w-4 h-4 fill-gov-blue text-gov-blue group-hover:scale-110 transition-transform" />
          <span>Saved Research</span>
          <span className="bg-gov-blue text-white text-xs px-2 py-0.5 rounded-full font-bold">
            {totalSaved}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search research papers by title, author, keyword, state or topic..."
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
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>{filteredDocuments.length} papers</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter:
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
        </div>

        {/* Document List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gov-blue mb-3"></div>
              <p>Loading research repository...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No documents match your query</p>
              <p className="text-slate-400 text-xs mt-1">Try adjusting your search terms or filter selection.</p>
            </div>
          ) : (
            filteredDocuments.map(doc => {
              const saved = isSaved(doc.id);
              return (
                <div 
                  key={doc.id} 
                  onClick={() => setActiveDoc(doc)}
                  className="p-5 hover:bg-slate-50/80 transition-colors group cursor-pointer flex flex-col sm:flex-row gap-4 items-start"
                >
                  <div className="mt-0.5 shrink-0 hidden sm:block">
                    <div className="w-11 h-11 bg-gov-blue/10 text-gov-blue rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                        {doc.category || doc.document_type}
                      </span>
                      {doc.state && (
                        <span className="text-xs text-slate-400 font-medium">
                          {doc.state}
                        </span>
                      )}
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400">
                        {doc.publication_date || '2026'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-gov-blue transition-colors mb-1.5 leading-snug">
                      {doc.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="font-medium text-slate-600">{doc.author || 'Author Unspecified'}</span>
                      {doc.organization && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">{doc.organization}</span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {doc.content || doc.description}
                    </p>

                    {doc.keywords && (
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {doc.keywords.split(',').slice(0, 3).map((kw, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 bg-slate-100/70 text-slate-600 rounded">
                            #{kw.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Verification Badge & Save Button */}
                  <div className="sm:w-36 shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 w-full pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {doc.verification_status === 'VERIFIED' ? (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Ground-Truth
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending
                      </div>
                    )}

                    {/* SAVE BUTTON */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(doc);
                      }}
                      title={saved ? "Click to remove from saved research" : "Click to save research paper"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs ${
                        saved
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                      <span>{saved ? 'Saved' : 'Save'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDoc(doc);
                      }}
                      className="text-xs text-slate-400 hover:text-gov-blue flex items-center gap-1 mt-1 font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Read
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Document Detail Modal */}
      <DocumentModal 
        document={activeDoc} 
        onClose={() => setActiveDoc(null)} 
      />
    </div>
  );
}
