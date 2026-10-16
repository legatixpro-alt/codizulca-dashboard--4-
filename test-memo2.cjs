const rawProductData = [
  { idArt: '1', baseName: 'A', facturado: 1000, despachado: 1000, kgFacturado: 1, date: '2026-09-01' },
  { idArt: '2', baseName: 'B', facturado: 2000, despachado: 2000, kgFacturado: 2, date: '2026-09-01' },
  { idArt: '3', baseName: 'C', facturado: 3000, despachado: 3000, kgFacturado: 3, date: '2026-09-02' },
  { idArt: '1', baseName: 'A', facturado: 4000, despachado: 4000, kgFacturado: 4, date: '2026-09-02' },
  { idArt: '4', baseName: 'D', facturado: 5000, despachado: 5000, kgFacturado: 5, date: '2026-09-01' },
  { idArt: '5', baseName: 'E', facturado: 6000, despachado: 6000, kgFacturado: 6, date: '2026-09-02' },
  { idArt: '6', baseName: 'F', facturado: 1000, despachado: 1000, kgFacturado: 1, date: '2026-09-01' }
];

const skuFilter = '';
const showTop5 = true;
const timeView = 'day';
const selectedTimeGroups = []; // empty means all

let filtered = rawProductData;
if (skuFilter) {
  const lowerFilter = skuFilter.toLowerCase();
  filtered = filtered.filter(p => 
    p.idArt.toLowerCase().includes(lowerFilter) || 
    p.baseName.toLowerCase().includes(lowerFilter)
  );
}

const mapGroupDate = (date) => {
    if (timeView === 'month' && date.split('-').length === 3) {
        return date.split('-').slice(0, 2).join('-');
    }
    return date;
};

const mapDisplayDate = (date) => {
    const parts = date.split('-');
    if (parts.length === 3) {
        if (timeView === 'month') return `${parts[1]}/${parts[0]}`;
        return `${parts[2]}/${parts[1]}`;
    }
    return date;
};

// Apply date filter
if (selectedTimeGroups.length > 0) {
    filtered = filtered.filter(p => selectedTimeGroups.includes(mapGroupDate(p.date)));
}

// Find Top 5 overall if showTop5
let allowedIdArts = null;
if (showTop5) {
    const overallProd = new Map();
    filtered.forEach(p => {
        if (!overallProd.has(p.idArt)) overallProd.set(p.idArt, 0);
        overallProd.set(p.idArt, overallProd.get(p.idArt) + p.facturado);
    });
    const sorted = Array.from(overallProd.entries()).sort((a, b) => b[1] - a[1]);
    allowedIdArts = new Set(sorted.slice(0, 5).map(x => x[0]));
}

// Group by idArt + groupDate
const grouped = new Map();
filtered.forEach(p => {
  if (allowedIdArts && !allowedIdArts.has(p.idArt)) return;

  let groupDate = mapGroupDate(p.date);
  let displayDate = mapDisplayDate(p.date);
  
  const aggKey = `${p.idArt}|${groupDate}`;
  if (!grouped.has(aggKey)) {
    let name = p.baseName;
    if (name.length > 20) name = name.substring(0, 17) + '...';
    
    grouped.set(aggKey, {
      idArt: p.idArt,
      groupDate,
      name: `${name} (${displayDate})`,
      originalName: p.baseName,
      facturado: 0,
      despachado: 0,
      kgFacturado: 0,
      rawFacturado: 0,
      date: groupDate
    });
  }
  
  const g = grouped.get(aggKey);
  g.facturado += (p.facturado / 1000);
  g.despachado += (p.despachado / 1000);
  g.kgFacturado += p.kgFacturado;
  g.rawFacturado += p.facturado;
});

let result = Array.from(grouped.values());

// Sort result
// We want to group by Date first, then by Facturado descending
result.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.rawFacturado - a.rawFacturado;
});

if (!showTop5) {
    result = result.slice(0, 50); // limit to avoid crash
}

console.log(result.map(r => r.name));

