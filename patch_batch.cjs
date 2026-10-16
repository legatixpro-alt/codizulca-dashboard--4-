const fs = require('fs');
let serverCode = fs.readFileSync('server.ts', 'utf8');

const newBatchLogic = `
      // Limit to max 300 pages (300k records) to avoid memory crash
      const maxPages = Math.min(numPages, 300);
      
      const results = [];
      const BATCH_SIZE = 20;
      
      for (let i = 0; i < maxPages; i += BATCH_SIZE) {
          const promises = [];
          for (let j = 0; j < BATCH_SIZE && (i + j) < maxPages; j++) {
              let q = supabase.from('history_sales')
                .select('id_articulo, articulo, monto, cajas, kgs_lts, ano, mes')
                .range((i + j) * limit, ((i + j) + 1) * limit - 1);
              if (orClauses) q = q.or(orClauses);
              promises.push(q);
          }
          const batchResults = await Promise.all(promises);
          results.push(...batchResults);
      }
`;

serverCode = serverCode.replace(`      for (let i = 0; i < maxPages; i++) {
          let q = supabase.from('history_sales')
            .select('id_articulo, articulo, monto, cajas, kgs_lts, ano, mes')
            .range(i * limit, (i + 1) * limit - 1);
          if (orClauses) q = q.or(orClauses);
          promises.push(q);
      }
      
      const results = await Promise.all(promises);`, newBatchLogic);

fs.writeFileSync('server.ts', serverCode);
console.log('Patched with batching');
