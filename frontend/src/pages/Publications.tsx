import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Bookmark, 
  Eye, 
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { useSavedResearch, type SavedDocument } from '../context/SavedResearchContext';
import { DocumentModal } from '../components/DocumentModal';

export function Publications() {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDoc, setActiveDoc] = useState<SavedDocument | null>(null);

  const { isSaved, toggleSave, totalSaved } = useSavedResearch();

  useEffect(() => {
    fetchApi<{ documents: SavedDocument[] }>('/documents')
      .then(res => setDocuments((res.documents || []).filter(d => 
        d.category === 'Research Paper' || 
        d.document_type === 'RESEARCH_PAPER' ||
        d.document_type === 'Research Paper' ||
        d.category?.toLowerCase().includes('research') ||
        d.title?.toLowerCase().includes('empirical') ||
        d.title?.toLowerCase().includes('analysis')
      )))
      .catch(err => console.error("Error fetching docs", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const q = searchQuery.toLowerCase().trim();
      return !q || (
        (doc.title && doc.title.toLowerCase().includes(q)) ||
        (doc.content && doc.content.toLowerCase().includes(q)) ||
        (doc.author && doc.author.toLowerCase().includes(q)) ||
        (doc.organization && doc.organization.toLowerCase().includes(q))
      );
    });
  }, [documents, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Publications</h1>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            Browse peer-reviewed research publications, scientific journals, and analytical reports.
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
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search publications by author, title, or journal..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-gov-blue/20 outline-none"
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
          <span className="text-xs text-slate-500 font-medium shrink-0">
            {filteredDocs.length} publications
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading publications...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No publications found.</div>
          ) : (
            filteredDocs.map(doc => {
              const saved = isSaved(doc.id);
              return (
                <div 
                  key={doc.id} 
                  onClick={() => setActiveDoc(doc)}
                  className="p-5 hover:bg-slate-50 transition-colors group cursor-pointer flex flex-col sm:flex-row gap-4 items-start"
                >
                  <div className="mt-1 shrink-0 hidden sm:block">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-gov-blue transition-colors mb-1">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2 flex-wrap">
                      <span className="font-semibold text-slate-700">{doc.category || doc.document_type}</span>
                      <span>•</span>
                      <span>{doc.author} ({doc.organization})</span>
                      <span>•</span>
                      <span>{doc.publication_date}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {doc.content || doc.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(doc);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs ${
                        saved
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
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

      <DocumentModal 
        document={activeDoc} 
        onClose={() => setActiveDoc(null)} 
      />
    </div>
  );
}
