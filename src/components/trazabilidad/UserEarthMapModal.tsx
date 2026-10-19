import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Compass,
  Satellite,
  Layers,
  Sparkles,
  Maximize2,
  RefreshCw,
  Radio,
  Smartphone,
  Laptop,
  ShieldCheck,
  Clock,
  Navigation,
  Globe2,
  LocateFixed
} from 'lucide-react';
import L from 'leaflet';
import {
  TrazabilidadItem,
  parseCoordinates,
  reverseGeocodeCoordinates,
  trazabilidadService
} from '../../lib/trazabilidadService';

interface UserEarthMapModalProps {
  log: TrazabilidadItem | null;
  isOpen: boolean;
  onClose: () => void;
}

type MapLayerType = 'google-earth-hybrid' | 'google-earth-satellite' | 'google-streets' | 'esri-satellite';

const MAP_LAYERS: Record<MapLayerType, { url: string; subdomains?: string[]; attribution: string; maxZoom: number; label: string }> = {
  'google-earth-hybrid': {
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Earth &copy; CNES/Airbus &copy; Maxar Technologies',
    maxZoom: 21,
    label: 'Google Earth Híbrido'
  },
  'google-earth-satellite': {
    url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Earth &copy; Maxar Technologies',
    maxZoom: 21,
    label: 'Satélite Puro 4K'
  },
  'google-streets': {
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
    maxZoom: 20,
    label: 'Google Maps Calles'
  },
  'esri-satellite': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery &copy; Earthstar Geographics',
    maxZoom: 19,
    label: 'Esri World Satellite'
  }
};

export const UserEarthMapModal: React.FC<UserEarthMapModalProps> = ({ log, isOpen, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('google-earth-hybrid');
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(18);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');

  const parsedCoords = log
    ? typeof log.device.lat === 'number' && typeof log.device.lng === 'number'
      ? { lat: log.device.lat, lng: log.device.lng }
      : parseCoordinates(log.device.coordinates)
    : null;

  const lat = parsedCoords ? parsedCoords.lat : 0;
  const lng = parsedCoords ? parsedCoords.lng : 0;
  const hasRealCoordinates = Boolean(parsedCoords);
  const sectorName =
    resolvedAddress ||
    log?.device.address ||
    log?.device.locationCity ||
    (hasRealCoordinates ? `${lat.toFixed(6)}°, ${lng.toFixed(6)}°` : 'Sin coordenadas GPS');

  // Resolver dirección física exacta desde el GPS mediante geocodificación inversa si aún no está guardada
  useEffect(() => {
    if (!isOpen || !log) return;
    setResolvedAddress(log.device.address || '');

    if (hasRealCoordinates && !log.device.address) {
      reverseGeocodeCoordinates(lat, lng).then((geo) => {
        if (geo && geo.address) {
          setResolvedAddress(geo.address);
          trazabilidadService.updateEvent(log.id, {
            device: {
              ...log.device,
              address: geo.address,
              locationCity: geo.locationCity || log.device.locationCity,
              lat,
              lng
            }
          });
        }
      });
    }
  }, [isOpen, log, hasRealCoordinates, lat, lng]);

  // Initialize or re-render map when modal opens or log changes
  useEffect(() => {
    if (!isOpen || !log || !hasRealCoordinates) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Clean up previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 18,
        zoomControl: false,
        attributionControl: false
      });

      mapInstanceRef.current = map;

      // Add Zoom Control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add Tile Layer
      const layerConfig = MAP_LAYERS[activeLayer];
      const tileLayer = L.tileLayer(layerConfig.url, {
        subdomains: layerConfig.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: layerConfig.maxZoom,
        attribution: layerConfig.attribution
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      // User Marker
      const isLive = log.action.status === 'active';
      const beaconColor = isLive ? '#10b981' : '#ef4444';
      const pulseColor = isLive ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';

      const markerHtml = `
        <div style="position: relative; width: 54px; height: 54px; display: flex; items-center; justify-content: center;">
          <!-- Radar ring 1 -->
          <div style="position: absolute; inset: 0; border-radius: 9999px; background: ${pulseColor}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <!-- Radar ring 2 -->
          <div style="position: absolute; inset: 6px; border-radius: 9999px; border: 2px solid ${beaconColor}; opacity: 0.8;"></div>
          <!-- Core Avatar -->
          <div style="position: absolute; inset: 9px; border-radius: 9999px; overflow: hidden; background: #000; border: 3px solid #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10;">
            ${
              log.user.photoUrl
                ? `<img src="${log.user.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : `<span style="color: #fff; font-weight: 900; font-size: 14px; font-family: sans-serif;">${log.user.name.charAt(0)}</span>`
            }
          </div>
          <!-- Live Status Indicator Pip -->
          <div style="position: absolute; bottom: 6px; right: 6px; width: 14px; height: 14px; border-radius: 9999px; background: ${beaconColor}; border: 2px solid #ffffff; z-index: 20;"></div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-user-earth-marker',
        iconSize: [54, 54],
        iconAnchor: [27, 27]
      });

      const marker = L.marker([lat, lng], { icon: userIcon }).addTo(map);

      // Precision range circle based on real GPS accuracy
      const accRadius = Math.max(15, Math.min(200, log.device.accuracy || 25));
      L.circle([lat, lng], {
        radius: accRadius,
        color: beaconColor,
        fillColor: beaconColor,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 4'
      }).addTo(map);

      // Interactive Popup
      marker.bindPopup(`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px; min-width: 260px; color: #111;">
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
            ${lat.toFixed(6)}°, ${lng.toFixed(6)}° • ${log.device.gpsVerified ? `GPS Verificado (±${log.device.accuracy || 10}m)` : 'Ubicación Red/IP'}
          </div>
        </div>
      `).openPopup();
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, log, activeLayer, lat, lng, sectorName, hasRealCoordinates]);

  // Handle Layer switch dynamically
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

  // Recenter map
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !hasRealCoordinates) return;
    mapInstanceRef.current.flyTo([lat, lng], 18, { duration: 1.2 });
  };

  // Copy GPS Coords
  const handleCopyCoords = () => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Refrescar dirección o posición GPS real
  const handleSimulatePing = async () => {
    if (!log) return;
    setIsPinging(true);
    try {
      if (hasRealCoordinates) {
        const geo = await reverseGeocodeCoordinates(lat, lng);
        if (geo && geo.address) {
          setResolvedAddress(geo.address);
          await trazabilidadService.updateEvent(log.id, {
            device: {
              ...log.device,
              address: geo.address,
              locationCity: geo.locationCity || log.device.locationCity
            }
          });
        }
      }
      handleRecenter();
    } finally {
      setIsPinging(false);
    }
  };

  if (!isOpen || !log) return null;

  const isLive = log.action.status === 'active';
  const googleEarthWebUrl = `https://earth.google.com/web/@${lat},${lng},120a,850d,35y,0t,0r`;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in-50 duration-200">
      
      {/* Modal Container Styled like Google Earth HUD */}
      <div className="bg-[#0b0c0e] border border-white/15 rounded-3xl w-full max-w-6xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[96vh] animate-in zoom-in-95 duration-200 relative">
        
        {/* ========================================================================= */}
        {/* 1. CABECERA HUD SATELITAL ESTILO GOOGLE EARTH                             */}
        {/* ========================================================================= */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#141518] via-[#0d0e11] to-[#141518] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            {/* Logo Satélite Animado */}
            <div className="w-10 h-10 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/50 shrink-0">
              <Globe2 className="w-5 h-5 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-white text-sm sm:text-base tracking-widest uppercase flex items-center gap-1.5">
                  GOOGLE EARTH • MONITOREO EN VIVO
                </h3>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    GPS EN VIVO • SEÑAL SATELITAL ACTIVA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-300 text-[10px] font-bold">
                    ÚLTIMO REGISTRO CONFIRMADO
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  TIERRA FIRME CALIBRADA
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold">📍 {sectorName}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-bold">Lat: {lat.toFixed(6)}°, Lng: {lng.toFixed(6)}°</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">Zoom: {zoomLevel}x</span>
              </p>
            </div>
          </div>

          {/* Botones de Cabecera */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleSimulatePing}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-bold transition-all cursor-pointer shadow-md"
              title="Actualizar señal GPS"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isPinging ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refrescar GPS</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Cerrar mapa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BARRA DE PERFIL RÁPIDO DEL USUARIO SELECCIONADO                         */}
        {/* ========================================================================= */}
        <div className="px-5 py-2.5 bg-[#121316] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Foto del usuario */}
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-800 border border-white/15 shrink-0 flex items-center justify-center font-black text-white text-xs shadow-md">
              {log.user.photoUrl ? (
                <img src={log.user.photoUrl} alt={log.user.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full ${log.user.avatarBg || 'bg-red-700'} flex items-center justify-center`}>
                  {log.user.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white uppercase text-xs truncate">{log.user.name}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                  log.user.role === 'Administrador'
                    ? 'bg-red-950/80 border-red-500/40 text-red-400'
                    : log.user.role === 'Coordinador Trade'
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                    : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                }`}>
                  {log.user.role}
                </span>
                <span className="text-zinc-400 font-mono text-[11px] truncate hidden md:inline">({log.user.email})</span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                <span className="text-white font-medium">{log.action.label}</span>
                <span className="text-zinc-600">•</span>
                <span className="font-mono text-zinc-400">{log.formattedDate} {log.formattedTime}</span>
              </div>
            </div>
          </div>

          {/* Enlaces Externos Directos */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={googleEarthWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-xs font-bold transition-all shadow-md"
              title="Abrir vista 3D en Google Earth Web oficial"
            >
              <Globe2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Abrir en Google Earth 3D</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-bold transition-all shadow-md"
              title="Abrir en Google Maps"
            >
              <Navigation className="w-3.5 h-3.5 text-red-400" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <button
              type="button"
              onClick={handleCopyCoords}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-bold transition-all cursor-pointer shadow-md"
              title="Copiar coordenadas GPS"
            >
              {copiedCoords ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Coordenadas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. VISOR DE MAPA LEAFLET SATELITAL CON CONTROLES HUD                      */}
        {/* ========================================================================= */}
        <div className="relative flex-1 min-h-[460px] sm:min-h-[520px] bg-black overflow-hidden">
          
          {/* Contenedor Leaflet */}
          <div ref={mapContainerRef} className="w-full h-full z-0 min-h-[460px] sm:min-h-[520px]" />

          {/* Selector Flotante de Capas Satelitales (Top-Left) */}
          <div className="absolute top-4 left-4 z-20 bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1">
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

          {/* Botones Flotantes de Zoom y Re-centrar (Bottom-Right) */}
          <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-2 items-end">
            {/* Presets de Zoom para Auditoría */}
            <div className="bg-black/85 backdrop-blur-md border border-white/15 rounded-2xl p-1 shadow-2xl flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.flyTo([lat, lng], 19, { duration: 1.0 });
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  zoomLevel >= 19 ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Zoom nivel tienda / PDV (19x)"
              >
                19x PDV
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.0 });
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  zoomLevel === 17 || zoomLevel === 18 ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Zoom nivel calle / manzana (17x)"
              >
                17x Calle
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.0 });
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  zoomLevel <= 15 ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Zoom nivel sector / ciudad (14x)"
              >
                14x Ciudad
              </button>
            </div>

            <button
              type="button"
              onClick={handleRecenter}
              className="p-3 rounded-2xl bg-black/85 hover:bg-black text-white border border-white/20 shadow-2xl transition-all cursor-pointer flex items-center justify-center group"
              title="Centrar en la ubicación del usuario"
            >
              <LocateFixed className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* HUD Overlay de Telemetría GPS en Vivo (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 z-20 bg-black/85 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-2xl max-w-sm text-xs font-mono space-y-1.5 pointer-events-auto">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                TELEMETRÍA GPS DE CONEXIÓN
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                {log.device.gpsVerified
                  ? `PRECISIÓN: ±${log.device.accuracy || 10}m`
                  : 'ORIGEN: RED / IP'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="col-span-2 p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-[9px] text-emerald-400 block font-sans font-black uppercase">
                  DIRECCIÓN FÍSICA EXACTA (GEOCODIFICACIÓN INVERSA)
                </span>
                <span className="text-white font-bold block text-[11px] leading-snug">{sectorName}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">COORDENADAS EXACTAS</span>
                <span className="text-white font-bold">{lat.toFixed(6)}°, {lng.toFixed(6)}°</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">CIUDAD / ESTADO</span>
                <span className="text-zinc-200 truncate block">{log.device.locationCity}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">IP ORIGEN</span>
                <span className="text-white">{log.device.ip}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">RED / CARRIER</span>
                <span className="text-emerald-400">{log.device.connection}</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400 font-sans">
              <span>Dispositivo: <strong>{log.device.os} ({log.device.deviceType})</strong></span>
              <span>{log.device.browser}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. FOOTER CON DETALLES DE LA ACCIÓN Y SEGURIDAD                           */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 bg-[#0d0e11] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Ubicación verificada por sensores GPS de dispositivo móvil ({log.device.deviceType}) sincronizado con Codizulca Cloud.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors cursor-pointer text-xs"
            >
              Cerrar Vista Satelital
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
