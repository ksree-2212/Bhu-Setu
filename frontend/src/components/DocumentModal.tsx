import { useState } from 'react';
import { 
  X, 
  Bookmark, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Copy, 
  Check, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  MapPin, 
  Tag 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSavedResearch, type SavedDocument } from '../context/SavedResearchContext';

interface DocumentModalProps {
  document: SavedDocument | null;
  onClose: () => void;
}

export function DocumentModal({ document, onClose }: DocumentModalProps) {
  const navigate = useNavigate();
  const { isSaved, toggleSave } = useSavedResearch();
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const saved = isSaved(document.id);

  const handleCopyCitation = () => {
    const citation = `"${document.title}", ${document.author || 'Author Unspecified'} (${document.organization || 'Gov of India'}), ${document.publication_date || '2026'}. National Digital Platform for Land Governance (DOC-${document.id}).`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAI = () => {
    onClose();
    navigate('/ai', { state: { initialPrompt: `Analyze the following land governance document: "${document.title}". Summarize its key legal provisions and policy impact.` } });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-gov-blue border border-blue-200">
                {document.category || document.document_type || 'Document'}
              </span>
              {document.verification_status === 'VERIFIED' ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ground-Truth Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono font-medium">DOC-{document.id}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{document.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{document.organization || document.author || 'Gov of India'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{document.publication_date || '2026'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{document.state || 'National'} {document.district && document.district !== 'All' ? `(${document.district})` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">SHA-256 Provenance Hashed</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 leading-relaxed space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Full Statutory & Research Content</h4>
            <div className="text-sm whitespace-pre-line text-slate-800 font-normal leading-relaxed">
              {document.content || document.description || 'No detailed content text available.'}
            </div>
          </div>

          {document.keywords && (
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Keywords:</span>
              {document.keywords.split(',').map((kw, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                  {kw.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSave(document)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border shadow-sm ${
                saved
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
              <span>{saved ? 'Saved in Research' : 'Save to Research'}</span>
            </button>

            <button
              onClick={handleCopyCitation}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Citation Copied!' : 'Copy Citation'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAskAI}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-indigo-600/20"
            >
              <Sparkles className="w-4 h-4" />
              Ask AI Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
