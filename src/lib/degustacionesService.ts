/**
 * Servicio Centralizado de Degustaciones y Solicitudes de Campo
 * Conecta las Solicitudes de Degustación enviadas por los Vendedores desde su App Móvil
 * con la Coordinación de Trade Marketing y la App de Promotoras.
 */

export interface DegustacionItem {
  id: string;
  date: string;       // Formato DD/MM/YYYY
  time: string;       // Formato "14:00 - 18:00" o "09:00 - 13:00"
  activity: string;   // Nombre de la actividad
  product: string;    // SKU / Producto a degustar
  promoter: string;   // Promotora asignada por Trade Marketing
  promoterRole: 'Promotora' | 'Impulsadora' | 'Promotor Merchandising';
  client: string;     // Nombre del Punto de Venta (PDV) / Cliente
  zone: string;       // Zona comercial o ruta
  vendedor: string;   // VENDEDOR COMERCIAL QUE ENVIÓ LA SOLICITUD DESDE SU APP MÓVIL
  source: 'vendedor_app' | 'coordinacion' | 'sistema';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  delivered: number;  // Muestras entregadas
  target: number;     // Meta de degustaciones / personas estimadas
  acceptanceRate: number; // % de aceptación del consumidor
  comments?: string;  // Contacto en tienda, notas del vendedor y requerimientos
}

const STORAGE_KEY = 'codizulca_cronograma_degustaciones_v5';
const EVENT_NAME = 'codizulca_degustaciones_updated';

// 40 Solicitudes de Degustación REALES enviadas por los Vendedores desde su App Móvil
export const DEFAULT_DEGUSTACIONES: DegustacionItem[] = [
  {
    "id": "DEG-deg-mv5dyd1g-c38c",
    "date": "17/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "MULTITIENDAS FARMAPLUS GRAN BAZAR, C.A",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Jonathan Monson (+58 412-1258754). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5dz7m6-z3jf",
    "date": "17/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "FIORELLA SUPER MARKET. C.A.",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Georgina (+58 412-6525192). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5e0ab0-lb79",
    "date": "17/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "SUPERMARKET FIORELLA EXPRESS, C.A.",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Niccio (+58 424-6371588). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5dq1ig-kg1z",
    "date": "16/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA, ESTANDAR - Solicitada por CARLOS FUENMAYOR",
    "product": "MORTADELA, ESTANDAR",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "INVERSIONES EL ARABITO, C.A",
    "zone": "CARLOS FUENMAYOR",
    "vendedor": "CARLOS FUENMAYOR",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Anais (04121149080). En el área de charcutería en la parte trasera"
  },
  {
    "id": "DEG-deg-mv5dvzbd-owbd",
    "date": "16/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "FARMAPLUS MILAGRO NORTE",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Angelica (+58 424-6088218). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5dx6c0-8hch",
    "date": "16/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "FARMAPLUS CECILIO ACOSTA, C.A",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Angelica (+58 424-6088218). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5dsiix-1lqn",
    "date": "15/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA, AHUMADO - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA, AHUMADO",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "MULTITIENDAS FARMAPLUS C.A.",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Cristy Maldonado (04126517364). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv59u9ou-vimg",
    "date": "15/10/2026",
    "time": "04:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por JUAN HERNÁNDEZ",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "RAFITO MARKET, C.A",
    "zone": "Ruta Comercial",
    "vendedor": "JUAN HERNÁNDEZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Agendada por JUAN HERNÁNDEZ. Kilos: 1. Personas: 150."
  },
  {
    "id": "DEG-deg-mv59wkkt-7g9p",
    "date": "15/10/2026",
    "time": "04:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por JUAN HERNÁNDEZ",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "LOS PIPOS MIS 3 REINA, C.A",
    "zone": "Ruta Comercial",
    "vendedor": "JUAN HERNÁNDEZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Agendada por JUAN HERNÁNDEZ. Kilos: 1. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5dr0nf-eck4",
    "date": "15/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA, AHUMADO - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA, AHUMADO",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "FARMAEXPRESS C2, C.A",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Santiago (04127636204). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5byjs0-royj",
    "date": "15/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación ARROZ CON LECHE - Solicitada por MARÍA BRICEÑO",
    "product": "ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "ASOCIACION COOPERATIVA DON LUCHO R.S",
    "zone": "Ruta Comercial",
    "vendedor": "MARÍA BRICEÑO",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Agendada por MARÍA BRICEÑO. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-mv5dovja-mu66",
    "date": "15/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación ESPALDA, MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "ESPALDA, MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "MULTITIENDA FARMAEXPRESS DELICIAS, C.A.",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Carlos (+58 414-6604786). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvc970t-j8js",
    "date": "10/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación ARROZ CON LECHE - Solicitada por CARLOS FUENMAYOR",
    "product": "ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "INVERSIONES EL ARABITO, C.A",
    "zone": "CARLOS FUENMAYOR",
    "vendedor": "CARLOS FUENMAYOR",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Anais (04121149080). Agendada por CARLOS FUENMAYOR. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvd7v69-u4ku",
    "date": "10/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "MULTITIENDAS FARMAPLUS C.A.",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Cristy Maldonado (+58 412-6517364). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvce2e7-mhak",
    "date": "10/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA, SUPERIOR - Solicitada por CARLOS FUENMAYOR",
    "product": "MORTADELA, SUPERIOR",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "INVERSIONES W & E DE LA MANO DE DIOS C.A",
    "zone": "CARLOS FUENMAYOR",
    "vendedor": "CARLOS FUENMAYOR",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Endri esos (04126508112). Agendada por CARLOS FUENMAYOR. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvcd15e-i0p3",
    "date": "10/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación ESTANDAR, MORTADELA - Solicitada por CARLOS FUENMAYOR",
    "product": "ESTANDAR, MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "INVERSIONES B&H 2024, C.A",
    "zone": "CARLOS FUENMAYOR",
    "vendedor": "CARLOS FUENMAYOR",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: José Briceño (04246403704). Agendada por CARLOS FUENMAYOR. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvc5i9d-hz21",
    "date": "10/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA, ESTANDAR - Solicitada por OSWALDO CHURIÓN",
    "product": "MORTADELA, ESTANDAR",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "COMERCIALIZADORA FC",
    "zone": "OSWALDO CHURION",
    "vendedor": "OSWALDO CHURIÓN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Kelly (04220054996). Agendada por OSWALDO CHURIÓN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muva4u2u-nta3",
    "date": "10/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA, AHUMADO - Solicitada por OSWALDO CHURIÓN",
    "product": "MORTADELA, AHUMADO",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "INVERSIONES Y DISTRIBUIDORA TORRES VARGAS,C.A",
    "zone": "OSWALDO CHURION",
    "vendedor": "OSWALDO CHURIÓN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Emiro (04246574988). Ninguna"
  },
  {
    "id": "DEG-deg-muva220m-08ih",
    "date": "10/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARÍA BRICEÑO",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "MINIMARKET I&F, C.A.",
    "zone": "MARIA BRICEÑO",
    "vendedor": "MARÍA BRICEÑO",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Karla Araujo (04123353597). Agendada por MARÍA BRICEÑO. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvcbbfg-l0e0",
    "date": "10/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación ARROZ CON LECHE - Solicitada por HERNÁN PAZ",
    "product": "ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "FAMOSO HIPERMERCADO, C.A",
    "zone": "HERNAN PAZ",
    "vendedor": "HERNÁN PAZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 50,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Ismelda (412-5561826). Agendada por HERNÁN PAZ. Kilos: 1. Personas: 50."
  },
  {
    "id": "DEG-deg-muvc52zj-mjpk",
    "date": "09/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación AHUMADO, ARROZ CON LECHE - Solicitada por HERNÁN PAZ",
    "product": "AHUMADO, ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "SUPERMARKET J.D EXPRESS, C.A",
    "zone": "HERNAN PAZ",
    "vendedor": "HERNÁN PAZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Erasmo (412-6778467). Agendada por HERNÁN PAZ. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvca4r1-vmfe",
    "date": "09/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA, ESTANDAR - Solicitada por OSWALDO CHURIÓN",
    "product": "MORTADELA, ESTANDAR",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "COMERCIALIZADORA FC",
    "zone": "OSWALDO CHURION",
    "vendedor": "OSWALDO CHURIÓN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Kelly (04220054996). Agendada por OSWALDO CHURIÓN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvc7wdd-l954",
    "date": "09/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA, ESTANDAR - Solicitada por CARLOS FUENMAYOR",
    "product": "MORTADELA, ESTANDAR",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "INVERSIONES EL ARABITO, C.A",
    "zone": "CARLOS FUENMAYOR",
    "vendedor": "CARLOS FUENMAYOR",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Anais (04121149080). Agendada por CARLOS FUENMAYOR. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muv7onr5-15pf",
    "date": "09/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por SAIRÚ VALLES",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "CREA DESARROLLOS, S.A.",
    "zone": "CUENTAS CLAVE 2",
    "vendedor": "SAIRÚ VALLES",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Endrina (04246306317). Agendada por SAIRÚ VALLES. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muv8vqcv-1ak0",
    "date": "09/10/2026",
    "time": "05:00 PM - 08:00 PM",
    "activity": "Degustación ESPALDA - Solicitada por MARÍA BRICEÑO",
    "product": "ESPALDA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "SUPER TIENDA LA POPULAR 2024, C.A",
    "zone": "MARIA BRICEÑO",
    "vendedor": "MARÍA BRICEÑO",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Koki (04126856480). Se necesita sacar el producto debido que hubo duplicidad del pedido"
  },
  {
    "id": "DEG-deg-muveyeuj-n29s",
    "date": "09/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación ARROZ CON LECHE - Solicitada por SAIRÚ VALLES",
    "product": "ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "MEGA 72, C.A.",
    "zone": "CUENTAS CLAVE 2",
    "vendedor": "SAIRÚ VALLES",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Yair (04246584663). Agendada por SAIRÚ VALLES. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvdc1je-yjgd",
    "date": "09/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por MARIANA CHACÍN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "MULTITIENDA FARMAEXPRESS FUERZAS ARMADAS, C.A.",
    "zone": "CUENTAS CLAVE 1",
    "vendedor": "MARIANA CHACÍN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Arelis Primera (+58 412-6634697). Agendada por MARIANA CHACÍN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvcb7lc-xeon",
    "date": "09/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación ESTANDAR, MORTADELA - Solicitada por CARLOS FUENMAYOR",
    "product": "ESTANDAR, MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "COSECHA SUPER MARKET, C.A",
    "zone": "CARLOS FUENMAYOR",
    "vendedor": "CARLOS FUENMAYOR",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Dioni (04120737659). Agendada por CARLOS FUENMAYOR. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvc8cy7-gned",
    "date": "09/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por SAIRÚ VALLES",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "FAMILIA CENTER, C.A.",
    "zone": "CUENTAS CLAVE 2",
    "vendedor": "SAIRÚ VALLES",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Jose (+58 412-8037152). Agendada por SAIRÚ VALLES. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muv7sc2i-9bgr",
    "date": "09/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por SAIRÚ VALLES",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "ALKOSTO DONDE COMPRAR ES GANAR, C.A.",
    "zone": "CUENTAS CLAVE 2",
    "vendedor": "SAIRÚ VALLES",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Randy (04126423231). Agendada por SAIRÚ VALLES. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvahcji-7ols",
    "date": "09/10/2026",
    "time": "05:00 PM - 08:00 PM",
    "activity": "Degustación ARROZ CON LECHE - Solicitada por MARÍA BRICEÑO",
    "product": "ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "NRES, C.A.",
    "zone": "MARIA BRICEÑO",
    "vendedor": "MARÍA BRICEÑO",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Elizabeth (04246502131). Agendada por MARÍA BRICEÑO. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-murfx3fa-oc64",
    "date": "08/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por HERNÁN PAZ",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "SUPER TIENDA EL BOSQUE , C.A",
    "zone": "HERNAN PAZ",
    "vendedor": "HERNÁN PAZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 100,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: ROSA (+58 412-6714484). Agendada por HERNÁN PAZ. Kilos: 3. Personas: 100."
  },
  {
    "id": "DEG-deg-muvc3qcn-feui",
    "date": "08/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA, ESTANDAR - Solicitada por OSWALDO CHURIÓN",
    "product": "MORTADELA, ESTANDAR",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "COMERCIALIZADORA FC",
    "zone": "OSWALDO CHURION",
    "vendedor": "OSWALDO CHURIÓN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Kelly (04220054996). Agendada por OSWALDO CHURIÓN. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvc386b-s054",
    "date": "08/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación ARROZ CON LECHE - Solicitada por HERNÁN PAZ",
    "product": "ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "SUPER MARKET A&G, C.A.",
    "zone": "HERNAN PAZ",
    "vendedor": "HERNÁN PAZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Andrés (424-6276667). Agendada por HERNÁN PAZ. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muv8t2ki-lp1e",
    "date": "08/10/2026",
    "time": "06:00 PM - 08:00 PM",
    "activity": "Degustación ARROZ CON LECHE - Solicitada por MARÍA BRICEÑO",
    "product": "ARROZ CON LECHE",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "COMERCIAL NATHAN J&E, C.A",
    "zone": "MARIA BRICEÑO",
    "vendedor": "MARÍA BRICEÑO",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Edward Espinoza (04126694771). Agendada por MARÍA BRICEÑO. Kilos: 5. Personas: 150."
  },
  {
    "id": "DEG-deg-muvb8p40-lgdx",
    "date": "08/10/2026",
    "time": "04:00PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por JUAN HERNÁNDEZ",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "J&L MARKET 1, C.A",
    "zone": "JUAN HERNANDEZ",
    "vendedor": "JUAN HERNÁNDEZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Lisbeth (4246572709). Agendada por JUAN HERNÁNDEZ. Kilos: 2. Personas: 150."
  },
  {
    "id": "DEG-deg-muvc8g9u-62w5",
    "date": "08/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación AHUMADO - Solicitada por HERNÁN PAZ",
    "product": "AHUMADO",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "AUTOMERCADO LA ABUELA, C.A.",
    "zone": "Ruta Comercial",
    "vendedor": "HERNÁN PAZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 50,
    "acceptanceRate": 0,
    "comments": "Agendada por HERNÁN PAZ. Kilos: 1. Personas: 50."
  },
  {
    "id": "DEG-deg-muv73qv4-r2b1",
    "date": "08/10/2026",
    "time": "02:00 PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por SAIRÚ VALLES",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "ALKOSTO DONDE COMPRAR ES GANAR, C.A.",
    "zone": "CUENTAS CLAVE 2",
    "vendedor": "SAIRÚ VALLES",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Sra Roxana (04121312610). Agendada por SAIRÚ VALLES. Kilos: 6. Personas: 150."
  },
  {
    "id": "DEG-deg-muvb70vm-mlhn",
    "date": "08/10/2026",
    "time": "04:00PM - 07:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por JUAN HERNÁNDEZ",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "RAFITO MARKET, C.A",
    "zone": "JUAN HERNANDEZ",
    "vendedor": "JUAN HERNÁNDEZ",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Kathy (04146384646). Agendada por JUAN HERNÁNDEZ. Kilos: 2. Personas: 150."
  },
  {
    "id": "DEG-deg-muvc8546-3ui1",
    "date": "08/10/2026",
    "time": "09:00 AM - 01:00 PM",
    "activity": "Degustación MORTADELA - Solicitada por OSWALDO CHURIÓN",
    "product": "MORTADELA",
    "promoter": "POR ASIGNAR (Trade Marketing)",
    "promoterRole": "Impulsadora",
    "client": "VARIEDADES Y DISTRIBUIDORA BRAYAN, C.A",
    "zone": "OSWALDO CHURION",
    "vendedor": "OSWALDO CHURIÓN",
    "source": "vendedor_app",
    "status": "scheduled",
    "delivered": 0,
    "target": 150,
    "acceptanceRate": 0,
    "comments": "Contacto en tienda: Brayan (04124797542). Agendada por OSWALDO CHURIÓN. Kilos: 5. Personas: 150."
  }
];

/**
 * Comparador robusto de nombres de promotoras (insensible a mayúsculas, acentos, espacios y stopwords)
 */
export function matchPromoterName(nameA: string, nameB: string): boolean {
  const clean = (s: string) =>
    (s || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const a = clean(nameA);
  const b = clean(nameB);

  if (!a || !b) return false;
  if (a.includes('POR ASIGNAR') || b.includes('POR ASIGNAR')) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // Comparación por tokens significativos (eliminando preposiciones y artículos comunes)
  const stopWords = new Set(['DE', 'DEL', 'LOS', 'LAS', 'LA', 'Y', 'EL']);
  const tokensA = a.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  const tokensB = b.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  return shorter.every((token) => longer.includes(token));
}

export const degustacionesService = {
  /**
   * Obtiene la lista completa de degustaciones sincronizada con el backend y localStorage
   */
  async getDegustacionesAsync(): Promise<DegustacionItem[]> {
    try {
      const res = await fetch('/api/degustaciones');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.saveDegustaciones(data);
          return data;
        }
      }
    } catch (e) {
      // offline fallback
    }
    return this.getDegustaciones();
  },

  /**
   * Obtiene la lista de degustaciones de forma síncrona
   */
  getDegustaciones(): DegustacionItem[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Limpiar versiones anteriores con datos ficticios
        localStorage.removeItem('codizulca_cronograma_degustaciones');
        localStorage.removeItem('codizulca_cronograma_degustaciones_v2');
        localStorage.removeItem('codizulca_cronograma_degustaciones_v3');
        localStorage.removeItem('codizulca_cronograma_degustaciones_v4');

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
            const validItems = parsed.filter((p: any) => p && typeof p === 'object' && p.id);
            if (validItems.length > 0) {
              // Verificar si contiene datos ficticios eliminados (como DEG-2026-W4-...)
              const hasFictitious = validItems.some((p: DegustacionItem) =>
                p.id?.includes('DEG-2026-W4-') ||
                p.activity?.includes('Gran Impulso Mortadela Tapara') ||
                p.promoter === 'Maria Gonzalez' ||
                p.promoter === 'Ana Silva'
              );
              if (!hasFictitious) {
                return validItems;
              }
            }
        }
      }
    } catch (e) {
      console.warn('[degustacionesService] Error leyendo localStorage, usando reales:', e);
    }

    // Inicializar con las solicitudes reales de los vendedores
    this.saveDegustaciones(DEFAULT_DEGUSTACIONES);
    return DEFAULT_DEGUSTACIONES;
  },

  /**
   * Guarda y notifica en vivo a todos los componentes y pestañas
   */
  saveDegustaciones(items: DegustacionItem[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { items } }));
      }
    } catch (e) {
      console.error('[degustacionesService] Error guardando degustaciones:', e);
    }
  },

  /**
   * Restaura el cronograma a los valores oficiales por defecto y notifica
   */
  resetToDefaults(): DegustacionItem[] {
    this.saveDegustaciones(DEFAULT_DEGUSTACIONES);
    return DEFAULT_DEGUSTACIONES;
  },

  /**
   * Agrega una nueva solicitud de degustación enviada por un vendedor o coordinadora
   */
  async addDegustacion(item: DegustacionItem): Promise<void> {
    const current = this.getDegustaciones();
    const updated = [item, ...current];
    this.saveDegustaciones(updated);

    try {
      if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
        await fetch(`${window.location.origin}/api/degustaciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
    } catch (e) {
      console.warn('[degustacionesService] Error sincronizando con API:', e);
    }
  },

  /**
   * Actualiza una degustación existente
   */
  async updateDegustacion(updatedItem: DegustacionItem): Promise<void> {
    const current = this.getDegustaciones();
    const updated = current.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    this.saveDegustaciones(updated);

    try {
      if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
        await fetch(`${window.location.origin}/api/degustaciones/${encodeURIComponent(updatedItem.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItem)
        });
      }
    } catch (e) {
      console.warn('[degustacionesService] Error sincronizando PUT con API:', e);
    }
  },

  /**
   * Elimina una degustación
   */
  async deleteDegustacion(id: string): Promise<void> {
    const current = this.getDegustaciones();
    const updated = current.filter((item) => item.id !== id);
    this.saveDegustaciones(updated);

    try {
      if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
        await fetch(`${window.location.origin}/api/degustaciones/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      }
    } catch (e) {
      console.warn('[degustacionesService] Error sincronizando DELETE con API:', e);
    }
  },

  /**
   * Obtiene degustaciones filtradas por promotora (insensible a acentos, mayúsculas, espacios y stopwords)
   */
  getDegustacionesForPromoter(promoterName: string): DegustacionItem[] {
    const all = this.getDegustaciones();
    return all.filter((item) => matchPromoterName(item.promoter, promoterName));
  },

  /**
   * Obtiene la degustación activa en curso o próxima programada para el perfil de una promotora
   */
  getActiveDegustacionForPromoter(promoterName: string): DegustacionItem | null {
    const list = this.getDegustacionesForPromoter(promoterName);
    if (list.length === 0) return null;

    // Prioridad 1: Actividad en curso
    const inProgress = list.find((d) => d.status === 'in_progress');
    if (inProgress) return inProgress;

    // Prioridad 2: Actividad programada más reciente
    const scheduled = list.find((d) => d.status === 'scheduled');
    if (scheduled) return scheduled;

    return list[0];
  },

  /**
   * Obtiene degustaciones filtradas por vendedor
   */
  getDegustacionesForVendedor(vendedorName: string): DegustacionItem[] {
    const all = this.getDegustaciones();
    const clean = (s: string) =>
      (s || '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const target = clean(vendedorName);
    if (!target) return [];

    return all.filter((item) => {
      const v = clean(item.vendedor);
      return v === target || v.includes(target) || target.includes(v);
    });
  },

  /**
   * Suscribe a cambios en tiempo real
   */
  subscribe(callback: (items: DegustacionItem[]) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ items: DegustacionItem[] }>;
      if (customEvent.detail && Array.isArray(customEvent.detail.items)) {
        callback(customEvent.detail.items);
      } else {
        callback(this.getDegustaciones());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(EVENT_NAME, handler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(EVENT_NAME, handler);
      }
    };
  }
};
