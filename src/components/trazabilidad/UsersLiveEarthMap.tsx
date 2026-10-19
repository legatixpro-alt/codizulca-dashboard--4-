import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Satellite,
  Globe2,
  Users,
  Compass,
  MapPin,
  ExternalLink,
  LocateFixed,
  Search,
  CheckCircle2,
  Radio,
  Sparkles,
  Maximize2,
  Filter,
  Eye,
  Smartphone,
  Laptop
} from 'lucide-react';
import L from 'leaflet';
import { TrazabilidadItem, parseCoordinates, validateAndOptimizeCoordinates } from '../../lib/trazabilidadService';

interface UsersLiveEarthMapProps {
  logs: TrazabilidadItem[];
  onSelectUserForModal: (log: TrazabilidadItem) => void;
}

type MapLayerType = 'google-earth-hybrid' | 'google-earth-satellite' | 'google-streets' | 'esri-satellite';

const MAP_LAYERS: Record<MapLayerType, { url: string; subdomains?: string[]; attribution: string; maxZoom: number; label: string }> = {
  'google-earth-hybrid': {
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Earth &copy; Maxar Technologies',
    maxZoom: 21,
    label: 'Google Earth Híbrido'
  },
  'google-earth-satellite': {
    url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Earth &copy; CNES/Airbus',
    maxZoom: 21,
    label: 'Satélite Puro'
  },
  'google-streets': {
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
    maxZoom: 20,
    label: 'Calles & Vías'
  },
  'esri-satellite': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 19,
    label: 'Esri Satellite'
  }
};

export const UsersLiveEarthMap: React.FC<UsersLiveEarthMapProps> = ({ logs, onSelectUserForModal }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('google-earth-hybrid');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Filter items that have real coordinates and deduplicate by latest action per user
  const mappedUsers = useMemo(() => {
    const userMap = new Map<string, { log: TrazabilidadItem; lat: number; lng: number; sectorName: string }>();

    for (const item of logs) {
      const coords = validateAndOptimizeCoordinates(
        item.device.coordinates,
        item.device.locationCity,
        item.device.address
      );
      if (coords.hasCoordinates) {
        // Only keep the most recent event for each user
        if (!userMap.has(item.user.email)) {
          userMap.set(item.user.email, {
            log: item,
            lat: coords.lat,
            lng: coords.lng,
            sectorName: item.device.address || coords.sectorName
          });
        }
      }
    }

    return Array.from(userMap.values());
  }, [logs]);

  // Filtered list for the search in the side list
  const filteredMappedUsers = useMemo(() => {
    if (!searchFilter.trim()) return mappedUsers;
    const term = searchFilter.toLowerCase();
    return mappedUsers.filter(
      u =>
        u.log.user.name.toLowerCase().includes(term) ||
        u.log.user.email.toLowerCase().includes(term) ||
        u.log.device.locationCity.toLowerCase().includes(term) ||
        (u.log.device.address && u.log.device.address.toLowerCase().includes(term)) ||
        u.log.user.role.toLowerCase().includes(term)
    );
  }, [mappedUsers, searchFilter]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Center on Zulia / Maracaibo / Falcón region by default
    const map = L.map(mapContainerRef.current, {
      center: [10.6542, -71.6241],
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Zoom control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Layer
    const layerConfig = MAP_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      subdomains: layerConfig.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: layerConfig.maxZoom,
      attribution: layerConfig.attribution
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Group for markers
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers whenever mappedUsers or activeLayer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (mappedUsers.length === 0) return;

    const bounds: [number, number][] = [];

    mappedUsers.forEach(({ log, lat, lng, sectorName }) => {
      bounds.push([lat, lng]);

      const isLive = log.action.status === 'active';
      const isSelected = selectedUserEmail === log.user.email;
      const ringColor = isLive ? '#10b981' : log.user.role === 'Administrador' ? '#ef4444' : '#f59e0b';

      const markerHtml = `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            isLive
              ? `<div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="position: absolute; inset: 4px; border-radius: 9999px; border: 3px solid ${
            isSelected ? '#ffffff' : ringColor
          }; box-shadow: 0 4px 15px rgba(0,0,0,0.8); background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            ${
              log.user.photoUrl
                ? `<img src="${log.user.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<span style="color: #fff; font-weight: 800; font-size: 13px;">${log.user.name.charAt(0)}</span>`
            }
          </div>
          <!-- Status Pip -->
          <div style="position: absolute; bottom: 3px; right: 3px; width: 12px; height: 12px; border-radius: 9999px; background: ${ringColor}; border: 2px solid #ffffff; z-index: 20;"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-multiuser-marker',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(markersGroup);

      // Circle geofence around active user
      if (isLive) {
        L.circle([lat, lng], {
          radius: 35,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: '3, 3'
        }).addTo(markersGroup);
      }

      // Popup Content
      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 4px; min-width: 250px; color: #111;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; overflow: hidden; background: #dc2626; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0;">
              ${log.user.photoUrl ? `<img src="${log.user.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : log.user.name.charAt(0)}
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 800; text-transform: uppercase;">${log.user.name}</div>
              <div style="font-size: 11px; color: #666;">${log.user.role}</div>
            </div>
          </div>
          <div style="font-size: 11px; margin-top: 4px; padding: 4px 6px; background: #f3f4f6; border-radius: 6px;">
            <strong>Acción:</strong> ${log.action.label}
          </div>
          <div style="font-size: 10px; font-family: monospace; color: #15803d; font-weight: bold; margin-top: 4px;">
            📍 ${sectorName}
          </div>
          <div style="font-size: 10px; font-family: monospace; color: #444; margin-top: 2px;">
            ${lat.toFixed(4)}°, ${lng.toFixed(4)}° • Tierra Firme Validada
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
            <button id="btn-inspect-${log.id}" style="font-size: 11px; font-weight: bold; color: #ffffff; background: #dc2626; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
              🌍 Abrir Google Earth 3D
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${log.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectUserForModal(log);
          };
        }
      });
    });

    // Auto fit bounds once
    if (bounds.length > 0 && !selectedUserEmail) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [mappedUsers, selectedUserEmail, onSelectUserForModal]);

  // Handle Layer change
  const handleChangeLayer = (layerKey: MapLayerType) => {
    setActiveLayer(layerKey);
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const layerConfig = MAP_LAYERS[layerKey];
    const newTile = L.tileLayer(layerConfig.url, {
      subdomains: layerConfig.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: layerConfig.maxZoom,
      attribution: layerConfig.attribution
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTile;
  };

  // Fly to specific user
  const handleFlyToUser = (userItem: { log: TrazabilidadItem; lat: number; lng: number }) => {
    setSelectedUserEmail(userItem.log.user.email);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userItem.lat, userItem.lng], 18, { duration: 1.5 });
    }
  };

  // Fit all bounds
  const handleFitAll = () => {
    setSelectedUserEmail(null);
    if (!mapInstanceRef.current || mappedUsers.length === 0) return;
    const bounds: [number, number][] = mappedUsers.map(u => [u.lat, u.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  return (
    <div className="bg-[#0f0f11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col xl:flex-row h-[720px]">
      
      {/* ========================================================================= */}
      {/* 1. VISOR PRINCIPAL DE GOOGLE EARTH HYBRID                                 */}
      {/* ========================================================================= */}
      <div className="relative flex-1 h-full min-h-[400px] bg-black overflow-hidden">
        
        {/* Contenedor del Mapa Leaflet */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Barra Superior Flotante: Selector de Capas */}
        <div className="absolute top-4 left-4 z-20 bg-black/85 backdrop-blur-md border border-white/15 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1">
          {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((key) => {
            const layer = MAP_LAYERS[key];
            const isSelected = activeLayer === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleChangeLayer(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Satellite className="w-3 h-3" />
                <span className="hidden sm:inline">{layer.label}</span>
              </button>
            );
          })}
        </div>

        {/* Botones Flotantes de Control (Right Side) */}
        <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleFitAll}
            className="p-3 rounded-2xl bg-black/85 hover:bg-black text-white border border-white/20 shadow-2xl transition-all cursor-pointer flex items-center justify-center group"
            title="Ver a todos los usuarios en el mapa"
          >
            <LocateFixed className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Badge Flotante de Conteo Satelital en Vivo */}
        <div className="absolute bottom-4 left-4 z-20 bg-black/85 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-black text-white tracking-wider uppercase text-[11px]">
              {mappedUsers.length} USUARIOS GEORREFERENCIADOS
            </span>
          </div>
          <span className="text-zinc-500 font-mono text-[11px] hidden sm:inline">• Zulia y Falcón</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PANEL LATERAL: LISTA DE USUARIOS ACTIVOS CON ACCESO INMEDIATO           */}
      {/* ========================================================================= */}
      <div className="w-full xl:w-96 bg-[#121316] border-t xl:border-t-0 xl:border-l border-white/10 flex flex-col h-[340px] xl:h-full z-10 shrink-0">
        
        {/* Cabecera del Panel */}
        <div className="p-4 border-b border-white/10 bg-[#16171b] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-red-500" />
              <h3 className="font-black text-white text-xs uppercase tracking-wider">
                USUARIOS EN TIEMPO REAL
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold">
              {filteredMappedUsers.length} visibles
            </span>
          </div>

          {/* Buscador Rápido de Usuarios */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar promotora, ciudad..."
              className="w-full bg-[#1a1b1f] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
        </div>

        {/* Lista con Scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
          {filteredMappedUsers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No se encontraron usuarios coincidentes con la búsqueda.
            </div>
          ) : (
            filteredMappedUsers.map((item) => {
              const isLive = item.log.action.status === 'active';
              const isSelected = selectedUserEmail === item.log.user.email;

              return (
                <div
                  key={item.log.user.email}
                  className={`p-3 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-red-950/40 border-red-500/50 shadow-md'
                      : 'hover:bg-white/[0.03] border-transparent'
                  }`}
                  onClick={() => handleFlyToUser(item)}
                >
                  <div className="flex items-start gap-3">
                    {/* Foto o Avatar */}
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center font-bold text-white text-xs">
                      {item.log.user.photoUrl ? (
                        <img src={item.log.user.photoUrl} alt={item.log.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full ${item.log.user.avatarBg || 'bg-red-700'} flex items-center justify-center`}>
                          {item.log.user.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-white text-xs uppercase truncate">
                          {item.log.user.name}
                        </h4>
                        {isLive && (
                          <span className="flex h-2 w-2 relative shrink-0" title="Sesión Activa Ahora">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="truncate">{item.log.device.locationCity}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          item.log.user.role === 'Administrador'
                            ? 'bg-red-950/80 border-red-500/40 text-red-400'
                            : item.log.user.role === 'Coordinador Trade'
                            ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                        }`}>
                          {item.log.user.role}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectUserForModal(item.log);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                        >
                          <span>Google Earth</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer del Panel */}
        <div className="p-3 bg-[#16171b] border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
          <button
            type="button"
            onClick={handleFitAll}
            className="text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
          >
            ↺ Reencuadrar todos
          </button>
          <span className="font-mono text-[10px] text-zinc-500">GPS Satelital Activo</span>
        </div>
      </div>

    </div>
  );
};
