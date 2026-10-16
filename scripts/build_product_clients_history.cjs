const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace('/rest/v1/', '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE'];

async function buildAllProductClients() {
  console.log('Starting full aggregation of history_sales across ALL months (Enero, Febrero, Marzo, etc.)...');
  const startTime = Date.now();
  
  const productMap = new Map();
  let totalRows = 0;

  for (const mes of MONTHS) {
    console.log(`Fetching month: ${mes}...`);
    let from = 0;
    const batchSize = 1000;
    let monthRows = 0;

    while (true) {
      // Parallel fetch 5 pages at a time
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const pFrom = from + i * batchSize;
        promises.push(
          supabase
            .from('history_sales')
            .select('id, id_articulo, articulo, id_cliente, cliente, vendedor, cajas, kgs_lts, monto, mes')
            .eq('mes', mes)
            .order('id', { ascending: true })
            .range(pFrom, pFrom + batchSize - 1)
        );
      }

      const results = await Promise.all(promises);
      let anyData = false;
      let totalFetchedInRound = 0;

      for (const res of results) {
        if (res.error) {
          console.error(`Error in batch for ${mes}:`, res.error.message);
          continue;
        }
        const data = res.data || [];
        totalFetchedInRound += data.length;
        if (data.length > 0) anyData = true;

        for (const r of data) {
          const artId = Number(r.id_articulo);
          if (!artId) continue;

          if (!productMap.has(artId)) {
            productMap.set(artId, {
              id_articulo: artId,
              articulo: (r.articulo || '').trim() || ('Artículo #' + artId),
              totalMonto: 0,
              totalCajas: 0,
              totalKgs: 0,
              clientMap: new Map(),
            });
          }

          const prod = productMap.get(artId);
          const m = Number(r.monto || 0);
          const c = Number(r.cajas || 0);
          const k = Number(r.kgs_lts || 0);

          prod.totalMonto += m;
          prod.totalCajas += c;
          prod.totalKgs += k;
          if (r.articulo && !prod.articulo.startsWith('Artículo #')) {
            prod.articulo = r.articulo.trim();
          }

          const cid = String(r.id_cliente || '').trim();
          if (!cid) continue;

          if (!prod.clientMap.has(cid)) {
            prod.clientMap.set(cid, {
              id_cliente: cid,
              cliente: (r.cliente || '').trim() || ('Cliente #' + cid),
              vendedor: (r.vendedor || '').trim(),
              monto: 0,
              cajas: 0,
              kgs: 0,
              months: {},
            });
          }

          const cl = prod.clientMap.get(cid);
          cl.monto += m;
          cl.cajas += c;
          cl.kgs += k;
          if (r.vendedor) cl.vendedor = r.vendedor.trim();
          if (r.cliente) cl.cliente = r.cliente.trim();

          const mesKey = (r.mes || mes).toUpperCase().trim();
          if (!cl.months[mesKey]) cl.months[mesKey] = { monto: 0, cajas: 0, kgs: 0 };
          cl.months[mesKey].monto += m;
          cl.months[mesKey].cajas += c;
          cl.months[mesKey].kgs += k;
        }
      }

      monthRows += totalFetchedInRound;
      totalRows += totalFetchedInRound;
      from += 5 * batchSize;

      if (!anyData || totalFetchedInRound < 5 * batchSize) {
        break;
      }
    }
    console.log(`Month ${mes} completed: ${monthRows} rows processed.`);
  }

  console.log(`Finished reading ${totalRows} rows across all months in ${(Date.now() - startTime) / 1000}s. Total distinct products: ${productMap.size}`);

  const outDir = path.join(process.cwd(), 'cache_product_clients');
  const pubDir = path.join(process.cwd(), 'public', 'data', 'product_clients');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(pubDir, { recursive: true });

  for (const [artId, prod] of productMap.entries()) {
    const clientsList = Array.from(prod.clientMap.values()).sort((a, b) => b.monto - a.monto);
    const result = {
      id_articulo: artId,
      articulo: prod.articulo,
      totalMonto: prod.totalMonto,
      totalCajas: prod.totalCajas,
      totalKgs: prod.totalKgs,
      clientsCount: clientsList.length,
      clients: clientsList,
    };

    fs.writeFileSync(path.join(outDir, `${artId}.json`), JSON.stringify(result));
    fs.writeFileSync(path.join(pubDir, `${artId}.json`), JSON.stringify(result));
  }

  console.log(`Successfully generated and cached ${productMap.size} product files with complete history for all months!`);
}

buildAllProductClients().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
