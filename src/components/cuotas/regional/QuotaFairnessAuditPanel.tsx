import React, { useState, useMemo } from 'react';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Info,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  SellerAuditRecord,
  RegionalAuditMetric
} from './regionalAuditTypes';
import { formatAuditValue, getMetricBadgeLabel } from './regionalAuditUtils';

interface QuotaFairnessAuditPanelProps {
  sellerRecords: SellerAuditRecord[];
  metric: RegionalAuditMetric;
  onOpenAuditModal: (record: SellerAuditRecord) => void;
}

export const QuotaFairnessAuditPanel: React.FC<QuotaFairnessAuditPanelProps> = ({
  sellerRecords,
  metric,
  onOpenAuditModal
}) => {
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');
  const [filterCalibracion, setFilterCalibracion] = useState<'ALL' | 'sobrecargada' | 'subestimada' | 'equilibrada'>('ALL');

  const filtered = useMemo(() => {
    let list = [...sellerRecords];
    if (selectedSupervisor !== 'ALL') {
      list = list.filter((s) => s.supervisor === selectedSupervisor);
    }
    if (filterCalibracion !== 'ALL') {
      list = list.filter((s) => s.calibracionCuota === filterCalibracion);
    }
    return list.sort((a, b) => b.pctCrecimientoExigido - a.pctCrecimientoExigido);
  }, [sellerRecords, selectedSupervisor, filterCalibracion]);

  // Estadísticas globales de equidad
  const sobrecargadasCount = sellerRecords.filter((s) => s.calibracionCuota === 'sobrecargada').length;
  const subestimadasCount = sellerRecords.filter((s) => s.calibracionCuota === 'subestimada').length;
  const equilibradasCount = sellerRecords.filter((s) => s.calibracionCuota === 'equilibrada').length;

  const handleExportPDF = () => {
    if (filtered.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const metricLabel = getMetricBadgeLabel(metric);

    doc.setFillColor(220, 38, 38);
    doc.rect(14, 10, 3.5, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(
      'CODIZULCA - AUDITORIA DE CALIBRACION DE CUOTAS Y SESGOS DE ASIGNACION',
      21,
      14.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Metrica: ${metricLabel}  |  Supervisor: ${selectedSupervisor === 'ALL' ? 'Todos' : selectedSupervisor}  |  Calibracion: ${filterCalibracion.toUpperCase()}  |  Registros: ${filtered.length}`,
      21,
      19.5
    );
    doc.setFontSize(7.5);
    doc.text(`Exportado: ${new Date().toLocaleString('es-VE')}`, 21, 24);

    const headRow = [
      'VENDEDOR',
      'SUPERVISOR',
      'PROMEDIO HISTORICO',
      'CUOTA ASIGNADA',
      '% CRECIMIENTO EXIGIDO',
      'DIAGNOSTICO DE CUOTA',
      'RECOMENDACION REGIONAL',
    ];

    const bodyRows = filtered.map((row) => {
      const isOver = row.calibracionCuota === 'sobrecargada';
      const isUnder = row.calibracionCuota === 'subestimada';
      const diag = isOver ? 'Sobrecargada' : isUnder ? 'Subestimada' : 'Calibrada';
      const rec = isOver
        ? 'Exigencia muy alta vs historico. Estructurar combos promocionales o moderar meta.'
        : isUnder
        ? 'Cuota holgada. Sugerido incrementar cuota en rubros de mayor rotacion.'
        : 'Meta armonica y desafiante; alineada a la estacionalidad de la zona.';

      return [
        row.vendedor,
        row.supervisor,
        formatAuditValue(row.promedioHistorico, metric),
        formatAuditValue(row.meta, metric),
        row.pctCrecimientoExigido >= 0
          ? `+${row.pctCrecimientoExigido.toFixed(1)}%`
          : `${row.pctCrecimientoExigido.toFixed(1)}%`,
        diag,
        rec,
      ];
    });

    const sumHist = filtered.reduce((acc, r) => acc + (r.promedioHistorico || 0), 0);
    const sumMeta = filtered.reduce((acc, r) => acc + (r.meta || 0), 0);
    const pctGrowthTotal = sumHist > 0 ? ((sumMeta - sumHist) / sumHist) * 100 : 0;

    const footRow = [
      `TOTAL CONSOLIDADO (${filtered.length} Vendedores)`,
      selectedSupervisor === 'ALL' ? 'Todos' : selectedSupervisor,
      formatAuditValue(sumHist, metric),
      formatAuditValue(sumMeta, metric),
      pctGrowthTotal >= 0 ? `+${pctGrowthTotal.toFixed(1)}%` : `${pctGrowthTotal.toFixed(1)}%`,
      '',
      '',
    ];

    autoTable(doc, {
      startY: 27,
      head: [headRow],
      body: bodyRows,
      foot: [footRow],
      theme: 'grid',
      styles: { fontSize: 7.2, cellPadding: 1.6, textColor: [30, 41, 59], valign: 'middle' },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 44 },
        1: { halign: 'left', cellWidth: 32 },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center', fontStyle: 'bold' },
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'left', cellWidth: 85 },
      },
    });

    doc.save(`Auditoria_Calibracion_Cuotas_${metric}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Calibración */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 rounded-xl p-5 shadow-xl space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              Auditoría de Calibración de Cuotas y Sesgos de Asignación
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
            Control Anti-Sesgo y Motivación Comercial
          </span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-4xl leading-relaxed">
          Esta auditoría evalúa si los supervisores asignaron metas comerciales justas y factibles. Compara la cuota de cada vendedor
          contra su promedio histórico real. Detecta tanto metas <strong className="text-red-400">sobrecargadas</strong> (riesgo de frustración y abandono)
          como metas <strong className="text-amber-400">subestimadas</strong> (zona de confort que frena el potencial de facturación).
        </p>
      </div>

      {/* KPI Cards de Calibración */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Equilibradas */}
        <div className="bg-zinc-950 border border-emerald-500/20 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Cuotas Equilibradas
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {((equilibradasCount / sellerRecords.length) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-3xl font-black font-mono text-white">
            {equilibradasCount} <span className="text-sm font-normal text-zinc-500">vendedores</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Crecimiento exigido entre 0% y +35% acorde a la capacidad del territorio.
          </p>
        </div>

        {/* Sobrecargadas */}
        <div className="bg-zinc-950 border border-red-500/20 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Cuotas Sobrecargadas (&gt;+35%)
            </span>
            <span className="font-mono text-red-400 font-bold">
              {((sobrecargadasCount / sellerRecords.length) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-3xl font-black font-mono text-red-400">
            {sobrecargadasCount} <span className="text-sm font-normal text-zinc-500">vendedores</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Riesgo de frustración; el supervisor exigió un salto irreal vs histórico.
          </p>
        </div>

        {/* Subestimadas */}
        <div className="bg-zinc-950 border border-amber-500/20 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" /> Cuotas Cómodas (&lt;0%)
            </span>
            <span className="font-mono text-amber-400 font-bold">
              {((subestimadasCount / sellerRecords.length) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-3xl font-black font-mono text-amber-400">
            {subestimadasCount} <span className="text-sm font-normal text-zinc-500">vendedores</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Meta por debajo del promedio histórico; margen para exigir mayor volumen.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-3 rounded-xl border border-white/10 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 font-bold">Supervisor:</span>
          <select
            value={selectedSupervisor}
            onChange={(e) => setSelectedSupervisor(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-bold focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todos los Supervisores ({sellerRecords.length})</option>
            <option value="JOHNATAN SOTO">Johnatan Soto ({sellerRecords.filter(s => s.supervisor === 'JOHNATAN SOTO').length})</option>
            <option value="ALI PEREZ">Ali Perez ({sellerRecords.filter(s => s.supervisor === 'ALI PEREZ').length})</option>
            <option value="NELSON FINOL">Nelson Finol ({sellerRecords.filter(s => s.supervisor === 'NELSON FINOL').length})</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-400 font-bold">Calibración:</span>
          <div className="inline-flex rounded-lg p-0.5 bg-zinc-900 border border-white/10">
            <button
              type="button"
              onClick={() => setFilterCalibracion('ALL')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                filterCalibracion === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterCalibracion('sobrecargada')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                filterCalibracion === 'sobrecargada' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sobrecargadas
            </button>
            <button
              type="button"
              onClick={() => setFilterCalibracion('subestimada')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                filterCalibracion === 'subestimada' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Subestimadas
            </button>
            <button
              type="button"
              onClick={() => setFilterCalibracion('equilibrada')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                filterCalibracion === 'equilibrada' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Equilibradas
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Exportar cuadro de calibración de cuotas filtrado a PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Tabla de Calibración */}
      <div className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px] text-xs">
            <thead>
              <tr className="bg-zinc-900 text-zinc-300 font-bold uppercase tracking-wider border-b border-white/10">
                <th className="p-3 border-r border-white/10 min-w-[200px]">Vendedor</th>
                <th className="p-3 border-r border-white/10 min-w-[140px]">Supervisor</th>
                <th className="p-2.5 text-center border-r border-white/10 min-w-[110px]">Promedio Histórico</th>
                <th className="p-2.5 text-center border-r border-white/10 min-w-[110px]">Cuota Asignada</th>
                <th className="p-2.5 text-center border-r border-white/10 min-w-[110px]">% Crecimiento Exigido</th>
                <th className="p-3 text-center border-r border-white/10 min-w-[140px]">Diagnóstico de Cuota</th>
                <th className="p-3 min-w-[220px]">Recomendación Regional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((row) => {
                const isOver = row.calibracionCuota === 'sobrecargada';
                const isUnder = row.calibracionCuota === 'subestimada';

                return (
                  <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-3 border-r border-white/10">
                      <span className="font-bold text-white block">{row.vendedor}</span>
                    </td>

                    <td className="p-3 border-r border-white/10 text-zinc-300 font-medium">
                      {row.supervisor}
                    </td>

                    <td className="p-2.5 text-center font-mono text-zinc-400 border-r border-white/10">
                      {formatAuditValue(row.promedioHistorico, metric)}
                    </td>

                    <td className="p-2.5 text-center font-mono font-bold text-white border-r border-white/10">
                      {formatAuditValue(row.meta, metric)}
                    </td>

                    <td className="p-2.5 text-center font-mono font-bold border-r border-white/10">
                      <span className={isOver ? 'text-red-400' : isUnder ? 'text-amber-400' : 'text-emerald-400'}>
                        {row.pctCrecimientoExigido >= 0 ? `+${row.pctCrecimientoExigido.toFixed(1)}%` : `${row.pctCrecimientoExigido.toFixed(1)}%`}
                      </span>
                    </td>

                    <td className="p-3 text-center border-r border-white/10">
                      {isOver ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          🚨 Sobrecargada
                        </span>
                      ) : isUnder ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          ⚠️ Subestimada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ Calibrada
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-zinc-300 text-[11px]">
                      {isOver && (
                        <span>
                          Exigencia muy alta vs histórico. El supervisor debe estructurar combos promocionales o moderar meta.
                        </span>
                      )}
                      {isUnder && (
                        <span>
                          Cuota holgada. Se sugiere incrementar cuota en rubros de mayor rotación (Pollo / Aceite).
                        </span>
                      )}
                      {!isOver && !isUnder && (
                        <span className="text-zinc-400">
                          Meta armónica y desafiante; alineada a la estacionalidad de la zona.
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
