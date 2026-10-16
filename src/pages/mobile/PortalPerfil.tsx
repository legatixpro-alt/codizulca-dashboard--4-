import React, { useEffect, useState } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  MapPin,
  Calendar,
  Sparkles,
  Package,
  Store,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  KeyRound,
  Check
} from 'lucide-react';
import { campoService, PromoterProfile } from '../../lib/campoService';
import { degustacionesService, DegustacionItem } from '../../lib/degustacionesService';

export const PortalPerfil: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{
    activePromoter: PromoterProfile;
    isOnline: boolean;
  }>();

  const activePromoter = context?.activePromoter || campoService.getActivePromoter();

  const [activeDegustacion, setActiveDegustacion] = useState<DegustacionItem | null>(() =>
    degustacionesService.getActiveDegustacionForPromoter(activePromoter.name)
  );
  const [allPromoterDegustaciones, setAllPromoterDegustaciones] = useState<DegustacionItem[]>(() =>
    degustacionesService.getDegustacionesForPromoter(activePromoter.name)
  );
  const [totalDegustaciones, setTotalDegustaciones] = useState<number>(() =>
    degustacionesService.getDegustacionesForPromoter(activePromoter.name).length
  );
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const updateInfo = () => {
      const list = degustacionesService.getDegustacionesForPromoter(activePromoter.name);
      setActiveDegustacion(degustacionesService.getActiveDegustacionForPromoter(activePromoter.name));
      setAllPromoterDegustaciones(list);
      setTotalDegustaciones(list.length);
    };

    updateInfo();
    const unsubscribe = degustacionesService.subscribe(() => {
      updateInfo();
    });

    return () => unsubscribe();
  }, [activePromoter.name]);

  const handleLogout = () => {
    if (window.confirm(`¿Cerrar sesión de ${activePromoter.name}?`)) {
      campoService.logoutPromoter();
      navigate('/portal/login', { replace: true });
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-8 text-white">
      {/* Cabecera del Perfil con Foto */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-red-500/40 bg-zinc-800 shadow-xl relative flex items-center justify-center shrink-0">
          {activePromoter.photoUrl ? (
            <img
              src={activePromoter.photoUrl}
              alt={activePromoter.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-black text-white text-xl">
              {activePromoter.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-base font-black text-white truncate">{activePromoter.name}</h2>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono bg-red-600/20 text-red-400 border border-red-500/30">
              {activePromoter.role}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
            <span className="truncate">{activePromoter.zone}</span>
          </p>
          <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
            <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="truncate">{activePromoter.email}</span>
          </p>
        </div>
      </div>

      {/* Tarjeta de Degustación Asignada en su Perfil */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-400">
            <Sparkles className="w-4 h-4" />
            <span>Degustación Asignada a tu Perfil</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-400">
            {totalDegustaciones} programada(s)
          </span>
        </div>

        {activeDegustacion ? (
          <div className="bg-[#1a1a1a] border border-red-500/30 rounded-xl p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 font-bold block">
                  {activeDegustacion.id} • {activeDegustacion.date}
                </span>
                <h4 className="text-xs font-black text-white mt-0.5">
                  {activeDegustacion.activity}
                </h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                  activeDegustacion.status === 'in_progress'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : activeDegustacion.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {activeDegustacion.status === 'in_progress'
                  ? 'En Curso'
                  : activeDegustacion.status === 'completed'
                  ? 'Completada'
                  : 'Programada'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Store className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="font-bold truncate">{activeDegustacion.client}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Package className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Producto: <strong className="text-white">{activeDegustacion.product}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Horario: {activeDegustacion.time}</span>
                <span>•</span>
                <span>Meta: <strong className="text-white">{activeDegustacion.target} porciones</strong></span>
              </div>
              {activeDegustacion.vendedor && (
                <div className="text-[11px] text-amber-400/90 font-medium pt-0.5">
                  👤 Vendedor Solicitante: <strong>{activeDegustacion.vendedor}</strong>
                </div>
              )}
            </div>

            <Link
              to="/portal/ruta"
              className="mt-2 w-full py-2 px-3 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Ver en Pestaña de Ruta</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/5 text-center text-xs text-zinc-400">
            No tienes degustaciones activas asignadas en este momento.
          </div>
        )}

        {/* Listado de Todas las Degustaciones Asignadas para la Promotora */}
        {allPromoterDegustaciones.length > 1 && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            <h5 className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider">
              Otras Degustaciones Asignadas ({allPromoterDegustaciones.length})
            </h5>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {allPromoterDegustaciones
                .filter((d) => d.id !== activeDegustacion?.id)
                .map((deg) => (
                  <div
                    key={deg.id}
                    className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-400">{deg.date} • {deg.time}</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-zinc-800 text-zinc-300">
                        {deg.status}
                      </span>
                    </div>
                    <p className="font-bold text-white text-xs truncate">{deg.client}</p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {deg.product} • Meta: {deg.target} porc.
                    </p>
                    {deg.vendedor && (
                      <p className="text-[10px] text-amber-400/80 font-mono">
                        Vendedor: {deg.vendedor}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Credenciales de Acceso a la App */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-red-500" />
          <span>Credenciales Registradas de la Promotora</span>
        </h3>
        <div className="flex items-center justify-between py-1.5 border-b border-white/5">
          <span className="text-zinc-400">Correo de Acceso</span>
          <span className="font-mono font-bold text-white truncate max-w-[200px]">{activePromoter.email}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-white/5">
          <span className="text-zinc-400">Contraseña</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-red-400">
              {showPassword ? (activePromoter.password || 'codi123') : '••••••••'}
            </span>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-zinc-400">Estado de Cuenta</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
            Activo / Sincronizado
          </span>
        </div>
      </div>

      {/* Información del Dispositivo y Conexión */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          Configuración de Operación
        </h3>
        <div className="flex items-center justify-between py-1.5 border-b border-white/5">
          <span className="text-zinc-400">Teléfono Registrado</span>
          <span className="font-mono font-bold text-white">{activePromoter.phone}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-white/5">
          <span className="text-zinc-400">Módulo PWA</span>
          <span className="font-mono text-emerald-400 font-bold">Offline & GPS Ready</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-zinc-400">Sincronización Trade Marketing</span>
          <span className="font-mono text-red-400 font-bold">En Tiempo Real</span>
        </div>
      </div>

      {/* Botón Cerrar Sesión */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-red-950/60 border border-white/10 hover:border-red-500/40 text-red-400 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98]"
      >
        <LogOut className="w-4 h-4" />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );
};
