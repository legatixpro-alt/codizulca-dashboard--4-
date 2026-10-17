import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Copy, 
  Check, 
  ExternalLink, 
  Building2, 
  User, 
  Phone, 
  ShieldCheck, 
  Clock, 
  Maximize2,
  Compass,
  AlertCircle,
  Globe2,
  Satellite,
  Layers,
  FileText,
  Share2,
  CheckCircle2,
  Target
} from 'lucide-react';
import L from 'leaflet';
import { EnrichedClient } from '../../data/clientsWithLocation';

interface ClientMapModalProps {
  client: EnrichedClient | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClientMapModal: React.FC<ClientMapModalProps> = ({ client, isOpen, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFicha, setCopiedFicha] = useState(false);
  const [modalMapStyle, setModalMapStyle] = useState<'google-earth-hybrid' | 'google-earth-satellite' | 'google-streets' | 'esri-street'>('google-earth-hybrid');

  const MODAL_LAYERS = {
    'google-earth-hybrid': {
      url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Earth Imagery &copy; Google Maps',
      maxZoom: 21,
    },
    'google-earth-satellite': {
      url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Earth Imagery',
      maxZoom: 21,
    },
    'google-streets': {
      url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    },
    'esri-street': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &copy; OpenStreetMap',
      maxZoom: 19,
    },
  };

  useEffect(() => {
    if (!isOpen || !client) return;

    // Small delay to ensure modal DOM is mounted and sized
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Clean existing map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const hasGps = client.hasLocation && client.survey?.latitud && client.survey?.longitud;
      const defaultLat = hasGps ? client.survey!.latitud : 10.6427;
      const defaultLng = hasGps ? client.survey!.longitud : -71.6125;
      const zoomLevel = hasGps ? 17 : 12;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: zoomLevel,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Google Earth Hybrid Tiles by default
      const layerConfig = MODAL_LAYERS[modalMapStyle] || MODAL_LAYERS['google-earth-hybrid'];
      const tile = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        maxZoom: layerConfig.maxZoom,
        subdomains: layerConfig.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'],
      }).addTo(map);

      tileLayerRef.current = tile;

      if (hasGps) {
        const { latitud, longitud } = client.survey!;

        // Custom pulsing marker pin
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
              <span style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(220, 38, 38, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <div style="position: relative; z-index: 10; width: 36px; height: 36px; border-radius: 9999px; background: #dc2626; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([latitud, longitud], { icon: customIcon }).addTo(map);

        // Circular Geofence perimeter (50m)
        L.circle([latitud, longitud], {
          radius: 50,
          color: '#e00613',
          fillColor: '#e00613',
          fillOpacity: 0.18,
          weight: 2,
          dashArray: '4, 4',
        }).addTo(map);

        // Popup with client info, showing client ID and sector prominently
        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 230px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 800; color: #ffffff; background: #991b1b; padding: 2px 6px; border-radius: 4px; border: 1px solid #ef4444; font-family: monospace;">
                COD #${client.id}
              </span>
              <span style="font-size: 9px; font-weight: 700; color: #ffffff; background: #18181b; padding: 2px 6px; border-radius: 4px; border: 1px solid #3f3f46;">
                Geocerca 50m
              </span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.25;">
              ${client.nombre}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #b91c1c; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
              📍 <span>${client.sector}</span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
              <strong>Municipio:</strong> ${client.survey?.municipio || client.zona}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
              <strong>Vendedor:</strong> ${client.vendedor}
            </div>
            <div style="font-size: 10px; font-family: monospace; color: #64748b; margin-top: 4px; padding-top: 3px; border-top: 1px solid #e2e8f0;">
              ${latitud.toFixed(6)}, ${longitud.toFixed(6)}
            </div>
          </div>
        `).openPopup();
      }

      // Invalidate size once rendered
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, client, modalMapStyle]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !client) return null;

  const hasGps = client.hasLocation && client.survey?.latitud && client.survey?.longitud;
  const lat = client.survey?.latitud;
  const lng = client.survey?.longitud;

  const handleCopyCoords = () => {
    if (lat && lng) {
      navigator.clipboard.writeText(`${lat}, ${lng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(client.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const googleMapsUrl = hasGps 
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.nombre}, ${client.zona}, Venezuela`)}`;

  const googleEarthUrl = hasGps
    ? `https://earth.google.com/web/@${lat},${lng},120a,350d,35y,0t,0r`
    : `https://earth.google.com/web/search/${encodeURIComponent(`${client.nombre}, Maracaibo, Venezuela`)}`;

  const wazeUrl = hasGps 
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : null;

  const handleCopyFichaCompleta = () => {
    const text = `📋 *FICHA TÉCNICA COMERCIAL - CODIZULCA*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *CÓDIGO DE CLIENTE:* #${client.id}\n` +
      `🏢 *CLIENTE:* ${client.nombre}\n` +
      `📍 *SECTOR:* ${client.sector}\n` +
      `🗺️ *UBICACIÓN:* ${client.survey?.municipio ? `${client.survey.municipio}, ${client.survey.estado || 'Zulia'}` : client.zona}\n` +
      `🏪 *CANAL:* ${client.canal}\n` +
      `👤 *VENDEDOR:* ${client.vendedor}\n` +
      `👔 *SUPERVISOR:* ${client.supervisor}\n` +
      ((client.rif || client.survey?.rifCedula) ? `📄 *RIF/CÉDULA:* ${client.rif || client.survey?.rifCedula}\n` : '') +
      (client.survey?.telefono ? `📞 *TELÉFONO:* ${client.survey.telefono}\n` : '') +
      (hasGps 
        ? `🎯 *GEOCERCA:* Activa (Perímetro: 50m - Estatus: ${client.survey?.estadoEncuesta || 'COMPLETA'})\n` +
          `🌐 *COORDENADAS:* ${lat?.toFixed(7)}, ${lng?.toFixed(7)}\n` +
          `🌍 *GOOGLE EARTH 3D:* ${googleEarthUrl}\n` +
          `🚗 *GOOGLE MAPS:* ${googleMapsUrl}\n`
        : `⚠️ *GEOLOCALIZACIÓN:* Coordenadas pendientes de relevamiento en ruta\n`) +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Sistema Oficial Codizulca - ${new Date().toLocaleDateString('es-VE')}_`;

    navigator.clipboard.writeText(text);
    setCopiedFicha(true);
    setTimeout(() => setCopiedFicha(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Oficial de Ficha Técnica */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/70 border border-red-800/50 px-2 py-0.5 rounded">
                  FICHA TÉCNICA OFICIAL
                </span>
                
                {/* Código de Cliente Destacado */}
                <button
                  onClick={handleCopyCode}
                  className="font-mono text-xs font-black text-white bg-zinc-900 hover:bg-zinc-800 border border-white/20 px-2.5 py-0.5 rounded inline-flex items-center gap-1.5 transition-colors"
                  title="Copiar código del cliente"
                >
                  <span className="text-red-400 font-bold">CÓDIGO:</span>
                  <span>#{client.id}</span>
                  {copiedCode ? (
                    <Check className="w-3 h-3 text-red-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-400 hover:text-white" />
                  )}
                </button>

                {/* Sector Badge Destacado en Header */}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-zinc-900 border border-white/20 px-2.5 py-0.5 rounded">
                  <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                  {client.sector}
                </span>

                {hasGps && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-red-950/80 border border-red-700/60 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3 text-red-500" />
                    Geocerca 50m Sincronizada
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-white mt-1 line-clamp-1">
                <span className="text-red-400 font-mono mr-2">#{client.id}</span>
                {client.nombre}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFichaCompleta}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-white/10 text-xs font-bold transition-all shadow"
              title="Copiar ficha técnica completa para WhatsApp o informe"
            >
              {copiedFicha ? (
                <>
                  <Check className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400">¡Ficha Copiada!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copiar Ficha</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 min-h-[460px] overflow-hidden">
          {/* Map Viewer */}
          <div className="lg:col-span-2 relative bg-zinc-900 border-b lg:border-b-0 lg:border-r border-white/10 min-h-[320px] lg:min-h-full">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Quick Layer Switcher Floating on Modal Map */}
            <div className="absolute top-3 left-3 z-10 bg-zinc-950/90 backdrop-blur-md border border-white/15 rounded-xl p-1.5 shadow-xl flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-red-500" />
              <select
                value={modalMapStyle}
                onChange={(e) => setModalMapStyle(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-zinc-200 focus:outline-none pr-1"
              >
                <option value="google-earth-hybrid" className="bg-zinc-900 text-white">🌍 Google Earth Híbrido</option>
                <option value="google-earth-satellite" className="bg-zinc-900 text-white">🛰️ Google Earth Satélite</option>
                <option value="google-streets" className="bg-zinc-900 text-white">🚗 Google Maps Calles</option>
                <option value="esri-street" className="bg-zinc-900 text-white">🗺️ Esri Calles HD</option>
              </select>
            </div>

            {/* Floating Sector Pill over Map */}
            <div className="absolute bottom-3 left-3 z-10 bg-black/85 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-zinc-200">
                {client.sector}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                ({client.survey?.municipio || client.zona})
              </span>
            </div>

            {!hasGps && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-zinc-950/70 backdrop-blur-sm pointer-events-none text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-700/50 flex items-center justify-center text-red-500 mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-sm mb-1">Sin Coordenadas GPS Exactas</h4>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Mostrando centro de referencia para <strong className="text-white">{client.sector}</strong>. El cliente aún no ha completado el levantamiento de coordenadas en ruta.
                </p>
              </div>
            )}
          </div>

          {/* Right Info Panel: Ficha Técnica Detallada */}
          <div className="p-5 flex flex-col justify-between overflow-y-auto bg-zinc-950 space-y-4 custom-scrollbar">
            
            {/* 1. SECCIÓN IDENTIFICACIÓN & SECTOR COMERCIAL */}
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[11px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-red-500" />
                  Identificación Técnica
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  REF: CLI-{client.id}
                </span>
              </div>

              {/* Código de Cliente y Sector en cajas destacadas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-black/50 border border-white/10">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Código Cliente:
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-base font-black text-red-400">
                      #{client.id}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      title="Copiar código"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-red-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/50 border border-white/10">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Canal / Tipo:
                  </span>
                  <span className="font-bold text-xs text-white block mt-1 truncate">
                    {client.canal}
                  </span>
                </div>
              </div>

              {/* SECTOR DE UBICACIÓN - DESTACADO */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-red-950/40 via-zinc-900 to-black border border-red-500/30">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  Sector de Ubicación Comercial
                </div>
                <p className="text-sm font-black text-white leading-tight">
                  {client.sector}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Municipio: <span className="text-zinc-200 font-semibold">{client.survey?.municipio || client.zona}</span>
                  {client.survey?.estado && ` • Estado: ${client.survey.estado}`}
                </p>
              </div>
            </div>

            {/* 2. GEOLOCALIZACIÓN & GEOCERCA 50M */}
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-red-500" />
                  Geocerca & Coordenadas
                </span>
                {hasGps && (
                  <button
                    onClick={handleCopyCoords}
                    className="text-[11px] flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedCoords ? (
                      <>
                        <Check className="w-3 h-3 text-red-400" />
                        <span className="text-red-400 font-bold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar Coords</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {hasGps ? (
                <div className="space-y-1.5">
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between bg-black/40 px-2.5 py-1.5 rounded border border-white/5">
                      <span className="text-zinc-500">Latitud:</span>
                      <span className="text-white font-bold">{lat?.toFixed(7)}</span>
                    </div>
                    <div className="flex justify-between bg-black/40 px-2.5 py-1.5 rounded border border-white/5">
                      <span className="text-zinc-500">Longitud:</span>
                      <span className="text-white font-bold">{lng?.toFixed(7)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-zinc-900 border border-white/10 px-2.5 py-1.5 rounded text-[11px]">
                    <span className="text-zinc-300 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                      Perímetro de Visita:
                    </span>
                    <span className="font-bold text-white bg-red-950/80 border border-red-700/60 px-2 py-0.5 rounded text-[10px]">
                      50 Metros Activo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-zinc-900 border border-white/10 text-xs text-zinc-300">
                  Coordenadas pendientes por relevar por el vendedor asignado.
                </div>
              )}
            </div>

            {/* 3. DATOS COMERCIALES & VENDEDOR ASIGNADO */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-zinc-500">Vendedor Asignado:</span>
                <span className="text-white font-bold text-right">{client.vendedor}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-zinc-500">Supervisor & Zona:</span>
                <span className="text-zinc-300 text-right">{client.supervisor} ({client.zona})</span>
              </div>

              {(client.rif || client.survey?.rifCedula) && (
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-zinc-500">RIF / Cédula:</span>
                  <span className="text-zinc-200 font-mono font-bold">{client.rif || client.survey?.rifCedula}</span>
                </div>
              )}

              {client.survey?.telefono && (
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-red-400" />
                    Contacto:
                  </span>
                  <a 
                    href={`tel:${client.survey.telefono}`}
                    className="text-red-400 hover:text-red-300 font-mono font-semibold"
                  >
                    {client.survey.telefono}
                  </a>
                </div>
              )}

              {client.survey?.fecha && (
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-zinc-500">Fecha Relevamiento:</span>
                  <span className="text-zinc-300 font-mono">{client.survey.fecha}</span>
                </div>
              )}

              {client.survey?.notas && (
                <div className="pt-1">
                  <span className="text-zinc-500 block mb-1">Notas de Encuesta:</span>
                  <p className="text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-white/5 text-[11px] italic">
                    {client.survey.notas}
                  </p>
                </div>
              )}
            </div>

            {/* 4. ENLACES Y ACCIONES DE FICHA */}
            <div className="pt-2 space-y-2">
              {/* Botón Copiar Ficha Completa (móvil y escritorio) */}
              <button
                onClick={handleCopyFichaCompleta}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all shadow"
              >
                {copiedFicha ? (
                  <>
                    <Check className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">¡Ficha Técnica Copiada al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-zinc-400" />
                    <span>Copiar Ficha Técnica del Cliente</span>
                  </>
                )}
              </button>

              {/* Google Earth 3D Button */}
              <a
                href={googleEarthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/15 hover:border-red-500/50 shadow-md transition-all hover:scale-[1.01]"
              >
                <Globe2 className="w-4 h-4 text-red-500" />
                <span>Explorar en Google Earth 3D</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#e00613] hover:bg-[#c90510] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-950/60 transition-all hover:scale-[1.01]"
              >
                <Navigation className="w-4 h-4" />
                <span>Abrir en Google Maps</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {wazeUrl && (
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all"
                >
                  <Compass className="w-4 h-4 text-red-400" />
                  <span>Navegar con Waze</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
