import { useState, useEffect } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, Popup, Tooltip, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GIS_LAYERS, MOCK_HOTSPOTS, MOCK_INFRASTRUCTURE_LINES, MOCK_INFRASTRUCTURE_POINTS, hashString } from '../data/gis';
import indiaGeoJson from '../assets/india_states.json';
import clsx from 'clsx';
import { fetchApi } from '../services/api';

export function GisStudio() {
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    administrativeBoundaries: true
  });
  const [mapView, setMapView] = useState<'map' | 'satellite' | 'terrain'>('satellite');

  useEffect(() => {
    const applySettings = () => {
      const settingsStr = localStorage.getItem('bhu_settings');
      if (settingsStr) {
        const p = JSON.parse(settingsStr);
        if (p.mapView) setMapView(p.mapView.toLowerCase() as 'map' | 'satellite' | 'terrain');
      }
    };
    applySettings();
    window.addEventListener('bhu_settings_changed', applySettings);
    return () => window.removeEventListener('bhu_settings_changed', applySettings);
  }, []);

  const [backendLayers, setBackendLayers] = useState<any[]>([]);
  const [backendGeoCache, setBackendGeoCache] = useState<Record<string, any>>({});
  const [loadingGeo, setLoadingGeo] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchApi<any>('/gis/layers')
      .then(res => {
        if (res.status === 'SUCCESS') setBackendLayers(res.layers || []);
      })
      .catch(console.error);
  }, []);

  const allLayers = [
    ...GIS_LAYERS,
    ...backendLayers.map(l => {
      const metadata = l.metadata_json ? JSON.parse(l.metadata_json) : {};
      const matchingStatic = GIS_LAYERS.find(sl => sl.name === l.layer_type || sl.type === l.layer_type || sl.id === l.layer_type);
      return {
        id: `backend_${l.id}`,
        backendId: l.id,
        name: l.layer_name,
        description: metadata.description || `Type: ${l.layer_type}`,
        categories: matchingStatic ? matchingStatic.categories : [{ name: l.layer_type, color: '#3B82F6' }],
        isBackend: true
      };
    })
  ];

  const handleLayerToggle = async (layerId: string) => {
    const isCurrentlyActive = activeLayers[layerId];

    if (!isCurrentlyActive) {
      const layerData = allLayers.find(l => l.id === layerId) as any;
      if (layerData?.isBackend && !backendGeoCache[layerId]) {
        setLoadingGeo(prev => ({ ...prev, [layerId]: true }));
        try {
          const res = await fetchApi<any>(`/gis/layers/${layerData.backendId || layerId}/geojson`);
          if (res.status === 'SUCCESS' && res.geojson) {
            setBackendGeoCache(prev => ({ ...prev, [layerId]: res.geojson }));
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingGeo(prev => ({ ...prev, [layerId]: false }));
        }
      }
      setActiveLayers(prev => ({ ...prev, [layerId]: true }));
    } else {
      setActiveLayers(prev => ({
        ...prev,
        [layerId]: false
      }));
    }
  };

  const activeLayerObjs = allLayers.filter(l => activeLayers[l.id]);

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden bg-slate-50">
      <div className="flex-1 flex w-full relative">

        {/* Sidebar Controls */}
        <div className="w-80 flex flex-col bg-white border-r border-slate-200 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-black text-slate-900 tracking-tight mb-1">Geospatial Studio</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Analysis Layers</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Available Overlays
            </h3>

            {allLayers.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-4">No layers available</div>
            ) : (
              allLayers.map(layer => {
                const isActive = activeLayers[layer.id];
                const isLoading = loadingGeo[layer.id];
                return (
                  <div key={layer.id} className={clsx("p-3.5 rounded-xl border transition-all duration-200", isActive ? "border-bhu-primary/30 bg-bhu-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm")}>
                    <label className="flex items-start justify-between gap-3 cursor-pointer">
                      <div className="flex-1">
                        <div className="text-[13px] font-bold text-slate-900 mb-0.5 flex items-center gap-2">
                          {layer.name}
                          {(layer as any).isBackend && <span className="text-[9px] bg-bhu-primary/10 text-bhu-primary px-1.5 rounded uppercase tracking-wider font-bold">API</span>}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 leading-relaxed mb-3">{layer.description}</div>

                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {layer.categories.map((cat: any, i: number) => (
                            <span key={i} className={clsx("inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors", isActive ? "text-slate-700 bg-white border border-slate-200" : "text-slate-400 bg-slate-50 border border-slate-100")}>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></span>}
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-0.5 shrink-0 flex flex-col items-center gap-2">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 text-bhu-primary animate-spin" />
                        ) : (
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-bhu-primary rounded border-slate-300 focus:ring-bhu-primary transition-all cursor-pointer"
                            checked={!!isActive}
                            onChange={() => handleLayerToggle(layer.id)}
                          />
                        )}
                      </div>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-[#0B1015]">

          <MapContainer
            center={[22.5937, 78.9629]}
            zoom={5}
            zoomControl={false}
            className="w-full h-full z-0 [&_.leaflet-control-attribution]:hidden"
            style={{ background: '#0B1015' }}
          >
            <TileLayer
              key={mapView}
              url={
                mapView === 'satellite' ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" :
                  mapView === 'terrain' ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}" :
                    "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              }
            />
            <ZoomControl position="bottomright" />

            {/* Backend GIS Layers */}
            {backendLayers.map(layer => {
              const layerId = `backend_${layer.id}`;
              if (activeLayers[layerId] && backendGeoCache[layerId]) {
                const layerDef = allLayers.find(l => l.id === layerId);
                const categories = layerDef?.categories || [];

                return (
                  <GeoJSON
                    key={`backend-${layerId}`}
                    data={backendGeoCache[layerId]}
                    style={(feature: any) => {
                      // Attempt to color based on category if there's a match, else default
                      let color = 'rgba(255,255,255,0.4)';
                      let fillColor = '#3B82F6';

                      if (categories.length > 0) {
                        const hash = hashString(feature?.properties?.NAME_1 || feature?.properties?.name || 'Unknown');
                        fillColor = categories[hash % categories.length].color;
                      }

                      return {
                        color,
                        weight: 1.5,
                        fillColor,
                        fillOpacity: 0.6
                      };
                    }}
                    onEachFeature={(feature, l) => {
                      if (feature.properties) {
                        const props = Object.entries(feature.properties)
                          .map(([k, v]) => `<div class="flex justify-between gap-4"><span class="font-bold text-slate-500 uppercase text-[9px]">${k}</span><span class="font-black text-slate-900">${v}</span></div>`)
                          .join('<div class="h-px bg-slate-100 my-1"></div>');

                        l.bindTooltip(
                          `<div class="text-[10px] font-black text-bhu-primary uppercase tracking-widest mb-2 pb-1 border-b border-slate-100">${layer.layer_name}</div>${props}`,
                          { direction: 'center', className: 'bg-white/95 backdrop-blur shadow-2xl rounded-xl p-3 text-xs w-48' }
                        );
                      }
                    }}
                  />
                );
              }
              return null;
            })}

            {/* 1. Thematic States (Land Use OR Climate Risk) - Only for static if they exist */}
            {(activeLayers.landUse || activeLayers.climateRisk) && (
              <GeoJSON
                key={`thematic-${activeLayers.landUse}-${activeLayers.climateRisk}`}
                data={indiaGeoJson as any}
                style={(feature: any) => {
                  const stateName = feature?.properties.NAME_1 || feature?.properties.name || 'Unknown';
                  const hash = hashString(stateName);
                  let color = 'transparent';

                  if (activeLayers.landUse) {
                    const l = GIS_LAYERS.find(x => x.id === 'landUse')?.categories || [];
                    if (l.length) color = l[hash % l.length].color;
                  } else if (activeLayers.climateRisk) {
                    const l = GIS_LAYERS.find(x => x.id === 'climateRisk')?.categories || [];
                    if (l.length) color = l[hash % l.length].color;
                  }

                  return {
                    color: 'transparent',
                    weight: 0,
                    fillColor: color,
                    fillOpacity: 0.6
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const stateName = feature?.properties.NAME_1 || feature?.properties.name || 'Unknown';
                  const hash = hashString(stateName);

                  let tooltip = `<b>${stateName}</b>`;
                  if (activeLayers.landUse) {
                    const l = GIS_LAYERS.find(x => x.id === 'landUse')?.categories || [];
                    if (l.length) tooltip += `<br/>Dominant Land Use: ${l[hash % l.length].name}`;
                  }
                  if (activeLayers.climateRisk) {
                    const l = GIS_LAYERS.find(x => x.id === 'climateRisk')?.categories || [];
                    if (l.length) tooltip += `<br/>Climate Risk: ${l[hash % l.length].name}`;
                  }

                  layer.bindTooltip(tooltip, { direction: 'center', className: 'bg-white/95 backdrop-blur border border-slate-100 shadow-xl rounded-xl p-3 text-xs text-slate-800' });
                }}
              />
            )}

            {/* 2. Administrative Boundaries */}
            {activeLayers.administrativeBoundaries && (
              <GeoJSON
                key={`admin-${mapView}`}
                data={indiaGeoJson as any}
                style={() => ({
                  color: mapView === 'satellite' ? 'rgba(255,255,255,0.45)' : 'rgba(51, 65, 85, 0.85)',
                  weight: 1.5,
                  fillColor: 'transparent',
                  fillOpacity: 0
                })}
              />
            )}

            {/* 3. Land Disputes */}
            {activeLayers.landDisputes && MOCK_HOTSPOTS.map((h, i) => (
              <CircleMarker
                key={`hotspot-${i}`}
                center={[h.lat, h.lng]}
                radius={Math.max(8, h.cases / 2.5)}
                pathOptions={{
                  color: h.intensity === 'High density' ? '#DC2626' : (h.intensity === 'Medium density' ? '#F59E0B' : '#FDE68A'),
                  fillColor: h.intensity === 'High density' ? '#DC2626' : (h.intensity === 'Medium density' ? '#F59E0B' : '#FDE68A'),
                  fillOpacity: 0.85,
                  weight: 2
                }}
              >
                <Popup className="rounded-2xl overflow-hidden [&_.leaflet-popup-content-wrapper]:rounded-2xl [&_.leaflet-popup-content-wrapper]:shadow-2xl [&_.leaflet-popup-content]:m-0 border-none">
                  <div className="p-5 w-64 bg-white">
                    <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Dispute Hotspot</div>
                    <div className="text-base font-black text-slate-900 mb-3 leading-tight">{h.name}</div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Active Cases</span>
                      <span className="text-lg font-black text-slate-900">{h.cases}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* 4. Infrastructure Lines */}
            {activeLayers.infrastructure && MOCK_INFRASTRUCTURE_LINES.map((l, i) => (
              <Polyline
                key={`line-${i}`}
                positions={l.coordinates as any}
                pathOptions={{
                  color: l.type === 'Roads' ? '#FACC15' : '#1E293B',
                  weight: l.type === 'Roads' ? 4 : 3,
                  dashArray: l.type === 'Railways' ? '6, 8' : undefined,
                  opacity: 0.9
                }}
              >
                <Tooltip sticky className="bg-white/95 backdrop-blur border border-slate-100 shadow-xl rounded-xl p-2.5 text-xs font-bold text-slate-800">{l.name} ({l.type})</Tooltip>
              </Polyline>
            ))}

            {/* 4. Infrastructure Points */}
            {activeLayers.infrastructure && MOCK_INFRASTRUCTURE_POINTS.map((p, i) => (
              <CircleMarker
                key={`point-${i}`}
                center={[p.lat, p.lng]}
                radius={7}
                pathOptions={{
                  color: '#FFFFFF',
                  weight: 2,
                  fillColor: '#6366F1',
                  fillOpacity: 1
                }}
              >
                <Tooltip sticky className="bg-white/95 backdrop-blur border border-slate-100 shadow-xl rounded-xl p-2.5 text-xs font-bold text-slate-800">{p.name} ({p.type})</Tooltip>
              </CircleMarker>
            ))}

          </MapContainer>

          {/* Map Legends Overlay */}
          <div className="absolute bottom-6 left-6 z-[400] flex flex-row flex-wrap gap-4 items-end pointer-events-none max-w-2xl">
            {activeLayerObjs.map(layer => (
              <div key={`legend-${layer.id}`} className="bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200/60 p-4 w-48 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{layer.name}</div>
                <div className="flex flex-col gap-2.5">
                  {layer.categories.map((l, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-[4px] shrink-0 shadow-inner" style={{ backgroundColor: l.color }}></div>
                      <span className="text-xs font-bold text-slate-700 truncate">{l.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
