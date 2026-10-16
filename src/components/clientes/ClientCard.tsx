import React, { useState } from 'react';
import { 
  MapPin, 
  UserCircle, 
  Building2, 
  Phone, 
  Calendar, 
  ExternalLink, 
  Copy, 
  Check, 
  Map, 
  ShieldCheck, 
  Clock, 
  Compass, 
  Store,
  Globe2,
  Target,
  Hash
} from 'lucide-react';
import { EnrichedClient } from '../../data/clientsWithLocation';

interface ClientCardProps {
  client: EnrichedClient;
  onOpenMap: (client: EnrichedClient) => void;
  canalBadgeColor: (canal: string) => string;
}

export const ClientCard: React.FC<ClientCardProps> = ({ client, onOpenMap, canalBadgeColor }) => {
  const [copied, setCopied] = useState(false);

  const hasGps = client.hasLocation && client.survey?.latitud && client.survey?.longitud;
  const lat = client.survey?.latitud;
  const lng = client.survey?.longitud;

  const handleCopyCoords = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lat && lng) {
      navigator.clipboard.writeText(`${lat}, ${lng}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const estadoEncuestaBadge = (estado?: string) => {
    switch (estado?.toUpperCase()) {
      case 'COMPLETA':
        return 'bg-red-950/70 text-white border-red-600/60 font-bold';
      case 'MODIFICADA':
        return 'bg-zinc-900 text-zinc-200 border-white/20 font-medium';
      case 'PENDIENTE':
        return 'bg-zinc-900 text-zinc-300 border-white/10 font-medium';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  const geofenceStatusText = (estado?: string) => {
    switch (estado?.toUpperCase()) {
      case 'COMPLETA':
        return 'Geocerca Validada • Completa';
      case 'PENDIENTE':
        return 'Geocerca Activa • Pendiente';
      case 'MODIFICADA':
        return 'Geocerca Activa • Modificada';
      default:
        return 'Geocerca Activa';
    }
  };

  const googleEarthUrl = lat && lng ? `https://earth.google.com/web/@${lat},${lng},120a,350d,35y,0t,0r` : null;

  return (
    <div className="bg-zinc-950/90 border border-white/10 hover:border-red-500/60 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(220,38,38,0.15)] flex flex-col justify-between group relative overflow-hidden">
      {/* Top accent light */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${hasGps ? 'bg-red-600' : 'bg-zinc-800'}`} />

      <div>
        {/* Header: ID, GPS status and Canal */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-black text-white bg-red-950/90 border border-red-700/70 px-2.5 py-0.5 rounded-md shadow-sm">
              <span className="text-red-400 font-bold">CÓDIGO:</span> #{client.id}
            </span>
            {hasGps ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border ${estadoEncuestaBadge(client.survey?.estadoEncuesta)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${client.survey?.estadoEncuesta === 'COMPLETA' ? 'bg-red-500 animate-pulse' : 'bg-zinc-400'}`} />
                {geofenceStatusText(client.survey?.estadoEncuesta)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                <Clock className="w-3 h-3 text-zinc-500" />
                Sin Geocerca / GPS
              </span>
            )}
          </div>

          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border shrink-0 ${canalBadgeColor(client.canal)}`}>
            {client.canal}
          </span>
        </div>

        {/* Client Title with Code and RIF */}
        <div className="mb-3.5">
          <h3 className="font-bold text-white text-base sm:text-lg leading-snug tracking-wide group-hover:text-red-400 transition-colors line-clamp-2">
            <span className="text-red-400 font-mono font-black mr-1.5">#{client.id}</span>
            {client.nombre}
          </h3>
          {client.survey?.rifCedula ? (
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              RIF: <span className="text-zinc-200 font-bold">{client.survey.rifCedula}</span>
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500 mt-0.5">Cliente de Cartera Codizulca</p>
          )}
        </div>

        {/* Sector, Código Oficial y Ubicación Comercial */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5 font-bold shrink-0">
              <Hash className="w-3.5 h-3.5 text-red-500 shrink-0" />
              Código de Cliente:
            </span>
            <span className="font-mono font-black text-red-400 text-xs bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded">
              #{client.id}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs pt-1.5 border-t border-white/5">
            <span className="text-zinc-400 flex items-center gap-1.5 font-bold shrink-0">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              Sector:
            </span>
            <span className="font-bold text-white text-right truncate" title={client.sector}>
              {client.sector}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-white/5">
            <span className="text-zinc-500">Municipio / Zona:</span>
            <span className="text-zinc-300 font-medium text-right truncate max-w-[190px]">
              {client.survey?.municipio ? `${client.survey.municipio}, ${client.survey.estado || 'Zulia'}` : client.zona}
            </span>
          </div>
        </div>

        {/* Commercial details (Vendedor & Supervisor) */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-3 mb-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <UserCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              Vendedor:
            </span>
            <span className="font-semibold text-zinc-200 text-right truncate max-w-[190px]">
              {client.vendedor}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/5">
            <span className="text-zinc-500">Supervisor:</span>
            <span className="text-zinc-300 font-medium text-right text-[11px] uppercase truncate max-w-[190px]">
              {client.supervisor}
            </span>
          </div>
        </div>

        {/* Exact Location Section */}
        <div className="space-y-2 mb-4">

          {hasGps ? (
            <div className="bg-zinc-900/90 border border-white/10 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-red-500" />
                  Geocerca Activa (Perímetro: 50m)
                </span>
                <button
                  onClick={handleCopyCoords}
                  className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-black/60 hover:bg-zinc-800 transition-colors cursor-pointer border border-white/5"
                  title="Copiar latitud y longitud"
                >
                  {copied ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-red-400" />
                      <span className="text-red-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              <div className="font-mono text-[11px] text-zinc-300 flex items-center justify-between">
                <span className="text-zinc-500">Lat: <strong className="text-white">{lat?.toFixed(5)}</strong></span>
                <span className="text-zinc-500">Lng: <strong className="text-white">{lng?.toFixed(5)}</strong></span>
              </div>

              {client.survey?.estadoEncuesta && (
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                  <span className="text-zinc-400">Encuesta {client.survey.fecha}:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border ${estadoEncuestaBadge(client.survey.estadoEncuesta)}`}>
                    {client.survey.estadoEncuesta}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-2.5 text-xs text-zinc-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span>Pendiente levantamiento GPS en próxima ruta</span>
            </div>
          )}

          {client.survey?.telefono && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-500 flex items-center gap-1">
                <Phone className="w-3 h-3 text-zinc-400" />
                Teléfono:
              </span>
              <a
                href={`tel:${client.survey.telefono}`}
                className="text-red-400 hover:text-red-300 font-mono font-semibold text-xs"
              >
                {client.survey.telefono}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 border-t border-white/10 flex items-center gap-2">
        <button
          onClick={() => onOpenMap(client)}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            hasGps
              ? 'bg-[#e00613] hover:bg-[#c90510] text-white shadow-md shadow-red-950/60 hover:scale-[1.02] cursor-pointer'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 cursor-pointer'
          }`}
          title="Abrir Ficha Técnica Completa con Georreferenciación"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Ver Ficha Técnica</span>
        </button>

        {hasGps && googleEarthUrl && (
          <a
            href={googleEarthUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Explorar en Google Earth 3D"
          >
            <Globe2 className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">Earth 3D</span>
          </a>
        )}

        {hasGps && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors"
            title="Abrir en Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
