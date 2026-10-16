import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ParetoRowItem,
  ParetoSummaryStats,
  ParetoInsightsData,
  ParetoDimension,
  ParetoMetric,
  MONTH_LABELS
} from './paretoTypes';

// Formateador numérico
export const formatParetoValue = (val: number, metric: ParetoMetric): string => {
  if (metric === 'monto') {
    return '$' + Math.round(val).toLocaleString('es-VE');
  }
  return Math.round(val).toLocaleString('es-VE');
};

export const getParetoMetricLabel = (metric: ParetoMetric): string => {
  if (metric === 'cajas') return 'Bultos (Cajas)';
  if (metric === 'kgs') return 'Kilos (Kg)';
  return 'Ventas Netas ($ USD)';
};

export const getParetoDimensionLabel = (dim: ParetoDimension): string => {
  if (dim === 'clientes') return 'Clientes (Cartera)';
  if (dim === 'productos') return 'Productos / SKUs';
  if (dim === 'vendedores') return 'Fuerza de Ventas';
  if (dim === 'zonas') return 'Zonas Comerciales';
  return 'Canales de Venta';
};

/**
 * EXPORTACIÓN A EXCEL MULTI-HOJA (.XLSX) - OPCIÓN 5
 */
export const exportParetoToExcel = (
  rows: ParetoRowItem[],
  summary: ParetoSummaryStats | null,
  insights: ParetoInsightsData | null,
  dimension: ParetoDimension,
  metric: ParetoMetric,
  selectedMonth: string
) => {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().slice(0, 10);
  const metricLabel = getParetoMetricLabel(metric);
  const dimLabel = getParetoDimensionLabel(dimension);
  const monthLabel = MONTH_LABELS[selectedMonth] || selectedMonth;

  // ==========================================
  // HOJA 1: RESUMEN EJECUTIVO Y RATIOS
  // ==========================================
  const summaryData = [
    { Parámetro: 'Empresa', Valor: 'CODIZULCA C.A.' },
    { Parámetro: 'Reporte', Valor: `Análisis de Pareto 80/20 (${dimLabel})` },
    { Parámetro: 'Período', Valor: monthLabel },
    { Parámetro: 'Métrica Evaluada', Valor: metricLabel },
    { Parámetro: 'Fecha de Generación', Valor: new Date().toLocaleString('es-VE') },
    { Parámetro: '', Valor: '' },
    { Parámetro: '--- TOTALES GENERALES ---', Valor: '' },
    { Parámetro: 'Total Entidades Analizadas', Valor: summary?.totalEntities || 0 },
    { Parámetro: `Total Acumulado (${metricLabel})`, Valor: summary?.totalSum ? Math.round(summary.totalSum) : 0 },
    { Parámetro: '', Valor: '' },
    { Parámetro: '--- DISTRIBUCIÓN ABC (PARETO) ---', Valor: '' },
    { Parámetro: 'Clase A (Pocos Vitales - 80%)', Valor: `${summary?.countA || 0} entidades (${summary?.paretoRatio || 0}% del universo)` },
    { Parámetro: 'Volumen Generado por Clase A', Valor: `${summary?.valuePctA || 0}% (${summary?.valueA ? Math.round(summary.valueA) : 0})` },
    { Parámetro: 'Clase B (En Desarrollo - 15%)', Valor: `${summary?.countB || 0} entidades` },
    { Parámetro: 'Volumen Generado por Clase B', Valor: `${summary?.valuePctB || 0}% (${summary?.valueB ? Math.round(summary.valueB) : 0})` },
    { Parámetro: 'Clase C (Cola Larga - 5%)', Valor: `${summary?.countC || 0} entidades` },
    { Parámetro: 'Volumen Generado por Clase C', Valor: `${summary?.valuePctC || 0}% (${summary?.valueC ? Math.round(summary.valueC) : 0})` },
    { Parámetro: '', Valor: '' },
    { Parámetro: '--- RATIOS DE CONCENTRACIÓN Y RIESGO ---', Valor: '' },
    { Parámetro: 'Concentración Top 1', Valor: `${insights?.top1Pct || 0}%` },
    { Parámetro: 'Concentración Top 3', Valor: `${insights?.top3Pct || 0}%` },
    { Parámetro: 'Concentración Top 5', Valor: `${insights?.top5Pct || 0}%` },
    { Parámetro: 'Concentración Top 10', Valor: `${insights?.top10Pct || 0}%` },
    { Parámetro: 'Nivel de Riesgo de Concentración', Valor: insights?.concentrationLevel || 'NORMAL' },
    { Parámetro: 'Diagnóstico Comercial', Valor: insights?.concentrationDescription || '' },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Ejecutivo');

  // ==========================================
  // HOJA 2: RANKING COMPLETO DE ENTIDADES
  // ==========================================
  const rankingData = rows.map((r) => {
    let estado = 'Normal';
    if (r.insightStatus === 'AT_RISK') estado = `En Riesgo (${r.dropPct ? `-${r.dropPct}%` : 'Inactivo'})`;
    else if (r.insightStatus === 'GROWTH_OPPORTUNITY') estado = 'Oportunidad de Crecimiento (Acelerando)';
    else if (r.insightStatus === 'TOP_ANCHOR') estado = 'Cuenta Ancla (Top 10)';

    return {
      'Ranking #': r.ranking,
      'ID / Código': r.id,
      'Nombre / Razón Social': r.nombre,
      'Canal': r.canal || 'GENERAL',
      'Vendedor': r.secundario || '',
      'Supervisor': r.supervisor || '',
      'Zona Comercial': r.zona || '',
      'Región': r.region || 'OCCIDENTE',
      [`Valor (${metricLabel})`]: Math.round(r.valor),
      '% Individual': parseFloat(r.pctIndividual.toFixed(2)),
      '% Acumulado': parseFloat(r.pctAcumulado.toFixed(2)),
      'Clasificación ABC': `CLASE ${r.clasificacion}`,
      'Diagnóstico / Riesgo': estado,
    };
  });

  const wsRanking = XLSX.utils.json_to_sheet(rankingData);
  XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking Completo');

  // ==========================================
  // HOJA 3: PLAN DE ACCIÓN OPERATIVA (CLASE A + EN RIESGO)
  // ==========================================
  const actionPlanData = rows
    .filter((r) => r.clasificacion === 'A' || r.insightStatus === 'AT_RISK')
    .map((r) => ({
      'Prioridad': r.insightStatus === 'AT_RISK' ? '1 - URGENTE (Rescate)' : '2 - ALTA (Blindaje VIP)',
      'Ranking #': r.ranking,
      'Cliente / Entidad': r.nombre,
      'Supervisor': r.supervisor || 'Por Asignar',
      'Vendedor': r.secundario || 'Por Asignar',
      'Zona': r.zona || '',
      'Canal': r.canal || 'GENERAL',
      [`Valor Registrado (${metricLabel})`]: Math.round(r.valor),
      'Clase ABC': `CLASE ${r.clasificacion}`,
      'Diagnóstico': r.insightStatus === 'AT_RISK' ? `Caída detectada (${r.dropPct ? `-${r.dropPct}%` : 'Sin compra'})` : 'Cuenta VIP Vital',
      'Acción Comercial Sugerida': r.insightStatus === 'AT_RISK'
        ? 'Visita inmediata de Supervisión para identificar causas y reactivar pedidos'
        : 'Mantener seguimiento semanal, prioridad de despacho y condiciones de crédito',
      'Visita Realizada (Sí/No)': '',
      'Fecha de Contacto': '',
      'Compromiso de Pedido': '',
      'Observaciones de Campo': '',
    }));

  const wsAction = XLSX.utils.json_to_sheet(actionPlanData);
  XLSX.utils.book_append_sheet(wb, wsAction, 'Plan de Acción Operativa');

  // Guardar archivo
  XLSX.writeFile(wb, `Codizulca_Pareto_${dimension.toUpperCase()}_${metric.toUpperCase()}_${dateStr}.xlsx`);
};

/**
 * EXPORTACIÓN A PDF INSTITUCIONAL - OPCIÓN 5
 */
export const exportParetoToPDF = (
  rows: ParetoRowItem[],
  summary: ParetoSummaryStats | null,
  insights: ParetoInsightsData | null,
  dimension: ParetoDimension,
  metric: ParetoMetric,
  selectedMonth: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fechaHora = new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
  const dimLabel = getParetoDimensionLabel(dimension);
  const metricLabel = getParetoMetricLabel(metric);
  const monthLabel = MONTH_LABELS[selectedMonth] || selectedMonth;

  // Franja institucional Codizulca
  doc.setFillColor(220, 38, 38);
  doc.rect(14, 10, 3.5, 14, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(`CODIZULCA C.A. - ANÁLISIS DE CONCENTRACIÓN PARETO 80/20 (${dimLabel.toUpperCase()})`, 21, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Período: ${monthLabel}  |  Métrica: ${metricLabel}  |  Universo: ${summary?.totalEntities || 0} Entidades  |  Regla 80/20: Top ${summary?.paretoRatio || 0}% genera el 80%`,
    21,
    21
  );

  doc.setFontSize(7.5);
  doc.text(`Generado: ${fechaHora}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });
  if (insights) {
    doc.text(
      `Concentración Top 5: ${insights.top5Pct}%  |  Riesgo: ${insights.concentrationLevel}`,
      doc.internal.pageSize.width - 14,
      21,
      { align: 'right' }
    );
  }

  // Estructura de tabla
  const head = [
    ['#', 'ENTIDAD / RAZÓN SOCIAL', 'CANAL / VENDEDOR', 'SUPERVISOR', 'VALOR', '% IND.', '% ACUM.', 'CLASE', 'ESTADO'],
  ];

  const body = rows.slice(0, 350).map((r) => {
    let estado = 'Normal';
    if (r.insightStatus === 'AT_RISK') estado = '🚨 En Riesgo';
    else if (r.insightStatus === 'GROWTH_OPPORTUNITY') estado = '🚀 Potencial';
    else if (r.insightStatus === 'TOP_ANCHOR') estado = '⭐ Top 10';

    return [
      r.ranking,
      r.nombre,
      r.canal ? `${r.canal} - ${r.secundario || ''}` : r.secundario || '-',
      r.supervisor || '-',
      formatParetoValue(r.valor, metric),
      `${r.pctIndividual.toFixed(2)}%`,
      `${r.pctAcumulado.toFixed(2)}%`,
      `CLASE ${r.clasificacion}`,
      estado,
    ];
  });

  const foot = [
    [
      'TOTAL',
      `${summary?.totalEntities || 0} Entidades`,
      '',
      '',
      formatParetoValue(summary?.totalSum || 0, metric),
      '100.0%',
      '100.0%',
      '',
      '',
    ],
  ];

  autoTable(doc, {
    startY: 26,
    head,
    body,
    foot,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.4,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'left', cellWidth: 45 },
      3: { halign: 'left', cellWidth: 35 },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'center', fontStyle: 'bold' },
      8: { halign: 'center', fontSize: 6.5 },
    },
    didDrawPage: (dataInfo) => {
      const str = `Página ${dataInfo.pageNumber} de ${doc.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Codizulca C.A. - Documento Confidencial de Control Comercial y Despacho Prioritario',
        14,
        doc.internal.pageSize.height - 7
      );
      doc.text(str, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 7, { align: 'right' });
    },
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Codizulca_Pareto_${dimension.toUpperCase()}_${metric.toUpperCase()}_${dateStr}.pdf`);
};
