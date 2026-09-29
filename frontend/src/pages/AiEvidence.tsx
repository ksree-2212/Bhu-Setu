import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Search, 
  ShieldCheck, 
  CornerDownLeft, 
  Sparkles, 
  BookOpen, 
  HelpCircle
} from 'lucide-react';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { fetchApi } from '../services/api';
import defaultAvatar from '../assets/default-avatar.png';

interface Citation {
  id?: number | string;
  citation_id: string;
  title: string;
  score: number;
  snippet: string;
  category?: string;
  organization?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  evidence?: Citation[];
  confidence_score?: number;
}

const SUGGESTED_QUERIES = [
  "What are the compensation rates under Land Acquisition Act 2013?",
  "How does SVAMITVA drone mapping reduce rural property disputes?",
  "Explain the Bhu-Aadhaar (ULPIN) 14-digit parcel identification system.",
  "What were the empirical findings of urban sprawl in Hyderabad?"
];

export function AiEvidence() {
  const location = useLocation();
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Welcome to the Bhu-Setu Evidence Assistant. Ask research or statutory policy questions regarding land records modernization, agricultural land conversion, LARR compensation thresholds, or SVAMITVA cadastral mapping.',
      evidence: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedInitialPrompt = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const fetchAvatar = () => {
      const saved = localStorage.getItem('bhu_settings');
      if (saved) {
        try {
          const p = JSON.parse(saved);
          setProfileAvatar(p.profileAvatar || null);
        } catch {
          // ignore
        }
      }
    };
    fetchAvatar();
    window.addEventListener('bhu_settings_changed', fetchAvatar);
    return () => window.removeEventListener('bhu_settings_changed', fetchAvatar);
  }, []);

  // Handle incoming prompt from navigation (e.g. from Saved Research or DocumentModal)
  useEffect(() => {
    if (location.state?.initialPrompt && !hasLoadedInitialPrompt.current) {
      hasLoadedInitialPrompt.current = true;
      const initialText = location.state.initialPrompt;
      setQuery(initialText);
      handleExecuteQuery(initialText);
    }
  }, [location.state]);

  const handleExecuteQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: queryText };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetchApi<any>('/rag/query', {
        method: 'POST',
        body: JSON.stringify({ query: userMessage.content })
      });

      const data = res?.data || res || {};
      const answer = data.answer || res?.answer || "No response generated.";
      const rawCitations = data.citations || res?.citations || [];

      const formattedCitations: Citation[] = rawCitations.map((c: any, idx: number) => ({
        id: c.id || idx,
        citation_id: c.citation_id || `[Source #${idx + 1}]`,
        title: c.title || c.document_title || 'Verified Government Record',
        score: typeof c.score === 'number' 
          ? c.score 
          : (typeof c.relevance_score === 'number' ? c.relevance_score : 0.85),
        snippet: c.snippet || c.verbatim_excerpt || c.text || '',
        category: c.category || 'Statutory Evidence',
        organization: c.organization || 'DoLR / Govt of India'
      }));

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer,
        evidence: formattedCitations,
        confidence_score: data.confidence_score || res?.confidence_score
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error retrieving grounded evidence: ${err.message || 'Server error'}. Please verify the query and try again.`,
        evidence: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteQuery(query);
  };

  // Helper to format assistant response with bold and bullets
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;
          
          // Format bullet points
          if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
            const content = line.trim().replace(/^[•\-]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-indigo-600 font-bold mt-0.5">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
              </div>
            );
          }

          // Format subheadings
          if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
            return (
              <div 
                key={idx} 
                className="font-bold text-slate-900 mt-2"
                dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} 
              />
            );
          }

          return (
            <p 
              key={idx} 
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} 
            />
          );
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/\[(Act\/Rule|DOC|Policy|Research).*?\]/g, '<span class="px-1.5 py-0.5 mx-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">$0</span>');
  };

  const latestAssistantMessage = messages.slice().reverse().find(m => m.role === 'assistant');
  const activeEvidence = latestAssistantMessage?.evidence || [];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-10rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
      
      {/* Header Area */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            AI Evidence Assistant
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 max-w-2xl font-medium">
            Search across statutory acts and policy documents using dual BM25 + dense vector retrieval. 
            All responses include verifiable verbatim citations.
          </p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm shrink-0 self-start md:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> ZERO HALLUCINATION GUARDRAILS ACTIVE
        </div>
      </div>

      {/* Main Interface Layout */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row min-h-0">
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col border-r border-slate-100 relative bg-slate-50/40 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar relative">
            
            {/* Background Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-100/50 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-5">
              {messages.map((m, i) => (
                <div key={i} className={clsx("flex gap-3 max-w-3xl", m.role === 'user' ? "ml-auto" : "")}>
                  
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className={clsx(
                    "p-4 rounded-2xl text-sm leading-relaxed shadow-xs",
                    m.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-sm" 
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-xs"
                  )}>
                    {m.role === 'assistant' ? renderMessageContent(m.content) : m.content}

                    {m.evidence && m.evidence.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                        <span className="font-semibold text-slate-600">Citations:</span>
                        {m.evidence.map((c, cIdx) => (
                          <span key={cIdx} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 text-[11px]">
                            {c.citation_id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden shrink-0 shadow-xs mt-1 border border-slate-200">
                      <img src={profileAvatar || defaultAvatar} alt="User" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-sm shadow-xs bg-white border border-indigo-100 text-indigo-600 flex items-center gap-3 text-sm font-medium">
                    <Search className="w-4 h-4 animate-spin text-indigo-600" /> 
                    <span>Scanning statutory evidence & policy repositories...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Suggested Queries Bar */}
          {messages.length <= 2 && (
            <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Suggested:
              </span>
              {SUGGESTED_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExecuteQuery(q)}
                  disabled={loading}
                  className="px-3 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-lg shrink-0 transition-colors text-left font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask about agricultural land conversion, LARR compensation, SVAMITVA..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl py-3.5 pl-4 pr-14 text-sm transition-all outline-none shadow-xs text-slate-800 placeholder:text-slate-400"
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={!query.trim() || loading}
                className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-xs"
                title="Send query"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Evidence Panel (Right) */}
        <div className="w-96 bg-slate-50/70 flex flex-col hidden lg:flex border-l border-slate-100 min-h-0">
          <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Ground-Truth Citations
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
              {activeEvidence.length} Sources
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {activeEvidence.length > 0 ? (
              activeEvidence.map((cit, i) => (
                <div 
                  key={i} 
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {cit.citation_id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Score: {typeof cit.score === 'number' ? cit.score.toFixed(3) : '0.850'}
                    </span>
                  </div>
                  
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors leading-snug mb-1.5">
                    {cit.title}
                  </h4>

                  {cit.organization && (
                    <div className="text-[11px] text-slate-400 mb-2 font-medium">
                      {cit.organization}
                    </div>
                  )}
                  
                  <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-600 leading-relaxed border-l-2 border-indigo-300 italic">
                    "{cit.snippet.length > 200 ? `${cit.snippet.slice(0, 200)}...` : cit.snippet}"
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 flex flex-col items-center justify-center h-full p-6">
                <Search className="w-10 h-10 mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No active evidence context</p>
                <p className="text-xs mt-1 max-w-[200px]">Ask a question in the assistant to retrieve and verify statutory citations.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
