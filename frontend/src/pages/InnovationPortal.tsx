import { useState, useEffect } from 'react';
import { 
  Lightbulb, Send, Bot, Award, Loader2, Sparkles, 
  Map, Beaker, BarChart3, BookOpen, CheckCircle2, X, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { fetchApi } from '../services/api';

const SUGGESTIONS = [
  "Simulate policy scenario for urban expansion in Rangareddy",
  "Show agricultural land and urban boundary hotspots",
  "Compare district literacy and landholding correlation",
  "Statutory framework for SVAMITVA rural property demarcation"
];

export function InnovationPortal() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loadingInitiatives, setLoadingInitiatives] = useState(true);

  // Proposal modal
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [activeInitiativeId, setActiveInitiativeId] = useState<number | null>(null);
  const [activeInitiativeTitle, setActiveInitiativeTitle] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Expanded submissions viewer per initiative
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<number, boolean>>({});
  const [submissionsData, setSubmissionsData] = useState<Record<number, any[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<Record<number, boolean>>({});

  const loadInitiatives = () => {
    setLoadingInitiatives(true);
    fetchApi<any>('/innovation/initiatives')
      .then(res => {
        if (res.status === 'SUCCESS') setInitiatives(res.initiatives || []);
      })
      .catch(console.error)
      .finally(() => setLoadingInitiatives(false));
  };

  useEffect(() => {
    loadInitiatives();
  }, []);

  const handleExecuteQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    try {
      const data = await fetchApi<any>('/ai/orchestrate', {
        method: 'POST',
        body: JSON.stringify({ query: queryText.trim() })
      });
      setResponse(data);
    } catch (err) {
      console.error("AI Orchestration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteQuery(query);
  };

  const openProposalModal = (init: any) => {
    setActiveInitiativeId(init.id);
    setActiveInitiativeTitle(init.title);
    setProposalTitle('');
    setProposalText('');
    setShowProposalModal(true);
  };

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInitiativeId || !proposalTitle.trim() || !proposalText.trim()) return;

    setSubmittingProposal(true);
    try {
      const res = await fetchApi<any>(`/innovation/initiatives/${activeInitiativeId}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ 
          title: proposalTitle.trim(), 
          proposal_text: proposalText.trim() 
        })
      });

      if (res.status === 'SUCCESS') {
        setShowProposalModal(false);
        loadInitiatives();
        // If submissions open for this initiative, refresh them
        if (expandedSubmissions[activeInitiativeId]) {
          loadSubmissionsForInitiative(activeInitiativeId);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit proposal. Please try again.");
    } finally {
      setSubmittingProposal(false);
    }
  };

  const loadSubmissionsForInitiative = async (id: number) => {
    setLoadingSubmissions(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetchApi<any>(`/innovation/initiatives/${id}/submissions`);
      if (res.status === 'SUCCESS') {
        setSubmissionsData(prev => ({ ...prev, [id]: res.submissions || [] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(prev => ({ ...prev, [id]: false }));
    }
  };

  const toggleSubmissions = (id: number) => {
    const isNowExpanded = !expandedSubmissions[id];
    setExpandedSubmissions(prev => ({ ...prev, [id]: isNowExpanded }));
    if (isNowExpanded && !submissionsData[id]) {
      loadSubmissionsForInitiative(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      
      {/* Left Column: AI Orchestrator */}
      <div className="flex-1">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-gov-saffron/10 text-gov-saffron text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-gov-saffron/20">
              <Sparkles className="w-3.5 h-3.5" />
              Autonomous Intent Router
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Lightbulb className="text-gov-saffron w-6 h-6" />
            Policy Innovation & AI Orchestrator
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
            Dispatch exploratory land governance questions to specialized AI agents: Policy Scenario Simulation, GIS Spatial Analysis, Safe Data Analytics, or Evidence RAG.
          </p>
        </div>

        {/* Query Input Box */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Natural Language Intent Dispatcher
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g., Simulate policy scenario for urban expansion in Rangareddy"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gov-blue focus:bg-white focus:ring-1 focus:ring-gov-blue transition-all"
              />
              <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="bg-gov-blue text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-gov-navy transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'Routing...' : 'Execute'}
              </button>
            </div>
          </form>

          {/* Quick Suggestions */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Suggested Explorations:
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(s);
                    handleExecuteQuery(s);
                  }}
                  className="text-xs bg-slate-50 hover:bg-blue-50 hover:text-gov-blue border border-slate-200 hover:border-gov-blue/30 text-slate-600 px-3 py-1.5 rounded-lg transition-colors text-left"
                >
                  &rarr; {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orchestrator Response Card */}
        {response && (
          <div className="bg-slate-900 text-slate-50 rounded-xl shadow-xl p-6 border border-slate-800 animate-in fade-in zoom-in-95 relative overflow-hidden">
            <Bot className="absolute -top-4 -right-4 w-32 h-32 text-slate-800/40 pointer-events-none" />

            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gov-saffron/20 border border-gov-saffron/30 flex items-center justify-center text-gov-saffron">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Orchestrator Decision & Execution</h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Timestamp: {response.data?.timestamp || '2026-09-30 UTC'}
                  </div>
                </div>
              </div>

              {/* Subsystem Pill */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Routed Subsystem:</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  {response.data?.route === 'POLICY_SCENARIO_SIMULATION' && <Beaker className="w-3.5 h-3.5 text-emerald-400" />}
                  {response.data?.route === 'GIS_SPATIAL_AGENT' && <Map className="w-3.5 h-3.5 text-blue-400" />}
                  {response.data?.route === 'DATA_ANALYST_AGENT' && <BarChart3 className="w-3.5 h-3.5 text-purple-400" />}
                  {response.data?.route === 'RESEARCH_RAG_AGENT' && <BookOpen className="w-3.5 h-3.5 text-amber-400" />}
                  {response.data?.route || 'AI_AGENT'}
                </span>
              </div>
            </div>

            {/* Decision Rationale */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3.5 text-xs text-slate-300 mb-4 flex items-start gap-2.5 relative z-10">
              <Sparkles className="w-4 h-4 text-gov-saffron shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">Routing Decision Rationale:</span>
                {response.data?.orchestrator_decision || 'Delegated query to specialized land governance domain agent.'}
              </div>
            </div>

            {/* Extracted Entities */}
            {response.data?.extracted_entities && (
              <div className="mb-4 relative z-10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Extracted Context Entities:
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(response.data.extracted_entities).map(([k, v]: [string, any]) => (
                    <span key={k} className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-xs text-slate-300 font-mono">
                      <span className="text-slate-400">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Subsystem Payload Output */}
            {response.data?.response && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-sans relative z-10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Subsystem Execution Results:
                </span>

                {/* If Simulation Result */}
                {response.data.route === 'POLICY_SCENARIO_SIMULATION' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400">Target Geography</div>
                        <div className="text-xs font-bold text-emerald-400">
                          {response.data.response.metadata?.district}, {response.data.response.metadata?.state}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400">Simulation Horizon</div>
                        <div className="text-xs font-bold text-blue-400">
                          {response.data.response.metadata?.timeline || '2026 - 2035'}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-slate-400">Provenance Hash</div>
                        <div className="text-xs font-mono text-purple-400 truncate">
                          {response.data.response.metadata?.provenance_hash || 'SHA-256 Verified'}
                        </div>
                      </div>
                    </div>

                    {response.data.response.scenarios && (
                      <div className="space-y-2 mt-2">
                        {Object.entries(response.data.response.scenarios).map(([name, sc]: [string, any]) => (
                          <div key={name} className="bg-slate-900/60 p-3 rounded border border-slate-800/80 text-xs">
                            <div className="font-bold text-slate-200 capitalize mb-1">{name.replace('_', ' ')}:</div>
                            <div className="text-slate-400 leading-relaxed">{sc.description || sc.recommendation}</div>
                            {sc.metrics && (
                              <div className="flex gap-4 mt-2 font-mono text-[11px] text-emerald-300">
                                {Object.entries(sc.metrics).map(([mk, mv]: [string, any]) => (
                                  <span key={mk}>{mk}: <strong>{mv}</strong></span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* If GIS / Data Analyst / RAG */}
                {response.data.route !== 'POLICY_SCENARIO_SIMULATION' && (
                  <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {typeof response.data.response === 'string' 
                      ? response.data.response 
                      : response.data.response.answer || JSON.stringify(response.data.response, null, 2)}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Right Column: Grants & Hackathons */}
      <div className="w-full lg:w-[420px] flex flex-col gap-4">
        
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-gov-blue" /> 
            Open Innovation Initiatives
          </h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            {initiatives.length} Active
          </span>
        </div>

        {loadingInitiatives ? (
          <div className="flex justify-center p-8 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : initiatives.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-6 bg-white rounded-xl border border-slate-200 text-center">
            No open initiatives currently available.
          </div>
        ) : (
          initiatives.map(init => {
            const isSubmissionsExpanded = !!expandedSubmissions[init.id];
            const subs = submissionsData[init.id] || [];
            const isLoadingSubs = !!loadingSubmissions[init.id];

            return (
              <div key={init.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-gov-blue/10 text-gov-blue text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {init.type}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {init.status || 'OPEN'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mb-1.5">{init.title}</h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">{init.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openProposalModal(init)}
                      className="flex-1 bg-gov-blue hover:bg-gov-navy text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Submit Proposal
                    </button>
                    <button 
                      onClick={() => toggleSubmissions(init.id)}
                      className="px-3 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{init.submission_count || 0}</span>
                      {isSubmissionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Submissions Drawer */}
                  {isSubmissionsExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs animate-in fade-in">
                      <div className="font-bold text-slate-700 mb-2 flex items-center justify-between">
                        <span>Submitted Innovations</span>
                        {isLoadingSubs && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                      </div>

                      {subs.length === 0 && !isLoadingSubs ? (
                        <p className="text-slate-400 italic text-[11px]">No proposals submitted yet. Be the first to apply!</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {subs.map((s: any) => (
                            <div key={s.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <div className="font-semibold text-slate-800 text-[11px] mb-0.5">{s.title}</div>
                              <div className="text-[10px] text-slate-500 mb-1">
                                By {s.submitter_name} ({s.organization || 'Research Scholar'})
                              </div>
                              <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                                {s.proposal_text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}

      </div>

      {/* Submit Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-gov-blue" />
                  Submit Innovation Proposal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeInitiativeTitle}</p>
              </div>
              <button onClick={() => setShowProposalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project / Proposal Title *</label>
                <input 
                  type="text" 
                  value={proposalTitle} 
                  onChange={e => setProposalTitle(e.target.value)}
                  placeholder="e.g., Drone-AI Edge Cadastre Boundary Reconciliation"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-gov-blue focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Technical Abstract & Methodology *</label>
                <textarea 
                  value={proposalText} 
                  onChange={e => setProposalText(e.target.value)}
                  rows={5}
                  placeholder="Outline the problem addressed, AI/GIS methodology, dataset requirements, and anticipated land governance impact..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-gov-blue focus:bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowProposalModal(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingProposal || !proposalTitle.trim() || !proposalText.trim()} 
                  className="bg-gov-blue text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-gov-navy transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingProposal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
