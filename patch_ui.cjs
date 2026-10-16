const fs = require('fs');

let uiCode = fs.readFileSync('src/pages/DashboardOverview.tsx', 'utf8');

const oldEffect = `  React.useEffect(() => {
      // We need to fetch historical data for any selected month (either main chart or top products)
      const allRequestedMonths = new Set([...selectedTimeGroups, ...topProductsMonthFilters]);
      const missingGroups = Array.from(allRequestedMonths).filter(g => 
          !rawProductData.some(p => p.date.startsWith(g)) &&
          !historicalData.some(p => p.date.startsWith(g)) &&
          !attemptedGroupsRef.current.has(g)
      );

      if (missingGroups.length > 0) {
          const fetchHistorical = async () => {
              missingGroups.forEach(g => attemptedGroupsRef.current.add(g));
              
              const MONTH_NAMES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
              const orClauses = missingGroups.map(g => {
                  const [y, m] = g.split('-');
                  const monthName = MONTH_NAMES[parseInt(m) - 1];
                  return \`and(ano.eq.\${y},mes.eq.\${monthName})\`;
              }).join(',');
              
              try {
                  const res = await fetch('/api/historical-sales', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orClauses })
                  });
                  
                  if (res.ok) {
                      const fetchedData = await res.json();
                      const parsed = (fetchedData as any[]).map((row: any) => {
                          const monthIndex = MONTH_NAMES.indexOf(row.mes);
                          const gDate = \`\${row.ano}-\${(monthIndex + 1).toString().padStart(2, '0')}\`;
                          return {
                              idArt: String(row.id_articulo),
                              baseName: row.articulo?.trim() || \`Product \${row.id_articulo}\`,
                              facturado: row.monto || 0,
                              despachado: row.kgs_lts || 0,
                              kgFacturado: row.kgs_lts || 0,
                              date: gDate + '-01'
                          };
                      });
                      
                      const groupedHistorical = new Map<string, any>();
                      parsed.forEach(p => {
                          const gd = p.date.substring(0, 7);
                          const k = \`\${p.idArt}|\${gd}\`;
                          if (!groupedHistorical.has(k)) {
                              groupedHistorical.set(k, { ...p, date: gd + '-01' });
                          } else {
                              groupedHistorical.get(k)!.facturado += p.facturado;
                              groupedHistorical.get(k)!.despachado += p.despachado;
                              groupedHistorical.get(k)!.kgFacturado += p.kgFacturado;
                          }
                      });
                      
                      if (groupedHistorical.size > 0) {
                          setHistoricalData(prev => [...prev, ...Array.from(groupedHistorical.values())]);
                      }
                  }
              } catch (e) {
                  console.error("Failed to fetch historical data", e);
              }
          };
          fetchHistorical();
      }
  }, [selectedTimeGroups, topProductsMonthFilters, rawProductData, historicalData]);`;


const newEffect = `  React.useEffect(() => {
      // Fetch all historical data once on mount so all months are instantly available
      let isMounted = true;
      if (!attemptedGroupsRef.current.has('ALL_HISTORY')) {
          attemptedGroupsRef.current.add('ALL_HISTORY');
          const fetchAllHistorical = async () => {
              try {
                  const res = await fetch('/api/historical-sales', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}) // empty fetches everything
                  });
                  
                  if (res.ok && isMounted) {
                      const fetchedData = await res.json();
                      const MONTH_NAMES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                      const parsed = (fetchedData as any[]).map((row: any) => {
                          const monthIndex = MONTH_NAMES.indexOf(row.mes);
                          const gDate = \`\${row.ano}-\${(monthIndex + 1).toString().padStart(2, '0')}\`;
                          return {
                              idArt: String(row.id_articulo),
                              baseName: row.articulo?.trim() || \`Product \${row.id_articulo}\`,
                              facturado: row.monto || 0,
                              despachado: row.kgs_lts || 0,
                              kgFacturado: row.kgs_lts || 0,
                              date: gDate + '-01'
                          };
                      });
                      
                      // Data is already grouped by id_articulo+month in the server
                      if (parsed.length > 0) {
                          setHistoricalData(parsed);
                      }
                  }
              } catch (e) {
                  console.error("Failed to fetch all historical data", e);
              }
          };
          fetchAllHistorical();
      }
      return () => { isMounted = false; };
  }, []);`;

uiCode = uiCode.replace(oldEffect, newEffect);
fs.writeFileSync('src/pages/DashboardOverview.tsx', uiCode);
console.log('Patched UI');
