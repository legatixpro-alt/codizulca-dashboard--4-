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
  selectedMonth: string,
  filterMetadata?: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fechaHora = new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
  const dimLabel = getParetoDimensionLabel(dimension);
  const metricLabel = getParetoMetricLabel(metric);
  const monthLabel = MONTH_LABELS[selectedMonth] || selectedMonth;

  const filteredSum = rows.reduce((acc, r) => acc + r.valor, 0);
  const filteredPct = rows.reduce((acc, r) => acc + r.pctIndividual, 0);
  const lastCumulativePct = rows.length > 0 ? rows[rows.length - 1].pctAcumulado : 0;

  // Franja institucional Codizulca
  doc.setFillColor(220, 38, 38);
  doc.rect(14, 10, 3.5, 16, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(`CODIZULCA C.A. - CUADRO GENERAL PARETO 80/20 (${dimLabel.toUpperCase()})`, 21, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Periodo: ${monthLabel}  |  Metrica: ${metricLabel}  |  Mostrando: ${rows.length} de ${summary?.totalEntities || rows.length} Entidades  |  Regla 80/20: Top ${summary?.paretoRatio || 0}% genera el 80%`,
    21,
    19.5
  );
  if (filterMetadata) {
    doc.setFontSize(7.5);
    doc.text(`Filtros Aplicados: ${filterMetadata}`, 21, 24);
  }

  doc.setFontSize(7.5);
  doc.text(`Generado: ${fechaHora}`, doc.internal.pageSize.width - 14, 14.5, { align: 'right' });
  if (insights) {
    doc.text(
      `Concentracion Top 5: ${insights.top5Pct}%  |  Riesgo: ${insights.concentrationLevel}`,
      doc.internal.pageSize.width - 14,
      19.5,
      { align: 'right' }
    );
  }

  const metricColTitle =
    metric === 'monto' ? 'TOTAL VENTAS ($)' : metric === 'cajas' ? 'TOTAL CAJAS' : 'TOTAL KILOS';

  let headRow: string[] = [];
  if (dimension === 'clientes') {
    headRow = [
      '#',
      'CLIENTE / RAZON SOCIAL',
      'CANAL',
      'VENDEDOR',
      'SUPERVISOR',
      metricColTitle,
      '% INDIV.',
      '% ACUM.',
      'CLASE ABC',
      'DIAGNOSTICO / INSIGHT',
    ];
  } else if (dimension === 'productos') {
    headRow = [
      '#',
      'ARTICULO / DESCRIPCION',
      'CODIGO',
      metricColTitle,
      '% INDIV.',
      '% ACUM.',
      'CLASE ABC',
      'DIAGNOSTICO / INSIGHT',
    ];
  } else if (dimension === 'vendedores') {
    headRow = [
      '#',
      'VENDEDOR',
      'SUPERVISOR',
      'ZONA',
      metricColTitle,
      '% INDIV.',
      '% ACUM.',
      'CLASE ABC',
      'DIAGNOSTICO / INSIGHT',
    ];
  } else if (dimension === 'zonas') {
    headRow = [
      '#',
      'ZONA COMERCIAL',
      'SUPERVISOR',
      'VENDEDORES',
      metricColTitle,
      '% INDIV.',
      '% ACUM.',
      'CLASE ABC',
      'DIAGNOSTICO / INSIGHT',
    ];
  } else {
    headRow = [
      '#',
      'CANAL DE DISTRIBUCION',
      'CLIENTES ACTIVOS',
      metricColTitle,
      '% INDIV.',
      '% ACUM.',
      'CLASE ABC',
      'DIAGNOSTICO / INSIGHT',
    ];
  }

  const body = rows.map((r) => {
    let estado = 'Estable';
    if (r.insightStatus === 'AT_RISK') {
      estado = r.dropPct ? `[EN RIESGO -${r.dropPct}%]` : '[EN RIESGO / SIN COMPRA]';
    } else if (r.insightStatus === 'GROWTH_OPPORTUNITY') {
      estado = '[POTENCIAL EN CRECIMIENTO]';
    } else if (r.insightStatus === 'TOP_ANCHOR' || r.ranking <= 10) {
      estado = '[CUENTA ANCLA TOP 10]';
    }

    const commonTail = [
      formatParetoValue(r.valor, metric),
      `${r.pctIndividual.toFixed(2)}%`,
      `${r.pctAcumulado.toFixed(1)}%`,
      `CLASE ${r.clasificacion}`,
      estado,
    ];

    if (dimension === 'clientes') {
      return [
        r.ranking,
        r.nombre,
        r.canal || 'GENERAL',
        r.secundario || '-',
        r.supervisor || '-',
        ...commonTail,
      ];
    }
    if (dimension === 'productos') {
      return [r.ranking, r.nombre, r.id || '-', ...commonTail];
    }
    if (dimension === 'vendedores') {
      return [r.ranking, r.nombre, r.supervisor || '-', r.zona || '-', ...commonTail];
    }
    if (dimension === 'zonas') {
      return [r.ranking, r.nombre, r.supervisor || '-', r.terciario || '-', ...commonTail];
    }
    return [r.ranking, r.nombre, r.secundario || '-', ...commonTail];
  });

  const middleEmptyCols =
    dimension === 'clientes'
      ? ['', '', '']
      : dimension === 'vendedores' || dimension === 'zonas'
      ? ['', '']
      : [''];

  const foot = [
    [
      'TOTAL',
      `${rows.length} Registros Exportados`,
      ...middleEmptyCols,
      formatParetoValue(filteredSum, metric),
      `${Math.min(100, filteredPct).toFixed(1)}%`,
      `${Math.min(100, lastCumulativePct).toFixed(1)}%`,
      '',
      '',
    ],
  ];

  const valColIdx = 2 + middleEmptyCols.length;
  const columnStyles: Record<number, any> = {
    0: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
    1: { halign: 'left', cellWidth: dimension === 'clientes' ? 62 : 75 },
    [valColIdx]: { halign: 'right', fontStyle: 'bold' },
    [valColIdx + 1]: { halign: 'right' },
    [valColIdx + 2]: { halign: 'right', fontStyle: 'bold' },
    [valColIdx + 3]: { halign: 'center', fontStyle: 'bold' },
    [valColIdx + 4]: { halign: 'center', fontSize: 6.5 },
  };

  autoTable(doc, {
    startY: filterMetadata ? 27 : 25,
    head: [headRow],
    body,
    foot,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.4,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    footStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    didDrawPage: (dataInfo) => {
      const str = `Pagina ${dataInfo.pageNumber} de ${doc.getNumberOfPages()}`;
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

