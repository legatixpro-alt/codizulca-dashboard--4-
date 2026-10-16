const rawProductData = [
  { idArt: '1', baseName: 'A', facturado: 1000, despachado: 1000, kgFacturado: 1, date: '2026-09-01' },
  { idArt: '2', baseName: 'B', facturado: 2000, despachado: 2000, kgFacturado: 2, date: '2026-09-01' },
  { idArt: '3', baseName: 'C', facturado: 3000, despachado: 3000, kgFacturado: 3, date: '2026-09-01' },
  { idArt: '4', baseName: 'D', facturado: 4000, despachado: 4000, kgFacturado: 4, date: '2026-09-01' },
  { idArt: '5', baseName: 'E', facturado: 5000, despachado: 5000, kgFacturado: 5, date: '2026-09-01' },
  { idArt: '6', baseName: 'F', facturado: 6000, despachado: 6000, kgFacturado: 6, date: '2026-09-01' },
];

const skuFilter = '';
const showTop5 = true;
const timeView = 'month';

let filtered = rawProductData;
if (skuFilter) {
  const lowerFilter = skuFilter.toLowerCase();
  filtered = filtered.filter(p => 
    p.idArt.toLowerCase().includes(lowerFilter) || 
    p.baseName.toLowerCase().includes(lowerFilter)
  );
}

// Group by timeView
const grouped = new Map();
filtered.forEach(p => {
  let groupDate = p.date; // YYYY-MM-DD
  let displayDate = p.date;
  const dateParts = p.date.split('-');
  
  if (timeView === 'month') {
    if (dateParts.length === 3) {
      groupDate = `${dateParts[0]}-${dateParts[1]}`; // YYYY-MM
      displayDate = `${dateParts[1]}/${dateParts[0]}`;
    }
  } else {
    if (dateParts.length === 3) {
      displayDate = `${dateParts[2]}/${dateParts[1]}`;
    }
  }
  
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

if (showTop5) {
    const byDate = new Map();
    result.forEach(r => {
        if (!byDate.has(r.date)) byDate.set(r.date, []);
        byDate.get(r.date).push(r);
    });
    
    result = [];
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
    for (const d of sortedDates) {
        const arr = byDate.get(d);
        arr.sort((a, b) => b.rawFacturado - a.rawFacturado);
        result.push(...arr.slice(0, 5));
    }
} else {
    result.sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return b.rawFacturado - a.rawFacturado;
    });
}
console.log(result);
