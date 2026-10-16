const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("No supabase credentials, skipping prewarm.");
  process.exit(0);
}

const supabase = createClient(url.replace('/rest/v1/', ''), key);
const cacheDir = path.join(process.cwd(), 'cache_product_clients');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const prodsPath = path.join(process.cwd(), 'pareto_products_complete.json');
const prods = fs.existsSync(prodsPath) ? JSON.parse(fs.readFileSync(prodsPath, 'utf8')) : [];
prods.sort((a, b) => b.monto - a.monto);

async function aggregateProduct(product) {
  const idArt = product.id_articulo;
  const cacheFile = path.join(cacheDir, `${idArt}.json`);
  if (fs.existsSync(cacheFile)) {
    console.log(`[Cache Hit] Product ${idArt} already cached.`);
    return;
  }

  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  while (page < 15) {
    const { data, error } = await supabase.from('history_sales')
      .select('id_cliente, cliente, vendedor, cajas, kgs_lts, monto, mes')
      .eq('id_articulo', idArt)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  const clientMap = new Map();
  let totMonto = 0;
  let totCajas = 0;
  let totKgs = 0;

  for (const r of allRows) {
    const cid = String(r.id_cliente || '');
    const m = Number(r.monto || 0);
    const c = Number(r.cajas || 0);
    const k = Number(r.kgs_lts || 0);
    totMonto += m;
    totCajas += c;
    totKgs += k;

    if (!clientMap.has(cid)) {
      clientMap.set(cid, {
        id_cliente: cid,
        cliente: (r.cliente || '').trim(),
        vendedor: (r.vendedor || '').trim(),
        monto: 0,
        cajas: 0,
        kgs: 0,
        months: {}
      });
    }
    const rec = clientMap.get(cid);
    rec.monto += m;
    rec.cajas += c;
    rec.kgs += k;
    const mes = (r.mes || 'GENERAL').toUpperCase().trim();
    if (!rec.months[mes]) rec.months[mes] = { monto: 0, cajas: 0, kgs: 0 };
    rec.months[mes].monto += m;
    rec.months[mes].cajas += c;
    rec.months[mes].kgs += k;
  }

  const clientsList = Array.from(clientMap.values()).sort((a, b) => b.monto - a.monto);
  const result = {
    id_articulo: idArt,
    articulo: product.articulo,
    totalMonto: totMonto,
    totalCajas: totCajas,
    totalKgs: totKgs,
    clientsCount: clientsList.length,
    clients: clientsList
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
  console.log(`[Saved] Product ${idArt} (${product.articulo}): ${clientsList.length} clients, $${Math.round(totMonto).toLocaleString()}`);
}

async function run() {
  const topProducts = prods.slice(0, 35);
  console.log(`Prewarming ${topProducts.length} top products...`);
  for (const p of topProducts) {
    try {
      await aggregateProduct(p);
    } catch (err) {
      console.warn(`Error on product ${p.id_articulo}:`, err.message);
    }
  }
  console.log("Prewarm complete!");
}

run();
