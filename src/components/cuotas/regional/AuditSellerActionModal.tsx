import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Star,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
  MapPin,
  Save,
  Clock
} from 'lucide-react';
import {
  SellerAuditRecord,
  RegionalAuditMetric,
  AuditCommitment
} from './regionalAuditTypes';
import { formatAuditValue, AUDIT_ROOT_CAUSES } from './regionalAuditUtils';

interface AuditSellerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerRecord: SellerAuditRecord | null;
  metric: RegionalAuditMetric;
  onSaveAuditAndCommitment: (
    sellerId: string,
    calificacionAcompanamiento: number,
    causaRaiz: string,
    nuevoCompromiso?: Omit<AuditCommitment, 'id' | 'folio' | 'fechaCreacion' | 'estado' | 'gerenteAutoriza'>
  ) => void;
}

export const AuditSellerActionModal: React.FC<AuditSellerActionModalProps> = ({
  isOpen,
  onClose,
  sellerRecord,
  metric,
  onSaveAuditAndCommitment
}) => {
  if (!isOpen || !sellerRecord) return null;

  const [calificacion, setCalificacion] = useState<number>(sellerRecord.calificacionAcompanamiento || 3);
  const [causaRaiz, setCausaRaiz] = useState<string>(sellerRecord.causaRaizDesviacion || AUDIT_ROOT_CAUSES[0]);
  const [customCausa, setCustomCausa] = useState<string>('');
  
  // Nuevo compromiso
  const [crearCompromiso, setCrearCompromiso] = useState<boolean>(true);
  const [descripcionCompromiso, setDescripcionCompromiso] = useState<string>(
    `Jornada de acompañamiento en ruta del supervisor ${sellerRecord.supervisor} con ${sellerRecord.vendedor} para recuperar clientes rezagados y acelerar colocación.`
  );
  const [accionesRequeridas, setAccionesRequeridas] = useState<string>(
    'Visita presencial a clientes clave, desbloqueo de cartera y reporte de compromisos de compra.'
  );
  const [fechaLimite, setFechaLimite] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [prioridad, setPrioridad] = useState<'alta' | 'media' | 'urgente'>('alta');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCausa = customCausa.trim() ? customCausa : causaRaiz;

    let nuevoComp: any = undefined;
    if (crearCompromiso && descripcionCompromiso.trim()) {
      nuevoComp = {
        supervisor: sellerRecord.supervisor,
        vendedor: sellerRecord.vendedor,
        zona: sellerRecord.zona,
        tipoHallazgo: finalCausa,
        descripcionCompromiso,
        accionesRequeridas,
        fechaLimite,
        prioridad
      };
    }

    onSaveAuditAndCommitment(sellerRecord.id, calificacion, finalCausa, nuevoComp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Auditoría Directa de Vendedor y Plan de Acción
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {sellerRecord.vendedor} • {sellerRecord.zona}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-zinc-300">
          {/* Tarjeta de Resumen Comercial del Vendedor */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-lg bg-black/40">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Supervisor</span>
              <strong className="text-white text-xs block truncate">{sellerRecord.supervisor}</strong>
            </div>
            <div className="p-2 rounded-lg bg-black/40">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Meta Mensual</span>
              <strong className="text-white font-mono text-xs block">{formatAuditValue(sellerRecord.meta, metric)}</strong>
            </div>
            <div className="p-2 rounded-lg bg-black/40">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Real Acumulado</span>
              <strong className="text-white font-mono text-xs block">{formatAuditValue(sellerRecord.real, metric)}</strong>
            </div>
            <div className="p-2 rounded-lg bg-black/40">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">% Cumplimiento</span>
              <strong className={`font-mono text-xs block font-bold ${
                sellerRecord.riskLevel === 'rojo' ? 'text-red-400' : sellerRecord.riskLevel === 'amarillo' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {sellerRecord.pctCumplimiento.toFixed(1)}%
              </strong>
            </div>
          </div>

          {/* Calificación del Acompañamiento del Supervisor */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              1. Evaluación del Acompañamiento del Supervisor ({sellerRecord.supervisor}):
            </label>
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-zinc-300 block font-medium">Nivel de Soporte y Presencia en Campo:</span>
                <span className="text-[11px] text-zinc-500">Última supervisión en ruta registrada hace {sellerRecord.diasUltimaSupervision} días</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCalificacion(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= calificacion ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Diagnóstico / Causa Raíz de Desviación */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              2. Causa Raíz de Desviación o Hallazgo de Auditoría:
            </label>
            <select
              value={causaRaiz}
              onChange={(e) => setCausaRaiz(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-900 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-red-500"
            >
              {AUDIT_ROOT_CAUSES.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="O describe una causa personalizada..."
              value={customCausa}
              onChange={(e) => setCustomCausa(e.target.value)}
              className="w-full py-2 px-3 bg-zinc-900 border border-white/10 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 mt-2"
            />
          </div>

          {/* Sección de Compromiso Formal con el Supervisor */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-500" />
                3. Levantar Acta de Compromiso Formal con el Supervisor
              </label>
              <input
                type="checkbox"
                checked={crearCompromiso}
                onChange={(e) => setCrearCompromiso(e.target.checked)}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
            </div>

            {crearCompromiso && (
              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">Descripción del Compromiso:</span>
                  <textarea
                    rows={2}
                    value={descripcionCompromiso}
                    onChange={(e) => setDescripcionCompromiso(e.target.value)}
                    className="w-full py-1.5 px-3 bg-zinc-950 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">Acciones Requeridas en Campo:</span>
                  <textarea
                    rows={2}
                    value={accionesRequeridas}
                    onChange={(e) => setAccionesRequeridas(e.target.value)}
                    className="w-full py-1.5 px-3 bg-zinc-950 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Fecha Límite:</span>
                    <input
                      type="date"
                      value={fechaLimite}
                      onChange={(e) => setFechaLimite(e.target.value)}
                      className="w-full py-1.5 px-3 bg-zinc-950 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Prioridad:</span>
                    <select
                      value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value as any)}
                      className="w-full py-1.5 px-3 bg-zinc-950 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-red-500 font-bold"
                    >
                      <option value="media">Prioridad Media</option>
                      <option value="alta">Prioridad Alta</option>
                      <option value="urgente">Urgente (Intervención Inmediata)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Dictamen y Plan de Auditoría</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
