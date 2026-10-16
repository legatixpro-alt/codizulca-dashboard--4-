const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const newHistoricalRoute = `
  app.post('/api/historical-sales', async (req, res) => {
    try {
      const { orClauses } = req.body;
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
          return res.status(500).json({ error: 'Supabase credentials missing on server' });
      }
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl.replace('/rest/v1/', ''), supabaseKey);
      
      const limit = 1000;
      let countQuery = supabase.from('history_sales').select('*', { count: 'exact', head: true });
      if (orClauses) {
          countQuery = countQuery.or(orClauses);
      }
      
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      const numPages = Math.ceil((count || 0) / limit);
      const promises = [];
      
      // Limit to max 300 pages (300k records) to avoid memory crash
      const maxPages = Math.min(numPages, 300);
      
      for (let i = 0; i < maxPages; i++) {
          let q = supabase.from('history_sales')
            .select('id_articulo, articulo, monto, cajas, kgs_lts, ano, mes')
            .range(i * limit, (i + 1) * limit - 1);
          if (orClauses) q = q.or(orClauses);
          promises.push(q);
      }
      
      const results = await Promise.all(promises);
      const grouped = new Map();
      
      results.forEach(resChunk => {
          if (resChunk.data) {
              resChunk.data.forEach(row => {
                  const key = \`\${row.ano}-\${row.mes}-\${row.id_articulo}\`;
                  if (!grouped.has(key)) {
                      grouped.set(key, { ...row });
                  } else {
                      const curr = grouped.get(key);
                      curr.monto += (row.monto || 0);
                      curr.cajas += (row.cajas || 0);
                      curr.kgs_lts += (row.kgs_lts || 0);
                  }
              });
          }
      });
      
      res.json(Array.from(grouped.values()));
    } catch (err: any) {
      console.error('Error fetching historical sales:', err);
      res.status(500).json({ error: err.message });
    }
  });
`;

const startIndex = serverCode.indexOf("app.post('/api/historical-sales'");
const endIndex = serverCode.indexOf("app.post('/api/analyze-sales'");

if (startIndex !== -1 && endIndex !== -1) {
    serverCode = serverCode.substring(0, startIndex) + newHistoricalRoute + "\n  " + serverCode.substring(endIndex);
    fs.writeFileSync('server.ts', serverCode);
    console.log('Patched server.ts successfully');
} else {
    console.log('Could not find boundaries');
}
