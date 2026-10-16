const rawProductData = [
  { idArt: '1', baseName: 'A', facturado: 1000, despachado: 1000, kgFacturado: 1, date: '2026-09-01' },
  { idArt: '2', baseName: 'B', facturado: 2000, despachado: 2000, kgFacturado: 2, date: '2026-09-01' },
  { idArt: '3', baseName: 'C', facturado: 3000, despachado: 3000, kgFacturado: 3, date: '2026-09-02' },
  { idArt: '1', baseName: 'A', facturado: 4000, despachado: 4000, kgFacturado: 4, date: '2026-09-02' },
  { idArt: '4', baseName: 'D', facturado: 5000, despachado: 5000, kgFacturado: 5, date: '2026-09-01' },
  { idArt: '5', baseName: 'E', facturado: 6000, despachado: 6000, kgFacturado: 6, date: '2026-09-02' },
  { idArt: '6', baseName: 'F', facturado: 1000, despachado: 1000, kgFacturado: 1, date: '2026-09-01' }
];

const availableGroups = ['2026-09-02', '2026-09-01'];
const timeView = 'day';
const showTop5 = true;
const skuFilter = '';
const selectedTimeGroups = [];

let filtered = rawProductData;

const mapGroupDate = (date) => {
    if (timeView === 'month' && date.split('-').length === 3) {
        return date.split('-').slice(0, 2).join('-');
    }
    return date;
};

let groupsToShow = selectedTimeGroups;
if (groupsToShow.length === 0 && availableGroups.length > 0) {
    groupsToShow = [availableGroups[0]];
}

if (groupsToShow.length > 0) {
    filtered = filtered.filter(p => groupsToShow.includes(mapGroupDate(p.date)));
}

let allowedIdArts = null;
if (showTop5) {
    const byDate = new Map();
    filtered.forEach(p => {
        const gd = mapGroupDate(p.date);
        if (!byDate.has(gd)) byDate.set(gd, new Map());
        const dMap = byDate.get(gd);
        if (!dMap.has(p.idArt)) dMap.set(p.idArt, 0);
        dMap.set(p.idArt, dMap.get(p.idArt) + p.facturado);
    });
    
    allowedIdArts = new Set();
    byDate.forEach((dMap, gd) => {
        const sorted = Array.from(dMap.entries()).sort((a,b) => b[1] - a[1]);
        sorted.slice(0, 5).forEach(x => allowedIdArts.add(`${x[0]}|${gd}`));
    });
}

const grouped = new Map();
filtered.forEach(p => {
  let groupDate = mapGroupDate(p.date);
  
  if (allowedIdArts && !allowedIdArts.has(`${p.idArt}|${groupDate}`)) return;

  const aggKey = `${p.idArt}|${groupDate}`;
  if (!grouped.has(aggKey)) {
    grouped.set(aggKey, {
      name: `${p.baseName} (${groupDate})`,
      rawFacturado: 0
    });
  }
  grouped.get(aggKey).rawFacturado += p.facturado;
});

let result = Array.from(grouped.values());
result.sort((a, b) => b.rawFacturado - a.rawFacturado);
console.log(result);
