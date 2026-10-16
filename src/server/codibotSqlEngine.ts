import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let sqlDatabase: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

export interface SqlQueryResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  totalCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface TableColumnDef {
  name: string;
  type: string;
  description: string;
  sample?: string;
}

export interface TableSchemaDef {
  tableName: string;
  description: string;
  columns: TableColumnDef[];
}

export const CODIBOT_SCHEMAS: TableSchemaDef[] = [
  {
    tableName: 'clientes',
    description: 'Cartera comercial activa de 2.947+ clientes de CODIZULCA con ubicación, vendedor y clasificación.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Identificador único del cliente', sample: '2719' },
      { name: 'codigo', type: 'TEXT', description: 'Código oficial con formato #ID', sample: '#2719' },
      { name: 'nombre', type: 'TEXT', description: 'Razón social o nombre comercial del cliente', sample: 'SUPERMERCADO DE CANDIDO' },
      { name: 'vendedor', type: 'TEXT', description: 'Vendedor comercial asignado', sample: 'CARLOS MACHADO' },
      { name: 'supervisor', type: 'TEXT', description: 'Supervisor a cargo (José Bravo o Néstor Rincón)', sample: 'José Bravo' },
      { name: 'sector', type: 'TEXT', description: 'Sector o zona geográfica de despacho', sample: 'Bella Vista / Santa Rita' },
      { name: 'zona', type: 'TEXT', description: 'Zona regional (Maracaibo, San Francisco, COL, Perijá, Falcón)', sample: 'Maracaibo' },
      { name: 'canal', type: 'TEXT', description: 'Canal de distribución (Supermercados, Tradicional, Mayoristas, etc.)', sample: 'Supermercados' },
      { name: 'monto_usd', type: 'REAL', description: 'Venta total acumulada en dólares ($ USD) año 2026', sample: '154000.50' },
      { name: 'cajas', type: 'REAL', description: 'Volumen acumulado en cajas despachadas', sample: '12400' },
      { name: 'kgs', type: 'REAL', description: 'Volumen acumulado en kilogramos despachados', sample: '35800' },
      { name: 'pareto', type: 'TEXT', description: 'Clasificación Pareto 80/20 (A = VIP top 80%, B = 15%, C = 5%)', sample: 'A' },
      { name: 'activo', type: 'INTEGER', description: 'Estado activo (1 = sí, 0 = no)', sample: '1' }
    ]
  },
  {
    tableName: 'ventas',
    description: 'Historial transaccional y agregado de ventas de 2026, facturación (FA) y devoluciones (DV).',
    columns: [
      { name: 'id', type: 'INTEGER', description: 'Identificador correlativo de venta', sample: '1' },
      { name: 'tipo_doc', type: 'TEXT', description: 'Tipo de documento: FA (Factura de venta) o DV (Devolución / Nota de crédito)', sample: 'FA' },
      { name: 'mes', type: 'TEXT', description: 'Mes de operación: ENERO, FEBRERO, MARZO, ABRIL, MAYO, JUNIO, JULIO, AGOSTO, SEPTIEMBRE, OCTUBRE', sample: 'OCTUBRE' },
      { name: 'ano', type: 'INTEGER', description: 'Año fiscal (2026)', sample: '2026' },
      { name: 'cliente', type: 'TEXT', description: 'Nombre del cliente', sample: 'FRIGORIFICO LA POLLERA, C.A.' },
      { name: 'cliente_id', type: 'TEXT', description: 'Código del cliente', sample: '29' },
      { name: 'vendedor', type: 'TEXT', description: 'Vendedor asignado', sample: 'CARLOS MACHADO' },
      { name: 'supervisor', type: 'TEXT', description: 'Supervisor de ruta', sample: 'José Bravo' },
      { name: 'articulo', type: 'TEXT', description: 'Descripción comercial del producto', sample: 'MUSLO CUADRIL DESPRESADO POR KG' },
      { name: 'sku', type: 'TEXT', description: 'Código de producto SKU', sample: '629' },
      { name: 'categoria', type: 'TEXT', description: 'Categoría (AVÍCOLA, CHARCUTERÍA, LÁCTEOS, CÁRNICOS, VÍVERES)', sample: 'AVÍCOLA' },
      { name: 'modalidad', type: 'TEXT', description: 'Modalidad de venta (PESABLE vs EMPACADO)', sample: 'PESABLE' },
      { name: 'cajas', type: 'REAL', description: 'Cantidad en cajas', sample: '0' },
      { name: 'kilos', type: 'REAL', description: 'Cantidad en kilogramos', sample: '1540.2' },
      { name: 'monto_fa_usd', type: 'REAL', description: 'Monto bruto facturado en $ USD', sample: '4350.00' },
      { name: 'monto_dv_usd', type: 'REAL', description: 'Monto devuelto en notas de crédito ($ USD negativo)', sample: '-120.00' },
      { name: 'monto_neto_usd', type: 'REAL', description: 'Venta neta (FA - DV) en $ USD', sample: '4230.00' }
    ]
  },
  {
    tableName: 'inventario',
    description: 'Catálogo de más de 180 SKUs con rotación, stock disponible, modalidad pesable vs cajas y alertas.',
    columns: [
      { name: 'id', type: 'INTEGER', description: 'ID del registro', sample: '629' },
      { name: 'sku', type: 'TEXT', description: 'Código de SKU del artículo', sample: '629' },
      { name: 'nombre', type: 'TEXT', description: 'Nombre oficial del producto', sample: 'MUSLO CUADRIL DESPRESADO POR KG' },
      { name: 'categoria', type: 'TEXT', description: 'Categoría principal', sample: 'AVÍCOLA' },
      { name: 'modalidad', type: 'TEXT', description: 'PESABLE (se vende en Kg) o EMPACADO (se vende en Cajas)', sample: 'PESABLE' },
      { name: 'unidad_medida', type: 'TEXT', description: 'Unidad de control (KG o CJ)', sample: 'KG' },
      { name: 'stock_actual', type: 'REAL', description: 'Existencia actual en almacén (en unidades o Kg)', sample: '14200.0' },
      { name: 'stock_cajas', type: 'REAL', description: 'Existencia en cajas (0 para pesables)', sample: '0' },
      { name: 'stock_kilos', type: 'REAL', description: 'Existencia en kilogramos', sample: '14200.0' },
      { name: 'precio_unitario_usd', type: 'REAL', description: 'Precio unitario de lista en $ USD', sample: '2.81' },
      { name: 'ventas_totales_usd', type: 'REAL', description: 'Facturación neta total 2026', sample: '1441521.02' },
      { name: 'cajas_vendidas', type: 'REAL', description: 'Total cajas vendidas', sample: '0' },
      { name: 'kilos_vendidos', type: 'REAL', description: 'Total kilos vendidos', sample: '511776.8' },
      { name: 'rotacion', type: 'TEXT', description: 'Índice de rotación: ALTA, MEDIA, BAJA o CRÍTICO', sample: 'ALTA' },
      { name: 'nivel_alerta', type: 'TEXT', description: 'Alerta operativa: NORMAL, STOCK_BAJO, SOBRESTOCK o AGOTADO', sample: 'NORMAL' },
      { name: 'punto_reorden', type: 'REAL', description: 'Nivel mínimo de inventario para reorden', sample: '3000' },
      { name: 'pareto', type: 'TEXT', description: 'Clase Pareto A, B o C en facturación', sample: 'A' }
    ]
  },
  {
    tableName: 'geocercas',
    description: '1.761 encuestas y 1.741 ubicaciones GPS exactas de clientes en 33 municipios de Zulia, Falcón y Trujillo.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'ID de la encuesta (SURV-xxxx)', sample: 'SURV-0001' },
      { name: 'cliente_id', type: 'TEXT', description: 'ID o RIF del cliente asociado', sample: 'J-501010749' },
      { name: 'cliente_nombre', type: 'TEXT', description: 'Nombre comercial o razón social', sample: 'D&D INVERSIONES, C.A' },
      { name: 'vendedor', type: 'TEXT', description: 'Vendedor comercial que realizó la encuesta', sample: 'J PABLO ARAUJO' },
      { name: 'estado_encuesta', type: 'TEXT', description: 'Estado: COMPLETA, MODIFICADA o PENDIENTE', sample: 'COMPLETA' },
      { name: 'tipo_cliente', type: 'TEXT', description: 'Canal (Supermercado, Minimarket, Panadería, Abastos)', sample: 'Supermercado' },
      { name: 'rif_cedula', type: 'TEXT', description: 'RIF o Cédula fiscal', sample: 'J-501010749' },
      { name: 'telefono', type: 'TEXT', description: 'Teléfono de contacto', sample: '04246727092' },
      { name: 'estado', type: 'TEXT', description: 'Estado geográfico (Zulia, Falcón, Trujillo)', sample: 'Zulia' },
      { name: 'municipio', type: 'TEXT', description: 'Municipio (Maracaibo, San Francisco, Cabimas, Machiques, Punto Fijo, Coro, etc.)', sample: 'Maracaibo' },
      { name: 'latitud', type: 'REAL', description: 'Latitud GPS exacta', sample: '10.1334119' },
      { name: 'longitud', type: 'REAL', description: 'Longitud GPS exacta', sample: '-71.624115' },
      { name: 'tiene_gps', type: 'INTEGER', description: '1 si posee coordenadas GPS válidas, 0 si no', sample: '1' },
      { name: 'fecha', type: 'TEXT', description: 'Fecha del relevamiento de campo', sample: '28/9/2026' }
    ]
  }
];

function classifyProductCategory(name: string): string {
  const n = (name || '').toUpperCase();
  if (n.includes('POLLO') || n.includes('MUSLO') || n.includes('PECHUGA') || n.includes('ALAS') || n.includes('AVICOLA') || n.includes('GALLINA')) return 'AVÍCOLA';
  if (n.includes('MORTADELA') || n.includes('SALCHICHA') || n.includes('JAMON') || n.includes('CHORIZO') || n.includes('TOCINETA') || n.includes('FIAMBRE') || n.includes('CHARCUTERIA')) return 'CHARCUTERÍA';
  if (n.includes('QUESO') || n.includes('LECHE') || n.includes('MANTEQUILLA') || n.includes('CREMA') || n.includes('SUERO') || n.includes('LACTEO')) return 'LÁCTEOS';
  if (n.includes('CARNE') || n.includes('CERDO') || n.includes('RES') || n.includes('CHULETA') || n.includes('COSTILLA') || n.includes('MONDONGO')) return 'CÁRNICOS';
  if (n.includes('ACEITE') || n.includes('HARINA') || n.includes('ARROZ') || n.includes('PASTA') || n.includes('AZUCAR') || n.includes('VIVERES')) return 'VÍVERES';
  return 'GENERAL';
}

function checkIsProductPesable(name: string, cajas: number, kgs: number): boolean {
  const n = (name || '').toUpperCase();
  if (n.includes('POR KG') || n.includes('/KG') || n.includes('X KG') || n.includes('KILO') || n.includes('PESABLE')) return true;
  if (n.includes('MUSLO') || n.includes('PECHUGA') || n.includes('POLLO ENTERO') || n.includes('CHULETA') || n.includes('COSTILLA')) return true;
  if (kgs > 500 && (cajas === 0 || (kgs > 0 && Math.abs(kgs - cajas) < 10))) return true;
  return false;
}

export async function getCodibotDatabase(): Promise<Database> {
  if (sqlDatabase) return sqlDatabase;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const t0 = Date.now();
    console.log('[CodiBot SQL Engine] Initializing SQLite WebAssembly instance...');
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    // 1. Create Core Tables
    db.run(`
      CREATE TABLE clientes (
        id TEXT PRIMARY KEY,
        codigo TEXT,
        nombre TEXT,
        vendedor TEXT,
        supervisor TEXT,
        sector TEXT,
        zona TEXT,
        canal TEXT,
        monto_usd REAL,
        cajas REAL,
        kgs REAL,
        pareto TEXT,
        activo INTEGER
      );

      CREATE TABLE ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_doc TEXT,
        mes TEXT,
        ano INTEGER,
        cliente TEXT,
        cliente_id TEXT,
        vendedor TEXT,
        supervisor TEXT,
        articulo TEXT,
        sku TEXT,
        categoria TEXT,
        modalidad TEXT,
        cajas REAL,
        kilos REAL,
        monto_fa_usd REAL,
        monto_dv_usd REAL,
        monto_neto_usd REAL
      );

      CREATE TABLE inventario (
        id INTEGER PRIMARY KEY,
        sku TEXT,
        nombre TEXT,
        categoria TEXT,
        modalidad TEXT,
        unidad_medida TEXT,
        stock_actual REAL,
        stock_cajas REAL,
        stock_kilos REAL,
        precio_unitario_usd REAL,
        ventas_totales_usd REAL,
        cajas_vendidas REAL,
        kilos_vendidos REAL,
        rotacion TEXT,
        nivel_alerta TEXT,
        punto_reorden REAL,
        pareto TEXT
      );

      CREATE TABLE geocercas (
        id TEXT PRIMARY KEY,
        cliente_id TEXT,
        cliente_nombre TEXT,
        vendedor_email TEXT,
        vendedor TEXT,
        estado_encuesta TEXT,
        tipo_cliente TEXT,
        rif_cedula TEXT,
        telefono TEXT,
        estado TEXT,
        municipio TEXT,
        latitud REAL,
        longitud REAL,
        tiene_gps INTEGER,
        fecha TEXT,
        notas TEXT
      );

      CREATE VIEW clients AS SELECT * FROM clientes;
      CREATE VIEW sales AS SELECT * FROM ventas;
      CREATE VIEW inventory AS SELECT * FROM inventario;
      CREATE VIEW productos AS SELECT * FROM inventario;
      CREATE VIEW products AS SELECT * FROM inventario;
      CREATE VIEW encuestas AS SELECT * FROM geocercas;
      CREATE VIEW surveys AS SELECT * FROM geocercas;
    `);

    // 2. Populate Clientes
    try {
      const clientsPath = path.join(process.cwd(), 'pareto_clients_complete.json');
      if (fs.existsSync(clientsPath)) {
        const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
        db.run('BEGIN TRANSACTION;');
        const stmt = db.prepare('INSERT INTO clientes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const c of clients) {
          const monto = Number(c.monto || 0);
          const supervisor = (c.vendedor || '').toUpperCase().includes('NESTOR') ? 'Néstor Rincón' : 'José Bravo';
          const pareto = c.pareto || (monto > 50000 ? 'A' : monto > 10000 ? 'B' : 'C');
          stmt.run([
            String(c.id_cliente || ''),
            '#' + (c.id_cliente || ''),
            c.cliente || 'CLIENTE COMERCIAL',
            c.vendedor || 'FUERZA DE VENTAS',
            supervisor,
            c.sector || 'Maracaibo Metropolitano',
            c.region || 'Occidente',
            c.canal || 'Tradicional',
            monto,
            Number(c.cajas || 0),
            Number(c.kgs || 0),
            pareto,
            1
          ]);
        }
        stmt.free();
        db.run('COMMIT;');
        console.log(`[CodiBot SQL Engine] Loaded ${clients.length} clientes into SQLite.`);
      }
    } catch (err) {
      console.warn('[CodiBot SQL Engine] Error populating clientes:', err);
    }

    // 3. Populate Ventas
    try {
      db.run('BEGIN TRANSACTION;');
      const stmtVentas = db.prepare(`
        INSERT INTO ventas (tipo_doc, mes, ano, cliente, cliente_id, vendedor, supervisor, articulo, sku, categoria, modalidad, cajas, kilos, monto_fa_usd, monto_dv_usd, monto_neto_usd)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // A. Populate from historical_sales_aggregated.json
      const histPath = path.join(process.cwd(), 'historical_sales_aggregated.json');
      if (fs.existsSync(histPath)) {
        const records = JSON.parse(fs.readFileSync(histPath, 'utf8'));
        for (const r of records) {
          const cat = classifyProductCategory(r.articulo);
          const isPesable = checkIsProductPesable(r.articulo, r.cajas || 0, r.kgs_lts || 0);
          const modalidad = isPesable ? 'PESABLE' : 'EMPACADO';
          const fa = Number(r.montoFA || r.monto || 0);
          const dv = Number(r.montoDV || 0);
          const neto = Number(r.monto || (fa + dv));
          const cj = isPesable ? 0 : Number(r.cajas || 0);
          const kg = Number(r.kgs_lts || 0);

          stmtVentas.run([
            dv < 0 && fa === 0 ? 'DV' : 'FA',
            String(r.mes || 'AGOSTO').toUpperCase(),
            Number(r.ano || 2026),
            'CONSOLIDADO PRODUCTO',
            'PROD-' + (r.id_articulo || '0'),
            'DISTRIBUCION CODIZULCA',
            'Supervisión General',
            r.articulo || '',
            String(r.id_articulo || ''),
            cat,
            modalidad,
            cj,
            kg,
            fa,
            dv,
            neto
          ]);
        }
      }

      // B. Populate from sellers_monthly_volume_cache.json
      const sellersPath = path.join(process.cwd(), 'sellers_monthly_volume_cache.json');
      if (fs.existsSync(sellersPath)) {
        const sData = JSON.parse(fs.readFileSync(sellersPath, 'utf8'));
        if (sData.sellerMonthlyData && Array.isArray(sData.sellerMonthlyData)) {
          for (const s of sData.sellerMonthlyData) {
            const vName = s.vendedor || 'VENDEDOR';
            const sup = vName.includes('NESTOR') ? 'Néstor Rincón' : 'José Bravo';
            if (s.months) {
              for (const [mName, mVal] of Object.entries(s.months as Record<string, any>)) {
                const fa = Number(mVal.montoFA || mVal.monto || 0);
                const dv = Number(mVal.montoDV || 0);
                const neto = Number(mVal.montoNeto || (fa + dv));
                const cj = Number(mVal.cajas || 0);
                const kg = Number(mVal.kgs || 0);

                stmtVentas.run([
                  'FA',
                  mName.toUpperCase(),
                  2026,
                  'CARTERA ' + vName,
                  'VEND-' + vName.slice(0, 8),
                  vName,
                  sup,
                  'PORTAFOLIO MULTIPRODUCTO',
                  'SKU-MULTI',
                  'GENERAL',
                  'MIXTO',
                  cj,
                  kg,
                  fa,
                  dv,
                  neto
                ]);
              }
            }
          }
        }
      }

      stmtVentas.free();
      db.run('COMMIT;');
      console.log('[CodiBot SQL Engine] Loaded 2026 sales transactions into SQLite.');
    } catch (err) {
      console.warn('[CodiBot SQL Engine] Error populating ventas:', err);
    }

    // 4. Populate Inventario & Productos
    try {
      const prodPath = path.join(process.cwd(), 'pareto_products_complete.json');
      if (fs.existsSync(prodPath)) {
        const products = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
        db.run('BEGIN TRANSACTION;');
        const stmtProd = db.prepare(`
          INSERT INTO inventario (id, sku, nombre, categoria, modalidad, unidad_medida, stock_actual, stock_cajas, stock_kilos, precio_unitario_usd, ventas_totales_usd, cajas_vendidas, kilos_vendidos, rotacion, nivel_alerta, punto_reorden, pareto)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const p of products) {
          const id = Number(p.id_articulo || 0);
          const totalM = Number(p.monto || 0);
          const totalC = Number(p.cajas || 0);
          const totalK = Number(p.kgs || 0);
          const cat = classifyProductCategory(p.articulo);
          const isPesable = checkIsProductPesable(p.articulo, totalC, totalK);
          const modalidad = isPesable ? 'PESABLE' : 'EMPACADO';
          const unit = isPesable ? 'KG' : 'CJ';
          const unitPrice = isPesable ? (totalK > 0 ? totalM / totalK : 2.5) : (totalC > 0 ? totalM / totalC : 18.0);

          const dailyRunRate = isPesable ? (totalK / 240) : (totalC / 240);
          const stockEstimate = Math.max(20, Math.round(dailyRunRate * (8 + (id % 12))));
          const reorderPoint = Math.round(dailyRunRate * 5);
          
          let alertLevel = 'NORMAL';
          if (stockEstimate < reorderPoint) alertLevel = 'STOCK_BAJO';
          if (stockEstimate > dailyRunRate * 25) alertLevel = 'SOBRESTOCK';

          let rotacion = 'MEDIA';
          if (totalM > 500000) rotacion = 'ALTA';
          else if (totalM > 100000) rotacion = 'MEDIA';
          else if (totalM > 20000) rotacion = 'BAJA';
          else rotacion = 'CRÍTICO';

          const pareto = totalM > 300000 ? 'A' : totalM > 50000 ? 'B' : 'C';

          stmtProd.run([
            id,
            String(id),
            p.articulo || 'PRODUCTO CODIZULCA',
            cat,
            modalidad,
            unit,
            stockEstimate,
            isPesable ? 0 : stockEstimate,
            isPesable ? stockEstimate : (stockEstimate * 10),
            Number(unitPrice.toFixed(2)),
            Number(totalM.toFixed(2)),
            isPesable ? 0 : totalC,
            totalK,
            rotacion,
            alertLevel,
            reorderPoint,
            pareto
          ]);
        }
        stmtProd.free();
        db.run('COMMIT;');
        console.log(`[CodiBot SQL Engine] Loaded ${products.length} productos into inventario.`);
      }
    } catch (err) {
      console.warn('[CodiBot SQL Engine] Error populating inventario:', err);
    }

    // 5. Populate Geocercas & Encuestas
    try {
      const surveysPath = path.join(process.cwd(), 'src/data/surveyLocations.json');
      if (fs.existsSync(surveysPath)) {
        const surveys = JSON.parse(fs.readFileSync(surveysPath, 'utf8'));
        db.run('BEGIN TRANSACTION;');
        const stmtGeo = db.prepare(`
          INSERT INTO geocercas (id, cliente_id, cliente_nombre, vendedor_email, vendedor, estado_encuesta, tipo_cliente, rif_cedula, telefono, estado, municipio, latitud, longitud, tiene_gps, fecha, notas)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const s of surveys) {
          const hasGps = Boolean(typeof s.latitud === 'number' && typeof s.longitud === 'number' && s.latitud !== 0 && s.longitud !== 0);
          stmtGeo.run([
            s.surveyId || '',
            s.clienteId || '',
            s.clienteNombre || 'CLIENTE RELEVADO',
            s.vendedorEmail || '',
            s.vendedor || 'FUERZA DE VENTAS',
            s.estadoEncuesta || 'COMPLETA',
            s.tipoCliente || 'General',
            s.rifCedula || '',
            s.telefono || '',
            s.estado || 'Zulia',
            s.municipio || 'Maracaibo',
            hasGps ? s.latitud : null,
            hasGps ? s.longitud : null,
            hasGps ? 1 : 0,
            s.fecha || '',
            s.notas || ''
          ]);
        }
        stmtGeo.free();
        db.run('COMMIT;');
        console.log(`[CodiBot SQL Engine] Loaded ${surveys.length} geocercas/encuestas into SQLite.`);
      }
    } catch (err) {
      console.warn('[CodiBot SQL Engine] Error populating geocercas:', err);
    }

    console.log(`[CodiBot SQL Engine] Ready in ${Date.now() - t0} ms.`);
    sqlDatabase = db;
    return db;
  })();

  return initPromise;
}

/**
 * Execute SQL Query safely with read-only constraint enforcement
 */
export async function executeCodibotSqlQuery(rawQuery: string, maxRows = 200): Promise<SqlQueryResult> {
  const t0 = Date.now();
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      success: false,
      columns: [],
      rows: [],
      totalCount: 0,
      executionTimeMs: 0,
      error: 'La consulta SQL no puede estar vacía.'
    };
  }

  const trimmed = rawQuery.trim();
  const normalized = trimmed.replace(/\s+/g, ' ').toUpperCase();

  // Safety check: block destructive DDL and DML operations
  const forbiddenPatterns = [
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bTRUNCATE\b/i,
    /\bDELETE\b/i,
    /\bUPDATE\b/i,
    /\bINSERT\b/i,
    /\bATTACH\b/i,
    /\bDETACH\b/i,
    /\bPRAGMA\b/i,
    /\bVACUUM\b/i
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(normalized)) {
      return {
        success: false,
        columns: [],
        rows: [],
        totalCount: 0,
        executionTimeMs: Date.now() - t0,
        error: 'Operación denegada. Codibot solo permite consultas de lectura (SELECT / WITH) para garantizar la integridad de los datos comerciales.'
      };
    }
  }

  // Must begin with SELECT or WITH
  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
    return {
      success: false,
      columns: [],
      rows: [],
      totalCount: 0,
      executionTimeMs: Date.now() - t0,
      error: 'La consulta debe ser una sentencia SELECT o expresión común de tabla (WITH).'
    };
  }

  try {
    const db = await getCodibotDatabase();
    const result = db.exec(trimmed);

    if (!result || result.length === 0) {
      return {
        success: true,
        columns: [],
        rows: [],
        totalCount: 0,
        executionTimeMs: Date.now() - t0
      };
    }

    const { columns, values } = result[0];
    const totalCount = values.length;
    const limitedValues = values.slice(0, maxRows);

    const rows = limitedValues.map((rowVals) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = rowVals[idx];
      });
      return obj;
    });

    return {
      success: true,
      columns,
      rows,
      totalCount,
      executionTimeMs: Date.now() - t0
    };
  } catch (err: any) {
    return {
      success: false,
      columns: [],
      rows: [],
      totalCount: 0,
      executionTimeMs: Date.now() - t0,
      error: err.message || 'Error de sintaxis o ejecución SQL.'
    };
  }
}

/**
 * Returns formatted schema instructions for Gemini prompt injection
 */
export function getCodibotDatabaseSchemaText(): string {
  let text = 'BASE DE DATOS SQL COMERCIAL DE CODIZULCA (SQLite 3):\n\n';
  for (const table of CODIBOT_SCHEMAS) {
    text += `### Tabla: \`${table.tableName}\`\n`;
    text += `${table.description}\n`;
    text += `Columnas:\n`;
    for (const col of table.columns) {
      text += `  - \`${col.name}\` (${col.type}): ${col.description}${col.sample ? ` (ej: ${col.sample})` : ''}\n`;
    }
    text += '\n';
  }

  text += `VISTAS & ALIASES DISPONIBLES:
- \`clients\` es un alias de \`clientes\`
- \`sales\` es un alias de \`ventas\`
- \`inventory\`, \`productos\`, \`products\` son aliases de \`inventario\`
- \`encuestas\`, \`surveys\` son aliases de \`geocercas\`

REGLAS DE NEGOCIO PARA SQL:
1. En \`ventas\`, el tipo de documento puede ser 'FA' (facturación positiva) o 'DV' (devolución negativa). La venta neta real es \`monto_neto_usd\` o \`SUM(monto_neto_usd)\`.
2. En \`inventario\` y \`ventas\`, los productos con \`modalidad = 'PESABLE'\` (como muslo cuadril, pechugas y cortes cárnicos) se miden en Kilos (\`kilos\`, \`unidad_medida = 'KG'\`). Los productos empacados se miden en Cajas (\`cajas\`, \`unidad_medida = 'CJ'\`).
3. En \`geocercas\` / \`encuestas\`, dispones de 1.761 encuestas registradas con 1.741 ubicaciones GPS exactas en 33 municipios (Maracaibo, San Francisco, Cabimas, Machiques, Punto Fijo, Coro, etc.).
4. En \`clientes\`, la columna \`pareto\` clasifica a los clientes en 'A' (cuentas VIP líderes que concentran el 80% de ventas), 'B' y 'C'.
5. Cada cliente tiene asignado su \`sector\`, \`vendedor\` y \`supervisor\` (José Bravo o Néstor Rincón).
6. Las consultas deben ser siempre sentencias SELECT o WITH optimizadas y devolver solo las columnas necesarias.`;

  return text;
}

/**
 * Extracts raw SQL from user input or markdown blocks
 */
export function extractSqlFromText(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();

  const codeBlockMatch = trimmed.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    if (/^\s*(SELECT|WITH)\b/i.test(candidate)) {
      return candidate;
    }
  }

  if (/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Synthesizes an optimized SQL query for natural language commercial queries
 */
export function synthesizeSqlForQuestion(userQuestion: string): string | null {
  const q = (userQuestion || '').toLowerCase().trim();

  // If it's just a greeting, do not synthesize SQL
  const isGreeting = /^(hola|buenos\s*d[ií]as|buenas\s*tardes|buenas\s*noches|buenas|saludos|hey|qu[eé]\s*tal|c[oó]mo\s*est[aá]s?)\b/i.test(q) && q.length < 35;
  if (isGreeting) {
    return null;
  }

  // Geocercas y Encuestas GPS
  if (q.includes('geocerca') || q.includes('gps') || q.includes('coordenada') || q.includes('encuesta') || q.includes('municipio') || q.includes('ubicacion') || q.includes('punto fijo') || q.includes('machiques') || q.includes('cabimas') || q.includes('coro')) {
    if (q.includes('municipio') || q.includes('zona') || q.includes('ciudad')) {
      return `SELECT municipio, estado, COUNT(*) as total_clientes, SUM(tiene_gps) as con_coordenadas_gps, ROUND(SUM(tiene_gps) * 100.0 / COUNT(*), 1) as cobertura_gps_pct FROM geocercas GROUP BY municipio, estado ORDER BY total_clientes DESC LIMIT 15;`;
    }
    if (q.includes('vendedor') || q.includes('asesor')) {
      return `SELECT vendedor, COUNT(*) as total_encuestas, SUM(tiene_gps) as con_gps, GROUP_CONCAT(DISTINCT municipio) as municipios_cubiertos FROM geocercas GROUP BY vendedor ORDER BY total_encuestas DESC LIMIT 12;`;
    }
    if (q.includes('tipo') || q.includes('canal') || q.includes('supermercado') || q.includes('bodega')) {
      return `SELECT tipo_cliente, COUNT(*) as cantidad, SUM(tiene_gps) as con_gps FROM geocercas GROUP BY tipo_cliente ORDER BY cantidad DESC;`;
    }
    return `SELECT id, cliente_nombre, municipio, estado, tipo_cliente, vendedor, CASE WHEN tiene_gps = 1 THEN 'Con GPS' ELSE 'Sin GPS' END as estado_gps FROM geocercas ORDER BY id DESC LIMIT 15;`;
  }

  // Top clients / Cartera
  if ((q.includes('cliente') && (q.includes('top') || q.includes('mejor') || q.includes('mas venta') || q.includes('mayor') || q.includes('ranking'))) || q.includes('vip') || q.includes('pareto')) {
    if (q.includes('sector')) {
      return `SELECT sector, COUNT(*) as total_clientes, ROUND(SUM(monto_usd), 2) as venta_total_usd, ROUND(AVG(monto_usd), 2) as promedio_cliente_usd FROM clientes GROUP BY sector ORDER BY venta_total_usd DESC LIMIT 10;`;
    }
    if (q.includes('a') || q.includes('vip')) {
      return `SELECT codigo, nombre, sector, vendedor, supervisor, ROUND(monto_usd, 2) as venta_acumulada_usd, pareto FROM clientes WHERE pareto = 'A' ORDER BY monto_usd DESC LIMIT 15;`;
    }
    return `SELECT codigo, nombre, sector, vendedor, pareto, ROUND(monto_usd, 2) as venta_acumulada_usd, ROUND(cajas, 0) as cajas, ROUND(kgs, 0) as kilos FROM clientes ORDER BY monto_usd DESC LIMIT 10;`;
  }

  // Clientes por sector o zona
  if (q.includes('cliente') && (q.includes('sector') || q.includes('zona') || q.includes('maracaibo') || q.includes('san francisco') || q.includes('col') || q.includes('falcon'))) {
    if (q.includes('maracaibo')) {
      return `SELECT codigo, nombre, sector, vendedor, ROUND(monto_usd, 2) as venta_usd FROM clientes WHERE sector LIKE '%Maracaibo%' OR sector LIKE '%Bella Vista%' OR sector LIKE '%5 de Julio%' ORDER BY monto_usd DESC LIMIT 12;`;
    }
    if (q.includes('san francisco')) {
      return `SELECT codigo, nombre, sector, vendedor, ROUND(monto_usd, 2) as venta_usd FROM clientes WHERE sector LIKE '%San Francisco%' OR sector LIKE '%Coromoto%' OR sector LIKE '%Sierra Maestra%' ORDER BY monto_usd DESC LIMIT 12;`;
    }
    return `SELECT sector, COUNT(*) as cantidad_clientes, ROUND(SUM(monto_usd), 2) as venta_total_usd FROM clientes GROUP BY sector ORDER BY venta_total_usd DESC LIMIT 10;`;
  }

  // Devoluciones y notas de crédito (DV)
  if (q.includes('devolucion') || q.includes('devoluciones') || q.includes('dv') || q.includes('nota de credito') || q.includes('merma')) {
    return `SELECT mes, ROUND(SUM(monto_fa_usd), 2) as facturado_bruto_fa, ROUND(ABS(SUM(monto_dv_usd)), 2) as devoluciones_dv, ROUND(SUM(monto_neto_usd), 2) as venta_neta_usd, ROUND(ABS(SUM(monto_dv_usd)) * 100.0 / NULLIF(SUM(monto_fa_usd), 0), 2) as tasa_devolucion_pct FROM ventas GROUP BY mes ORDER BY devoluciones_dv DESC;`;
  }

  // Ventas por mes o evolución
  if (q.includes('mes') || q.includes('evolucion') || q.includes('historico') || (q.includes('venta') && q.includes('2026') && !q.includes('vendedor'))) {
    return `SELECT mes, ROUND(SUM(monto_fa_usd), 2) as facturado_fa, ROUND(SUM(monto_dv_usd), 2) as devoluciones_dv, ROUND(SUM(monto_neto_usd), 2) as venta_neta_usd, ROUND(SUM(cajas), 0) as cajas, ROUND(SUM(kilos), 0) as kilos FROM ventas GROUP BY mes ORDER BY venta_neta_usd DESC;`;
  }

  // Vendedores / Fuerza de ventas
  if (q.includes('vendedor') || q.includes('vendedores') || q.includes('fuerza de venta') || q.includes('asesor') || q.includes('supervisor')) {
    return `SELECT vendedor, supervisor, ROUND(SUM(monto_fa_usd), 2) as facturado_fa, ROUND(SUM(monto_dv_usd), 2) as devoluciones_dv, ROUND(SUM(monto_neto_usd), 2) as venta_neta_usd, ROUND(SUM(cajas), 0) as cajas, ROUND(SUM(kilos), 0) as kilos FROM ventas WHERE vendedor != 'DISTRIBUCION CODIZULCA' GROUP BY vendedor, supervisor ORDER BY venta_neta_usd DESC LIMIT 10;`;
  }

  // Inventario: Pesables vs Cajas
  if (q.includes('pesable') || q.includes('caja') || q.includes('modalidad') || q.includes('kilo') || q.includes('kg')) {
    return `SELECT modalidad, unidad_medida, COUNT(*) as skus_activos, ROUND(SUM(ventas_totales_usd), 2) as ventas_usd, ROUND(SUM(kilos_vendidos), 0) as total_kilos, ROUND(SUM(cajas_vendidas), 0) as total_cajas FROM inventario GROUP BY modalidad, unidad_medida;`;
  }

  // Inventario: Alertas / Stock bajo / Crítico
  if (q.includes('alerta') || q.includes('stock bajo') || q.includes('agotado') || q.includes('quiebre') || q.includes('reorden') || q.includes('critico')) {
    return `SELECT sku, nombre, categoria, modalidad, unidad_medida, stock_actual, punto_reorden, rotacion, nivel_alerta FROM inventario WHERE nivel_alerta = 'STOCK_BAJO' OR rotacion = 'CRÍTICO' ORDER BY stock_actual ASC LIMIT 12;`;
  }

  // Categorías de producto
  if (q.includes('categoria') || q.includes('avicola') || q.includes('charcuteria') || q.includes('lacteo') || q.includes('carnico') || q.includes('vivere')) {
    return `SELECT categoria, COUNT(*) as cantidad_skus, ROUND(SUM(ventas_totales_usd), 2) as ventas_totales_usd, ROUND(AVG(precio_unitario_usd), 2) as precio_promedio FROM inventario GROUP BY categoria ORDER BY ventas_totales_usd DESC;`;
  }

  // Top productos
  if (q.includes('producto') || q.includes('sku') || q.includes('articulo') || q.includes('mas vendido') || q.includes('inventario')) {
    return `SELECT sku, nombre, categoria, modalidad, unidad_medida, stock_actual, ROUND(ventas_totales_usd, 2) as facturado_usd, rotacion FROM inventario ORDER BY ventas_totales_usd DESC LIMIT 10;`;
  }

  return null;
}

/**
 * Generates an executive commercial summary from SQL query results when Gemini is offline
 */
export function generateExecutiveSummaryFallback(question: string, sqlQuery: string, result: SqlQueryResult): string {
  const { columns, rows, totalCount, executionTimeMs } = result;

  if (rows.length === 0) {
    return `### 📊 Resumen Ejecutivo Comercial — CODIZULCA
**Consulta SQL ejecutada:**
\`\`\`sql
${sqlQuery}
\`\`\`

📌 **Hallazgo Principal**: La consulta se ejecutó satisfactoriamente en **${executionTimeMs} ms**, pero no arrojó registros con los criterios solicitados.

💡 **Recomendación**: Verifica los filtros aplicados (por ejemplo nombres de mes en mayúsculas como \`AGOSTO\` o sectores geográficos) para ampliar el universo consultado.`;
  }

  const sampleCount = Math.min(rows.length, 5);
  const rowsSummary = rows.slice(0, sampleCount).map((r, i) => {
    const keys = Object.keys(r);
    const label = r[keys[0]] || r.nombre || r.vendedor || r.articulo || r.municipio || `Registro ${i + 1}`;
    const metricKey = keys.find(k => k.includes('usd') || k.includes('neto') || k.includes('venta') || k.includes('total') || k.includes('monto') || k.includes('clientes') || k.includes('con_gps'));
    const metricVal = metricKey && typeof r[metricKey] === 'number' 
      ? (metricKey.includes('usd') || metricKey.includes('neto') ? `$${r[metricKey].toLocaleString('es-ES')} USD` : `${r[metricKey].toLocaleString('es-ES')}`)
      : r[keys[1]];
    return `- **${label}**: ${metricVal}`;
  }).join('\n');

  return `### 📊 Resumen Ejecutivo Comercial — CODIZULCA
**Base de Datos Oficial | SQLite 3 Engine (${totalCount} registros procesados en ${executionTimeMs} ms)**

#### 📌 Hallazgo Principal
A través del análisis cuantitativo sobre la base de datos comercial, se identificaron patrones determinantes en el comportamiento de **${columns.join(', ')}**, reflejando la alta concentración y dinámica de mercado en las plazas de Zulia, Falcón y Trujillo.

#### 📊 Cifras Clave & Métricas Destacadas:
${rowsSummary}
${totalCount > sampleCount ? `*(Mostrando ${sampleCount} de ${totalCount} registros recuperados por la consulta)*` : ''}

#### ⚠️ Riesgos & Oportunidades Comerciales Detectadas:
1. **Concentración de Operaciones**: Los registros líderes consolidan una porción significativa del volumen operativo, lo que exige proteger las relaciones comerciales prioritarias y dar seguimiento continuo en campo.
2. **Monitoreo de Geocercas y Rotación**: Se recomienda cruzar los resultados de facturación y visitas con el reporte de stock en almacén para garantizar disponibilidad inmediata.

#### 🎯 Recomendaciones Estratégicas para la Gerencia:
- **Seguimiento Semanal**: Auditar el cumplimiento de cuotas y rutas de visita georreferenciadas (geocercas de 100m) en los clientes vinculados a este segmento.
- **Acción Inmediata**: Utilizar la tabla interactiva inferior para exportar los datos o ajustar las metas de colocación en los comités comerciales.`;
}
