const fs = require('fs');
const path = require('path');

const clientsPath = path.join(process.cwd(), 'pareto_clients_complete.json');
if (!fs.existsSync(clientsPath)) {
  console.error('File not found:', clientsPath);
  process.exit(1);
}

const rawClients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));

function normalizeClientName(name, fallbackId) {
  if (!name || String(name).trim() === '') return `CLIENTE GENERAL #${fallbackId}`;
  let n = String(name).trim().toUpperCase().replace(/\s+/g, ' ');
  // Remove wrapping quotes
  n = n.replace(/^["'\s]+|["'\s]+$/g, '');
  // Clean double commas or messy punctuation
  n = n.replace(/,+/g, ',');
  n = n.replace(/,\s*,/g, ',');
  n = n.replace(/[\.,\s]+$/, '');
  
  // Standardize corporate legal endings
  n = n.replace(/,?\s*C\.?A\.?$/i, ', C.A.');
  n = n.replace(/,?\s*S\.?A\.?$/i, ', S.A.');
  n = n.replace(/,?\s*S\.?R\.?L\.?$/i, ', S.R.L.');
  n = n.replace(/,?\s*F\.?P\.?$/i, ', F.P.');
  n = n.replace(/,?\s*E\.?I\.?R\.?L\.?$/i, ', E.I.R.L.');
  
  // Ensure clean commas
  n = n.replace(/\s*,\s*/g, ', ');
  return n;
}

const clientsMap = new Map();

rawClients.forEach(c => {
  const normName = normalizeClientName(c.cliente, c.id_cliente);
  if (!clientsMap.has(normName)) {
    clientsMap.set(normName, {
      cliente: normName,
      ids: new Set(),
      vendedoresMap: new Map(),
      canalesMap: new Map(),
      regionesMap: new Map(),
      monto: 0,
      cajas: 0,
      kgs: 0,
      facturasCount: 0,
      months: {}
    });
  }

  const u = clientsMap.get(normName);
  
  // Handle single id_cliente or existing idsList
  if (Array.isArray(c.idsList)) {
    c.idsList.forEach(id => { if (id) u.ids.add(String(id)); });
  } else if (c.id_cliente) {
    u.ids.add(String(c.id_cliente));
  }

  const vend = (c.vendedor || 'SIN VENDEDOR').trim().toUpperCase();
  const weight = Math.abs(c.cajas || 0) + Math.abs(c.monto || 0) + 1;
  u.vendedoresMap.set(vend, (u.vendedoresMap.get(vend) || 0) + weight);

  const canal = (c.canal || 'GENERAL').trim().toUpperCase();
  u.canalesMap.set(canal, (u.canalesMap.get(canal) || 0) + weight);

  const region = (c.region || 'OCCIDENTE').trim().toUpperCase();
  u.regionesMap.set(region, (u.regionesMap.get(region) || 0) + weight);

  u.monto += (c.monto || 0);
  u.cajas += (c.cajas || 0);
  u.kgs += (c.kgs || 0);
  u.facturasCount += (c.facturasCount || 0);

  if (c.months) {
    for (const [m, vals] of Object.entries(c.months)) {
      const mesKey = m.toUpperCase();
      if (!u.months[mesKey]) u.months[mesKey] = { monto: 0, cajas: 0, kgs: 0 };
      u.months[mesKey].monto += (vals.monto || 0);
      u.months[mesKey].cajas += (vals.cajas || 0);
      u.months[mesKey].kgs += (vals.kgs || 0);
    }
  }
});

const consolidatedClients = Array.from(clientsMap.values()).map(u => {
  // Sort vendors by volume weight
  const sortedVends = Array.from(u.vendedoresMap.entries()).sort((a, b) => b[1] - a[1]);
  const primaryVendor = sortedVends[0] ? sortedVends[0][0] : 'SIN VENDEDOR';
  const allVendors = sortedVends.map(v => v[0]);

  // Sort channels
  const sortedCanales = Array.from(u.canalesMap.entries()).sort((a, b) => b[1] - a[1]);
  const primaryCanal = sortedCanales[0] ? sortedCanales[0][0] : 'GENERAL';

  // Sort regions
  const sortedRegiones = Array.from(u.regionesMap.entries()).sort((a, b) => b[1] - a[1]);
  const primaryRegion = sortedRegiones[0] ? sortedRegiones[0][0] : 'OCCIDENTE';

  const idList = Array.from(u.ids);
  const primaryId = idList[0] || '0';

  return {
    id_cliente: primaryId,
    idsList: idList,
    cliente: u.cliente,
    vendedor: primaryVendor,
    vendedoresList: allVendors,
    canal: primaryCanal,
    region: primaryRegion,
    monto: Math.round(u.monto * 100) / 100,
    cajas: Math.round(u.cajas * 100) / 100,
    kgs: Math.round(u.kgs * 100) / 100,
    facturasCount: u.facturasCount,
    months: u.months
  };
});

// Sort descending by total volume
consolidatedClients.sort((a, b) => b.cajas - a.cajas);

console.log('Consolidated unique clients count:', consolidatedClients.length);
console.log('\nTop 10 Clients by Volume:');
consolidatedClients.slice(0, 10).forEach((c, idx) => {
  console.log(`${idx + 1}. ${c.cliente} | Cajas: ${c.cajas.toLocaleString()} | IDs (${c.idsList.length}): ${c.idsList.slice(0, 4).join(', ')} | Vend: ${c.vendedor} (Total Vends: ${c.vendedoresList.length})`);
});

fs.writeFileSync(clientsPath, JSON.stringify(consolidatedClients, null, 2));
console.log('\nSuccessfully saved unified pareto_clients_complete.json!');
