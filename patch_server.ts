const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const analyzeEndpoint = `
  app.post('/api/analyze-sales', async (req, res) => {
    try {
      const { salesData, months } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY no configurado en el servidor.' });
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = \`Eres un analista de ventas experto. Evalúa el siguiente conjunto de datos que representa los productos más vendidos durante los meses seleccionados (\${months.length > 0 ? months.join(', ') : 'Todos los meses'}).
      
      Datos de ventas (Top productos y montos facturados en USD):
      \${JSON.stringify(salesData, null, 2)}
      
      Por favor, proporciona un análisis global breve y directo (máximo 2 párrafos).
      Destaca los productos estrella, cualquier conclusión evidente y una recomendación estratégica simple para potenciar las ventas.
      No uses saludos ni despedidas, ve directo al grano.\`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error('Error in /api/analyze-sales:', error);
      res.status(500).json({ error: error.message || 'Error interno al procesar el análisis.' });
    }
  });
`;

if (!serverCode.includes('/api/analyze-sales')) {
  serverCode = serverCode.replace("app.post('/api/extract-order'", analyzeEndpoint + "\n  app.post('/api/extract-order'");
  fs.writeFileSync('server.ts', serverCode);
  console.log('Patched server.ts');
}
