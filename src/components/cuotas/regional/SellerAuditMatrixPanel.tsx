import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Users,
  Compass,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  FileEdit,
  ExternalLink,
  SlidersHorizontal,
  Flame,
  ArrowUpDown
} from 'lucide-react';
import {
  SellerAuditRecord,
  RegionalAuditMetric,
  AuditRiskLevel
} from './regionalAuditTypes';
import { formatAuditValue, getMetricBadgeLabel } from './regionalAuditUtils';

interface SellerAuditMatrixPanelProps {
  sellerRecords: SellerAuditRecord[];
  metric: RegionalAuditMetric;
  selectedSupervisorFilter: string;
  onSupervisorFilterChange: (supervisor: string) => void;
  onOpenAuditModal: (record: SellerAuditRecord) => void;
  diasLaborables?: number;
  diasTranscurridos?: number;
}

export const SellerAuditMatrixPanel: React.FC<SellerAuditMatrixPanelProps> = ({
  sellerRecords,
  metric,
  selectedSupervisorFilter,
  onSupervisorFilterChange,
  onOpenAuditModal,
  diasLaborables = 26,
  diasTranscurridos = 19
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | AuditRiskLevel>('ALL');
  const [sortField, setSortField] = useState<'cumplimiento' | 'brecha' | 'diasSupervision' | 'vendedor'>('cumplimiento');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // asc por defecto para ver a los peores primero

  // Filtros combinados
  const filteredRecords = useMemo(() => {
    let list = [...sellerRecords];

    // Filtro por supervisor
    if (selectedSupervisorFilter !== 'ALL') {
      list = list.filter((s) => s.supervisor === selectedSupervisorFilter);
    }

    // Filtro por riesgo
    if (riskFilter !== 'ALL') {
      list = list.filter((s) => s.riskLevel === riskFilter);
    }

    // Búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.vendedor.toLowerCase().includes(term) ||
          s.supervisor.toLowerCase().includes(term) ||
          s.zona.toLowerCase().includes(term) ||
          (s.causaRaizDesviacion && s.causaRaizDesviacion.toLowerCase().includes(term))
      );
    }

    // Ordenamiento
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'cumplimiento') {
        comparison = a.pctCumplimiento - b.pctCumplimiento;
      } else if (sortField === 'brecha') {
        comparison = b.brecha - a.brecha;
      } else if (sortField === 'diasSupervision') {
        comparison = b.diasUltimaSupervision - a.diasUltimaSupervision;
      } else if (sortField === 'vendedor') {
        comparison = a.vendedor.localeCompare(b.vendedor);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [sellerRecords, selectedSupervisorFilter, riskFilter, searchTerm, sortField, sortOrder]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const metaAlDiaPct = Number(((diasTranscurridos / diasLaborables) * 100).toFixed(1));

  return (
    <div className="space-y-4">
      {/* Controles de Filtro y Búsqueda */}
      <div className="bg-zinc-950/90 border border-white/10 rounded-xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              Matriz de Auditoría 1-a-1: Supervisores vs Vendedores
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspección directa de los 28 vendedores comerciales, estado de cuota, días sin acompañamiento en ruta y causas de rezago.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Corte al Día {diasTranscurridos} de {diasLaborables}:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-white font-mono font-bold">
              Ritmo Esperado: {metaAlDiaPct}%
            </span>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/5">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar vendedor, zona o causa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Filtro por Supervisor */}
          <div>
            <select
              value={selectedSupervisorFilter}
              onChange={(e) => onSupervisorFilterChange(e.target.value)}
              className="w-full py-1.5 px-3 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 font-bold"
            >
              <option value="ALL">Todos los Supervisores (Johnatan, Ali & Nelson)</option>
              <option value="JOHNATAN SOTO">Supervisor: Johnatan Soto ({sellerRecords.filter(s => s.supervisor === 'JOHNATAN SOTO').length})</option>
              <option value="ALI PEREZ">Supervisor: Ali Perez ({sellerRecords.filter(s => s.supervisor === 'ALI PEREZ').length})</option>
              <option value="NELSON FINOL">Supervisor: Nelson Finol ({sellerRecords.filter(s => s.supervisor === 'NELSON FINOL').length})</option>
            </select>
          </div>

          {/* Filtro por Semáforo / Riesgo */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="w-full py-1.5 px-3 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Todos los Estados de Riesgo</option>
              <option value="rojo">🚨 Críticos (&lt;75% de meta al día)</option>
              <option value="amarillo">⚠️ En Seguimiento (75% - 99%)</option>
              <option value="verde">🟢 En Meta (≥100% al día)</option>
            </select>
          </div>

          {/* Ordenar por */}
          <div>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-') as [any, any];
                setSortField(f);
                setSortOrder(o);
              }}
              className="w-full py-1.5 px-3 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="cumplimiento-asc">Menor % Cumplimiento (Prioridad Rezago)</option>
              <option value="cumplimiento-desc">Mayor % Cumplimiento (Mejores)</option>
              <option value="brecha-desc">Mayor Brecha en Volumen ($ / Cj)</option>
              <option value="diasSupervision-desc">Más Días sin Acompañamiento en Ruta</option>
              <option value="vendedor-asc">Nombre del Vendedor (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contador de Resultados y Píldoras Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Mostrando:</span>
          <strong className="text-white font-mono">{filteredRecords.length}</strong>
          <span className="text-zinc-500">de {sellerRecords.length} vendedores</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRiskFilter('rojo')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              riskFilter === 'rojo'
                ? 'bg-red-600 text-white shadow'
                : 'bg-red-950/40 text-red-400 hover:bg-red-900/50 border border-red-500/30'
            }`}
          >
            🚨 Ver Solo Críticos ({sellerRecords.filter(s => s.riskLevel === 'rojo').length})
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              riskFilter === 'ALL'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Restablecer Filtros
          </button>
        </div>
      </div>

      {/* Tabla Principal de Auditoría */}
      <div className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1250px] text-xs">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300 font-bold uppercase tracking-wider border-b border-white/10 select-none">
                <th
                  onClick={() => toggleSort('vendedor')}
                  className="p-3 border-r border-white/10 cursor-pointer hover:bg-white/5 min-w-[210px]"
                >
                  <div className="flex items-center justify-between">
                    <span>Vendedor</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th className="p-3 border-r border-white/10 min-w-[150px]">
                  Supervisor
                </th>
                <th className="p-2.5 text-center border-r border-white/10 min-w-[100px]">
                  Meta Mes
                </th>
                <th className="p-2.5 text-center border-r border-white/10 min-w-[105px]">
                  Real Acum.
                </th>
                <th
                  onClick={() => toggleSort('cumplimiento')}
                  className="p-2.5 text-center border-r border-white/10 cursor-pointer hover:bg-white/5 min-w-[110px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>% Cump.</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th className="p-2.5 text-center border-r border-white/10 min-w-[110px]">
                  Proyección EOM
                </th>
                <th
                  onClick={() => toggleSort('brecha')}
                  className="p-2.5 text-center border-r border-white/10 cursor-pointer hover:bg-white/5 min-w-[100px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Brecha</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('diasSupervision')}
                  className="p-2.5 text-center border-r border-white/10 cursor-pointer hover:bg-white/5 min-w-[130px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Últ. Acompañ.</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th className="p-3 border-r border-white/10 min-w-[220px]">
                  Diagnóstico y Causa de Rezago
                </th>
                <th className="p-3 text-center min-w-[140px]">
                  Acción Auditoría
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-500">
                    No se encontraron vendedores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => {
                  const isRed = row.riskLevel === 'rojo';
                  const isYellow = row.riskLevel === 'amarillo';
                  const isGreen = row.riskLevel === 'verde';

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isRed ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* Vendedor y Zona */}
                      <td className="p-3 border-r border-white/10">
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              isRed
                                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                : isYellow
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                          <div>
                            <span className="font-bold text-white block">
                              {row.vendedor}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Supervisor */}
                      <td className="p-3 border-r border-white/10 font-medium text-zinc-300">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.supervisor === 'JOHNATAN SOTO'
                            ? 'bg-blue-950/40 text-blue-300 border border-blue-500/20'
                            : row.supervisor === 'ALI PEREZ'
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-500/20'
                            : 'bg-purple-950/40 text-purple-300 border border-purple-500/20'
                        }`}>
                          {row.supervisor.split(' ')[0]} {row.supervisor.split(' ')[1]?.[0]}.
                        </span>
                      </td>

                      {/* Meta */}
                      <td className="p-2.5 text-center font-mono text-zinc-400 border-r border-white/10">
                        {formatAuditValue(row.meta, metric)}
                      </td>

                      {/* Real */}
                      <td className="p-2.5 text-center font-mono font-bold text-white border-r border-white/10">
                        {formatAuditValue(row.real, metric)}
                      </td>

                      {/* % Cumplimiento */}
                      <td className="p-2.5 text-center font-mono border-r border-white/10">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-black text-xs ${
                              isRed
                                ? 'text-red-400'
                                : isYellow
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {row.pctCumplimiento.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-zinc-500">
                            {row.pctCumplimiento >= metaAlDiaPct ? '✓ En ritmo' : `▼ -${(metaAlDiaPct - row.pctCumplimiento).toFixed(1)}%`}
                          </span>
                        </div>
                      </td>

                      {/* Proyección EOM */}
                      <td className="p-2.5 text-center font-mono border-r border-white/10">
                        <span className={`font-semibold ${row.pctProyectado >= 100 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {formatAuditValue(row.proyectadoEOM, metric)}
                        </span>
                        <span className="block text-[9px] text-zinc-500">
                          ({row.pctProyectado.toFixed(0)}%)
                        </span>
                      </td>

                      {/* Brecha */}
                      <td className="p-2.5 text-center font-mono border-r border-white/10">
                        <span className={row.brecha > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                          {row.brecha > 0 ? formatAuditValue(row.brecha, metric) : 'Cubierta'}
                        </span>
                      </td>

                      {/* Último Acompañamiento en Ruta */}
                      <td className="p-2.5 text-center border-r border-white/10">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-xs ${
                              row.diasUltimaSupervision > 12
                                ? 'text-red-400'
                                : row.diasUltimaSupervision > 7
                                ? 'text-amber-400'
                                : 'text-zinc-300'
                            }`}
                          >
                            Hace {row.diasUltimaSupervision} días
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {row.fechaUltimaSupervision}
                          </span>
                        </div>
                      </td>

                      {/* Diagnóstico / Causa Raíz */}
                      <td className="p-3 border-r border-white/10">
                        <p className="text-zinc-300 text-[11px] leading-tight line-clamp-2" title={row.causaRaizDesviacion}>
                          {row.causaRaizDesviacion || 'En evaluación regular'}
                        </p>
                      </td>

                      {/* Botón Acción Auditoría */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenAuditModal(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-600 text-zinc-200 hover:text-white border border-white/10 text-xs font-bold transition-all active:scale-95 shadow"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>Auditar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (() => {
              const totalMeta = filteredRecords.reduce((acc, r) => acc + (r.meta || 0), 0);
              const totalReal = filteredRecords.reduce((acc, r) => acc + (r.real || 0), 0);
              const totalProy = filteredRecords.reduce((acc, r) => acc + (r.proyectadoEOM || 0), 0);
              const totalBrecha = Math.max(0, totalMeta - totalReal);
              const pctCumpTotal = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
              const pctProyTotal = totalMeta > 0 ? (totalProy / totalMeta) * 100 : 0;
              const avgDiasSup = filteredRecords.reduce((acc, r) => acc + (r.diasUltimaSupervision || 0), 0) / filteredRecords.length;
              return (
                <tfoot className="bg-zinc-900/95 border-t-2 border-red-500/40 font-mono text-xs">
                  <tr>
                    <td className="p-3 border-r border-white/10 font-black text-white uppercase tracking-wider">
                      TOTAL CONSOLIDADO ({filteredRecords.length} Vendedores)
                    </td>
                    <td className="p-3 border-r border-white/10 text-center font-bold text-zinc-400">
                      {selectedSupervisorFilter === 'ALL' ? '3 Equipos' : selectedSupervisorFilter}
                    </td>
                    <td className="p-2.5 text-center font-bold text-zinc-200 border-r border-white/10">
                      {formatAuditValue(totalMeta, metric)}
                    </td>
                    <td className="p-2.5 text-center font-black text-white border-r border-white/10">
                      {formatAuditValue(totalReal, metric)}
                    </td>
                    <td className="p-2.5 text-center border-r border-white/10">
                      <span className={`font-black ${pctCumpTotal >= metaAlDiaPct ? 'text-emerald-400' : pctCumpTotal >= metaAlDiaPct * 0.75 ? 'text-amber-400' : 'text-red-400'}`}>
                        {pctCumpTotal.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center border-r border-white/10">
                      <span className={`font-bold ${pctProyTotal >= 100 ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {formatAuditValue(totalProy, metric)}
                      </span>
                      <span className="block text-[9px] text-zinc-400">
                        ({pctProyTotal.toFixed(0)}%)
                      </span>
                    </td>
                    <td className="p-2.5 text-center border-r border-white/10">
                      <span className={totalBrecha > 0 ? 'text-red-400 font-black' : 'text-emerald-400 font-bold'}>
                        {totalBrecha > 0 ? formatAuditValue(totalBrecha, metric) : 'Cubierta'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center text-zinc-300 font-bold border-r border-white/10">
                      Prom: {avgDiasSup.toFixed(1)} días
                    </td>
                    <td colSpan={2} className="p-2.5 text-center text-[11px] text-zinc-400 font-sans">
                      Meta al Día: <strong className="text-white">{metaAlDiaPct.toFixed(1)}%</strong> ({diasTranscurridos}/{diasLaborables} días)
                    </td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </div>
    </div>
  );
};
