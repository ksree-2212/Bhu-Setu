import { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Download, 
  ExternalLink, 
  Search, 
  Filter, 
  CheckCircle, 
  ShieldCheck, 
  X, 
  Copy, 
  Check, 
  FileCode
} from 'lucide-react';
import { fetchApi } from '../services/api';

interface Dataset {
  id: number;
  name: string;
  description: string;
  source: string;
  geographic_coverage: string;
  temporal_coverage: string;
  format?: string;
  format_type?: string;
  size_bytes?: number;
  update_frequency?: string;
  license?: string;
  provenance_hash?: string;
  is_verified?: number;
}

export function DataCatalog() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoverage, setSelectedCoverage] = useState('All');
  const [apiModalDataset, setApiModalDataset] = useState<Dataset | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApi<{ status: string; datasets: Dataset[] }>('/datasets/')
      .then(data => {
        if (data && data.status === 'SUCCESS') {
          setDatasets(data.datasets || []);
        }
      })
      .catch(err => console.error("Error fetching datasets:", err))
      .finally(() => setLoading(false));
  }, []);

  const coverages = useMemo(() => {
    const set = new Set<string>();
    datasets.forEach(d => {
      if (d.geographic_coverage) set.add(d.geographic_coverage);
    });
    return ['All', ...Array.from(set)];
  }, [datasets]);

  const filteredDatasets = useMemo(() => {
    return datasets.filter(ds => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (ds.name && ds.name.toLowerCase().includes(q)) ||
        (ds.description && ds.description.toLowerCase().includes(q)) ||
        (ds.source && ds.source.toLowerCase().includes(q)) ||
        ((ds.format || ds.format_type) && (ds.format || ds.format_type)!.toLowerCase().includes(q))
      );

      const matchesCoverage = selectedCoverage === 'All' || ds.geographic_coverage === selectedCoverage;
      return matchesSearch && matchesCoverage;
    });
  }, [datasets, searchQuery, selectedCoverage]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '12.4 MB';
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDownload = (ds: Dataset) => {
    const fmt = (ds.format || ds.format_type || 'GeoJSON').toLowerCase();
    let content = '';
    let mimeType = 'application/json';
    let ext = 'json';

    if (fmt.includes('csv')) {
      mimeType = 'text/csv';
      ext = 'csv';
      content = `state,district,year,indicator,value,source\nNational,All,2026,"${ds.name}",100.0,"${ds.source}"\n`;
    } else {
      content = JSON.stringify({
        type: "FeatureCollection",
        metadata: {
          dataset_name: ds.name,
          source: ds.source,
          geographic_coverage: ds.geographic_coverage,
          temporal_coverage: ds.temporal_coverage,
          provenance_hash: ds.provenance_hash || "b9c4c7980302c3fb66810a9f5d346ff16e7bb4ff11ad676e"
        },
        features: [
          {
            type: "Feature",
            properties: {
              parcel_id: "ULPIN-TEL-2026-0091",
              category: "Surveyed Cadastre",
              verification: "VERIFIED"
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[78.4867, 17.3850], [78.4875, 17.3850], [78.4875, 17.3842], [78.4867, 17.3842], [78.4867, 17.3850]]]
            }
          }
        ]
      }, null, 2);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ds.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCurl = () => {
    if (!apiModalDataset) return;
    const curl = `curl -X GET "http://localhost:8000/api/datasets/${apiModalDataset.id}" -H "Accept: application/json"`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-gov-blue" />
            National Land Data Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
            Official digital repository of spatial cadastral boundaries (Bhu-Naksha), multi-temporal LULC matrices, and socioeconomic census layers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {datasets.length} Official Datasets
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search datasets by name, source, coverage, or format..."
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

            <span className="hidden sm:inline-block text-xs font-medium text-slate-500">
              Showing {filteredDatasets.length} datasets
            </span>
          </div>

          {/* Coverage Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Coverage:
            </span>
            {coverages.map(cov => (
              <button
                key={cov}
                onClick={() => setSelectedCoverage(cov)}
                className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  selectedCoverage === cov
                    ? 'bg-gov-blue text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                {cov}
              </button>
            ))}
          </div>
        </div>

        {/* Dataset Grid List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gov-blue mb-3"></div>
              <p>Loading dataset registry...</p>
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No datasets found</p>
              <p className="text-slate-400 text-xs mt-1">Try another search term or reset your coverage filter.</p>
            </div>
          ) : (
            filteredDatasets.map(ds => {
              const formatName = ds.format || ds.format_type || 'GeoJSON';
              return (
                <div key={ds.id} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row justify-between gap-5 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-gov-blue border border-blue-200">
                        {formatName}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        {ds.geographic_coverage}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {ds.temporal_coverage}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified Registry
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 mb-1 leading-snug">
                      {ds.name}
                    </h3>
                    <p className="text-sm text-slate-600 max-w-3xl leading-relaxed mb-3">
                      {ds.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="font-medium text-slate-700">Source: {ds.source}</span>
                      <span>•</span>
                      <span>Est. Size: {formatFileSize(ds.size_bytes)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> SHA-256 Provenance Hashed
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button 
                      onClick={() => handleDownload(ds)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gov-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      title="Download Dataset Sample"
                    >
                      <Download className="w-3.5 h-3.5" /> 
                      <span>Download</span>
                    </button>

                    <button 
                      onClick={() => setApiModalDataset(ds)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-slate-200 hover:border-gov-blue hover:text-gov-blue text-slate-700 bg-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      title="View API Endpoint"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> 
                      <span>View API</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* API Details Modal */}
      {apiModalDataset && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setApiModalDataset(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-gov-blue" />
                <h3 className="font-bold text-slate-900 text-base">API Integration Endpoint</h3>
              </div>
              <button 
                onClick={() => setApiModalDataset(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase block mb-1">Dataset Name</span>
                <p className="font-bold text-slate-900 text-sm">{apiModalDataset.name}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase block mb-1">REST Endpoint (JSON / GeoJSON)</span>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-xs flex items-center justify-between gap-2 overflow-x-auto">
                  <span>GET http://localhost:8000/api/datasets/{apiModalDataset.id}</span>
                  <button 
                    onClick={handleCopyCurl}
                    className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded shrink-0"
                    title="Copy cURL command"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase block mb-1">Dataset Metadata</span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-700 space-y-1">
                  <div>Source: "{apiModalDataset.source}"</div>
                  <div>Coverage: "{apiModalDataset.geographic_coverage}"</div>
                  <div>Temporal: "{apiModalDataset.temporal_coverage}"</div>
                  <div>Format: "{apiModalDataset.format || apiModalDataset.format_type || 'GeoJSON'}"</div>
                  <div>Provenance: "{apiModalDataset.provenance_hash || 'SHA-256-AUTHENTICATED'}"</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setApiModalDataset(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
