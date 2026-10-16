export type RegionalAuditTab = 
  | 'matriz_auditoria' 
  | 'scorecards' 
  | 'calibracion_cuotas' 
  | 'actas_compromisos' 
  | 'consolidado_volumen';

export type AuditRiskLevel = 'verde' | 'amarillo' | 'rojo';

export type SupervisorAuditStatus = 'en_norma' | 'observacion' | 'alerta_critica';

export type FieldSupervisionLevel = 'frecuente' | 'regular' | 'deficiente' | 'sin_registro';

export type CommitmentStatus = 'pendiente' | 'en_ejecucion' | 'cumplido';

export type RegionalAuditMetric = 'monto' | 'cajas' | 'kgs';

export interface SellerAuditRecord {
  id: string;
  vendedor: string;
  supervisor: string;
  zona: string;
  region: string;
  
  // Metas y Real
  meta: number;
  real: number;
  pctCumplimiento: number;
  pctMetaAlDia: number; // vs meta al día (73.1%)
  proyectadoEOM: number;
  pctProyectado: number;
  brecha: number;
  ritmoDiarioNecesario: number;
  
  // Auditoría del Supervisor con este Vendedor
  riskLevel: AuditRiskLevel;
  diasUltimaSupervision: number; // Días transcurridos desde último acompañamiento
  fechaUltimaSupervision: string;
  frecuenciaSupervision: FieldSupervisionLevel;
  calificacionAcompanamiento: number; // 1 a 5 estrellas
  causaRaizDesviacion?: string;
  hallazgoAuditoria?: string;
  dictamenGerente?: string;
  
  // Datos históricos para calibración de cuotas
  promedioHistorico: number;
  pctCrecimientoExigido: number;
  calibracionCuota: 'equilibrada' | 'subestimada' | 'sobrecargada';
  
  // Cobertura de rubros (activados vs meta)
  rubrosActivados: number;
  rubrosMeta: number;
}

export interface SupervisorScorecardData {
  supervisor: string;
  region: string;
  sellersCount: number;
  
  // Totales
  metaTotal: number;
  realTotal: number;
  pctCumplimientoTotal: number;
  proyectadoEOMTotal: number;
  pctProyectadoTotal: number;
  brechaTotal: number;
  
  // Índices de Auditoría
  healthScore: number; // 0 a 100
  auditStatus: SupervisorAuditStatus;
  
  // Distribución de Vendedores
  vendedoresEnMeta: number;      // >= 100%
  vendedoresEnRiesgo: number;    // 75% - 99%
  vendedoresCriticos: number;    // < 75%
  
  // Dispersión / Desigualdad del Equipo
  indiceDispersion: number; // % aportado por los 3 mejores vendedores
  alertaConcentracion: boolean;
  
  // Acompañamiento en Ruta
  tasaAcompanamientoRuta: number; // % vendedores con supervisión reciente
  promedioDiasSinAcompanamiento: number;
  vendedoresDesatendidos: number; // > 15 días sin supervisión
  
  // Calificación del Gerente
  calificacionGerente: number; // 1 a 5
  observacionGerente: string;
  compromisosPendientes: number;
}

export interface AuditCommitment {
  id: string;
  folio: string;
  fechaCreacion: string;
  supervisor: string;
  vendedor: string;
  zona: string;
  tipoHallazgo: string;
  descripcionCompromiso: string;
  accionesRequeridas: string;
  fechaLimite: string;
  estado: CommitmentStatus;
  gerenteAutoriza: string;
  prioridad: 'alta' | 'media' | 'urgente';
  fechaResolucion?: string;
  notasSeguimiento?: string;
}

export interface RegionalAuditSummaryKPIs {
  metaRegional: number;
  realRegional: number;
  pctCumplimientoRegional: number;
  proyectadoRegional: number;
  pctProyectadoRegional: number;
  brechaRegional: number;
  
  promedioHealthScore: number;
  totalVendedores: number;
  totalVendedoresEnMeta: number;
  totalVendedoresEnRiesgo: number;
  totalVendedoresCriticos: number;
  
  coberturaAcompanamientoGlobal: number;
  totalCompromisosActivos: number;
  totalCompromisosCumplidos: number;
}
