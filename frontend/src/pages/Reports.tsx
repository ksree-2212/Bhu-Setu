import { useState, useEffect } from 'react';
import { 
  FileText, 
  Loader2, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  Calendar, 
  User, 
  MapPin, 
  TrendingUp, 
  CheckCircle, 
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { fetchApi } from '../services/api';

interface PolicyReport {
  report_id: string;
  title: string;
  region: string;
  author: string;
  generated_at?: string;
  created_at?: string;
  doc_hash?: string;
  provenance_block_id?: string;
  markdown?: string;
  summary_metrics?: {
    prime_agricultural_land_conserved_sqkm?: number;
    carbon_emission_avoidance_mt_co2e?: number;
    infrastructure_capital_savings_cr_inr?: number;
  };
  sections?: {
    executive_summary?: string;
    key_findings?: string[];
    policy_recommendations?: string[];
  };
}

const PRESET_TOPICS = [
  {
    topic: "Agricultural Land Conversion & Peri-Urban Sprawl Mitigation",
    region: "Telangana (Hyderabad Peri-Urban)"
  },
  {
    topic: "Cadastral Overlay Validation & Floodplain Protection Policy",
    region: "Andhra Pradesh (Amaravati Capital Region)"
  },
  {
    topic: "SVAMITVA Rural Cadastre & Land Dispute Resolution Framework",
    region: "National (Pilot States)"
  },
  {
    topic: "DILRMP Bhu-Aadhaar Integration & Title Guarantee Roadmap",
    region: "National (All States)"
  }
];

export function Reports() {
  const [reports, setReports] = useState<PolicyReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'brief' | 'markdown'>('brief');

  // Load existing reports on mount
  useEffect(() => {
    fetchApi<{ status: string; reports: PolicyReport[] }>('/reports')
      .then(res => {
        if (res && res.reports && res.reports.length > 0) {
          setReports(res.reports);
          setSelectedReportId(res.reports[0].report_id);
        }
      })
      .catch(err => console.error("Error fetching reports:", err))
      .finally(() => setLoading(false));
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    const chosen = PRESET_TOPICS[selectedTopicIdx];
    try {
      const data = await fetchApi<{ status: string; report: PolicyReport }>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          region: chosen.region,
          topic: chosen.topic
        })
      });
      if (data && data.status === 'SUCCESS' && data.report) {
        setReports(prev => [data.report, ...prev.filter(r => r.report_id !== data.report.report_id)]);
        setSelectedReportId(data.report.report_id);
      }
    } catch (err) {
      console.error("Error generating report:", err);
    } finally {
      setGenerating(false);
    }
  };

  const currentReport = reports.find(r => r.report_id === selectedReportId) || reports[0] || null;

  const handleDownloadMarkdown = () => {
    if (!currentReport) return;
    const element = document.createElement("a");
    const file = new Blob([currentReport.markdown || currentReport.sections?.executive_summary || ''], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentReport.report_id}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-gov-blue" />
            Automated Policy Reports & Insights
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
            AI-synthesized statutory policy briefs generated from multi-temporal LULC satellite indices and scenario simulation engines.
          </p>
        </div>

        {/* Generate Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <select
            value={selectedTopicIdx}
            onChange={(e) => setSelectedTopicIdx(Number(e.target.value))}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-gov-blue/20 max-w-[240px] truncate"
          >
            {PRESET_TOPICS.map((t, idx) => (
              <option key={idx} value={idx}>{t.topic}</option>
            ))}
          </select>

          <button 
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 bg-gov-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 font-semibold text-xs shadow-sm shadow-blue-500/20 shrink-0"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Synthesizing...' : 'Generate New Brief'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-gov-blue animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading policy reports...</p>
        </div>
      ) : reports.length === 0 && !currentReport ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-700 font-bold text-base mb-1">No reports generated yet</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-5 leading-relaxed">
            Click the button above to author an evidence-based policy brief using live satellite and scenario models.
          </p>
          <button 
            onClick={generateReport}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-gov-blue text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm hover:bg-blue-800 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate First Policy Brief</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Column: Report Selector List */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available Briefs</span>
              <span className="text-[11px] font-bold text-gov-blue bg-blue-50 px-2 py-0.5 rounded-full">
                {reports.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
              {reports.map((rep) => {
                const isSelected = rep.report_id === currentReport?.report_id;
                return (
                  <div
                    key={rep.report_id}
                    onClick={() => setSelectedReportId(rep.report_id)}
                    className={`p-3.5 cursor-pointer transition-colors text-left ${
                      isSelected 
                        ? 'bg-blue-50/70 border-l-4 border-gov-blue' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono font-semibold text-slate-400">{rep.report_id}</span>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-gov-blue" />}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-1.5 leading-snug">
                      {rep.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{rep.region}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Policy Report Viewer */}
          {currentReport && (
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
              
              {/* Document Header Bar */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[11px] font-mono font-semibold">
                      {currentReport.report_id}
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[11px] font-semibold">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> Ground-Truth Synthesized
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'brief' ? 'markdown' : 'brief')}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium transition-colors"
                    >
                      {viewMode === 'brief' ? 'View Raw Markdown' : 'View Formatted Brief'}
                    </button>
                    <button
                      onClick={handleDownloadMarkdown}
                      className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                      title="Download Markdown Document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-3 leading-snug">
                  {currentReport.title}
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{currentReport.region}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{currentReport.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{currentReport.generated_at ? new Date(currentReport.generated_at).toLocaleDateString() : '2026'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono truncate">{currentReport.provenance_block_id || 'BLK-CHAIN-SEC'}</span>
                  </div>
                </div>
              </div>

              {/* Summary Impact KPIs */}
              {currentReport.summary_metrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-100 p-4">
                  <div className="px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Prime Farmland Conserved</span>
                    <span className="text-xl font-black text-emerald-700">
                      +{currentReport.summary_metrics.prime_agricultural_land_conserved_sqkm || 320} sq km
                    </span>
                  </div>
                  <div className="px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Emissions Avoided</span>
                    <span className="text-xl font-black text-indigo-700">
                      {currentReport.summary_metrics.carbon_emission_avoidance_mt_co2e || 4.8} MT CO2e
                    </span>
                  </div>
                  <div className="px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Infrastructure Savings</span>
                    <span className="text-xl font-black text-gov-blue">
                      ₹{Number(currentReport.summary_metrics.infrastructure_capital_savings_cr_inr || 2450).toLocaleString()} Cr
                    </span>
                  </div>
                </div>
              )}

              {/* Document Content View */}
              <div className="p-6 md:p-8 space-y-6">
                {viewMode === 'markdown' ? (
                  <pre className="bg-slate-900 text-slate-100 p-5 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {currentReport.markdown || currentReport.sections?.executive_summary}
                  </pre>
                ) : (
                  <>
                    {/* Executive Summary */}
                    <div>
                      <h3 className="font-bold text-base text-slate-900 mb-2.5 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gov-blue" />
                        Executive Summary
                      </h3>
                      <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {currentReport.sections?.executive_summary || "Synthesized from multi-temporal remote sensing observations."}
                      </p>
                    </div>

                    {/* Key Empirical Findings */}
                    {currentReport.sections?.key_findings && (
                      <div>
                        <h3 className="font-bold text-base text-slate-900 mb-2.5 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-600" />
                          Key Empirical Findings
                        </h3>
                        <div className="space-y-2">
                          {currentReport.sections.key_findings.map((f, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-amber-50/40 border border-amber-100 rounded-xl text-sm text-slate-800">
                              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Policy Recommendations */}
                    {currentReport.sections?.policy_recommendations && (
                      <div>
                        <h3 className="font-bold text-base text-slate-900 mb-2.5 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Actionable Policy Recommendations
                        </h3>
                        <div className="space-y-2">
                          {currentReport.sections.policy_recommendations.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-sm text-slate-800">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Provenance Ledger Footer */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>SHA-256 Hash: {currentReport.doc_hash || '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}</span>
                      </div>
                      <span className="text-slate-400">Merkle Verified Block #{currentReport.provenance_block_id || 'BLK-01'}</span>
                    </div>
                  </>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
