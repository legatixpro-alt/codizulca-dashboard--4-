import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Phone,
  MapPin,
  ShieldCheck,
  Package,
  Mail
} from 'lucide-react';
import { PROMOTERS_LIST, campoService, PromoterProfile } from '../../lib/campoService';
import { degustacionesService } from '../../lib/degustacionesService';

interface CambiarPerfilModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPromoter: PromoterProfile;
  onSelectPromoter: (promoter: PromoterProfile) => void;
}

export const CambiarPerfilModal: React.FC<CambiarPerfilModalProps> = ({
  isOpen,
  onClose,
  currentPromoter,
  onSelectPromoter
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredPromoters = PROMOTERS_LIST.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      p.role.toLowerCase().includes(term) ||
      p.zone.toLowerCase().includes(term) ||
      p.phone.includes(term) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  });

  const merchandisingStaff = filteredPromoters.filter(p => p.role === 'Promotor Merchandising');
  const impulsadorasStaff = filteredPromoters.filter(p => p.role !== 'Promotor Merchandising');

  const handleSelect = (promoter: PromoterProfile) => {
    campoService.setActivePromoter(promoter);
    onSelectPromoter(promoter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0d0d0d] border border-neutral-800 w-full max-w-[512px] rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-red-950/40">
        
        {/* Cabecera del Modal */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Cambiar Colaborador</h3>
              <p className="text-[11px] text-neutral-400">Selecciona el perfil de campo activo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador Universal */}
        <div className="p-4 border-b border-neutral-800 bg-[#0d0d0d]">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo o zona..."
              className="w-full bg-[#171717] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Personal Scrollable */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Grupo 1: Promotores Merchandising */}
          {merchandisingStaff.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  Promotores Merchandising (6 Pestañas)
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">{merchandisingStaff.length}</span>
              </div>

              <div className="space-y-2">
                {merchandisingStaff.map((p) => {
                  const isCurrent = currentPromoter.id === p.id;
                  const deg = degustacionesService.getActiveDegustacionForPromoter(p.name);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between active:scale-[0.98] cursor-pointer ${
                        isCurrent
                          ? 'bg-red-950/40 border-red-600/80 shadow-lg shadow-red-950/50'
                          : 'bg-[#171717] border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-neutral-800 shrink-0 flex items-center justify-center font-black text-sm text-white">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-white truncate">{p.name}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/30 text-[9px] font-bold">
                              {p.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                            <span>{p.zone}</span>
                          </p>
                          {deg && (
                            <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1 font-bold truncate">
                              <Package className="w-3 h-3 text-red-500 shrink-0" />
                              <span className="truncate">{deg.product} ({deg.time})</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold font-mono shrink-0 ml-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Activo</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 hover:text-white shrink-0 ml-2">Seleccionar</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grupo 2: Impulsadoras Fijas y Eventuales */}
          {impulsadorasStaff.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Impulsadoras y Promotoras (5 Pestañas)
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">{impulsadorasStaff.length}</span>
              </div>

              <div className="space-y-2">
                {impulsadorasStaff.map((p) => {
                  const isCurrent = currentPromoter.id === p.id;
                  const deg = degustacionesService.getActiveDegustacionForPromoter(p.name);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between active:scale-[0.98] cursor-pointer ${
                        isCurrent
                          ? 'bg-red-950/40 border-red-600/80 shadow-lg shadow-red-950/50'
                          : 'bg-[#171717] border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-neutral-800 shrink-0 flex items-center justify-center font-black text-sm text-white">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-white truncate">{p.name}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[9px] font-medium">
                              {p.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                            <span>{p.zone}</span>
                          </p>
                          {deg && (
                            <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1 font-bold truncate">
                              <Package className="w-3 h-3 text-red-500 shrink-0" />
                              <span className="truncate">{deg.product} ({deg.time})</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold font-mono shrink-0 ml-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Activo</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 hover:text-white shrink-0 ml-2">Seleccionar</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredPromoters.length === 0 && (
            <div className="py-8 text-center text-neutral-500 space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">No se encontró personal con "{searchTerm}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#141414] border-t border-neutral-800 text-center">
          <p className="text-[10px] text-neutral-500 font-mono">
            Codizulca Campo • Acceso con Correo y Contraseña
          </p>
        </div>
      </div>
    </div>
  );
};
