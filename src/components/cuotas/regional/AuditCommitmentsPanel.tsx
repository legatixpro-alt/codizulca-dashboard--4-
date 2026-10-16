import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Check,
  Send,
  Trash2
} from 'lucide-react';
import { AuditCommitment, CommitmentStatus } from './regionalAuditTypes';

interface AuditCommitmentsPanelProps {
  commitments: AuditCommitment[];
  onUpdateCommitmentStatus: (id: string, status: CommitmentStatus) => void;
  onOpenNewCommitmentModal: () => void;
  onDeleteCommitment?: (id: string) => void;
}

export const AuditCommitmentsPanel: React.FC<AuditCommitmentsPanelProps> = ({
  commitments,
  onUpdateCommitmentStatus,
  onOpenNewCommitmentModal,
  onDeleteCommitment
}) => {
  const [filterSupervisor, setFilterSupervisor] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = commitments.filter((c) => {
    if (filterSupervisor !== 'ALL' && c.supervisor !== filterSupervisor) return false;
    if (filterStatus !== 'ALL' && c.estado !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header del Panel */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 rounded-xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Actas de Auditoría y Planes de Acción Formales
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
              Registro vinculante de compromisos pactados en las sesiones de auditoría con los supervisores Johnatan Soto, Ali Perez y Nelson Finol,
              con fecha límite de cumplimiento y acciones de campo exigidas.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewCommitmentModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Acta de Compromiso</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-3 rounded-xl border border-white/10 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">Supervisor:</span>
            <select
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
              className="py-1 px-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-bold focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Todos los Supervisores</option>
              <option value="JOHNATAN SOTO">Johnatan Soto</option>
              <option value="ALI PEREZ">Ali Perez</option>
              <option value="NELSON FINOL">Nelson Finol</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-1 px-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-bold focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="en_ejecucion">En Ejecución (Activos)</option>
              <option value="pendiente">Pendientes de Inicio</option>
              <option value="cumplido">Cumplidos / Auditados</option>
            </select>
          </div>
        </div>

        <div className="text-zinc-400 text-xs font-mono">
          {filtered.length} {filtered.length === 1 ? 'acta registrada' : 'actas registradas'}
        </div>
      </div>

      {/* Grid de Actas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const isDone = item.estado === 'cumplido';
          const isPending = item.estado === 'pendiente';
          const isRunning = item.estado === 'en_ejecucion';

          return (
            <div
              key={item.id}
              className={`bg-zinc-950 border rounded-xl p-4 sm:p-5 shadow-xl space-y-3.5 transition-all ${
                isDone
                  ? 'border-emerald-500/20 bg-emerald-950/5'
                  : item.prioridad === 'urgente'
                  ? 'border-red-500/40 bg-red-950/10'
                  : 'border-white/10'
              }`}
            >
              {/* Header del Acta */}
              <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-white/10 font-bold">
                      {item.folio}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        item.prioridad === 'urgente'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      Prioridad {item.prioridad}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">
                    {item.tipoHallazgo}
                  </h4>
                </div>

                {/* Badge de Estado */}
                <div className="shrink-0">
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cumplido
                    </span>
                  ) : isRunning ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5" /> En Ejecución
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-white/10">
                      <AlertCircle className="w-3.5 h-3.5" /> Pendiente
                    </span>
                  )}
                </div>
              </div>

              {/* Info de Contexto */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <User className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-zinc-500">Supervisor:</span>
                  <strong className="text-white truncate">{item.supervisor}</strong>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-zinc-500">Foco:</span>
                  <strong className="text-white truncate">{item.vendedor}</strong>
                </div>
              </div>

              {/* Descripción del Compromiso */}
              <div className="p-3 rounded-lg bg-zinc-900/80 border border-white/5 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  Compromiso Pactado con el Supervisor:
                </span>
                <p className="text-zinc-200 leading-relaxed">
                  {item.descripcionCompromiso}
                </p>
                <div className="pt-1 text-[11px] text-zinc-400">
                  <strong className="text-zinc-300">Acción Requerida:</strong> {item.accionesRequeridas}
                </div>
              </div>

              {/* Notas de Seguimiento si existen */}
              {item.notasSeguimiento && (
                <div className="text-[11px] text-zinc-400 italic bg-black/30 p-2 rounded border border-white/5">
                  <strong className="text-zinc-300 not-italic">Seguimiento:</strong> "{item.notasSeguimiento}"
                </div>
              )}

              {/* Fechas y Acciones de Estado */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Límite:</span>
                  <strong className="text-white font-mono">{item.fechaLimite}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isDone ? (
                    <button
                      type="button"
                      onClick={() => onUpdateCommitmentStatus(item.id, 'cumplido')}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Marcar Cumplido</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateCommitmentStatus(item.id, 'en_ejecucion')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-all"
                    >
                      <span>Reabrir Acta</span>
                    </button>
                  )}

                  {onDeleteCommitment && (
                    <button
                      type="button"
                      onClick={() => onDeleteCommitment(item.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                      title="Eliminar compromiso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
