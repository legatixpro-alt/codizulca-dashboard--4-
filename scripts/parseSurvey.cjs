const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { SELLER_EMAIL_MAP } = require('./sellerMap.cjs');

const surveyFilePath = path.join(__dirname, '../src/data/surveyLocations.json');
let existingSurveys = [];
if (fs.existsSync(surveyFilePath)) {
  existingSurveys = JSON.parse(fs.readFileSync(surveyFilePath, 'utf8'));
}

function processCsvContent(csvString) {
  const parsed = Papa.parse(csvString.trim(), {
    header: true,
    skipEmptyLines: true
  });

  const existingByRifOrName = new Map();
  existingSurveys.forEach(s => {
    if (s.rifCedula) existingByRifOrName.set(s.rifCedula.trim().toUpperCase(), s);
    if (s.clienteNombre) existingByRifOrName.set(s.clienteNombre.trim().toUpperCase(), s);
  });

  let added = 0;
  let updated = 0;

  parsed.data.forEach((row, idx) => {
    const lat = parseFloat(row.Latitud);
    const lng = parseFloat(row.Longitud);
    if (isNaN(lat) || isNaN(lng)) return;

    const email = (row.Vendedor || '').trim().toLowerCase();
    const sellerName = SELLER_EMAIL_MAP[email] || row.Vendedor || 'SIN ASIGNAR';
    const clientName = (row.Cliente || '').trim();
    const rif = (row['RIF/Cédula'] || '').trim();
    const key = (rif || clientName).toUpperCase();

    const existing = existingByRifOrName.get(key);
    if (existing) {
      existing.latitud = lat;
      existing.longitud = lng;
      existing.vendedorEmail = email;
      existing.vendedor = sellerName;
      existing.estadoEncuesta = (row['Estado Encuesta'] || existing.estadoEncuesta || 'COMPLETA').trim();
      existing.tipoCliente = (row['Tipo Cliente'] || existing.tipoCliente || '').trim();
      existing.telefono = (row['Teléfono'] || existing.telefono || '').trim();
      existing.estado = (row.Estado || existing.estado || '').trim();
      existing.municipio = (row.Municipio || existing.municipio || '').trim();
      existing.notas = (row.Notas || existing.notas || '').trim();
      existing.fecha = (row.Fecha || existing.fecha || '').trim();
      updated++;
    } else {
      const newId = `SURV-${String(existingSurveys.length + 1).padStart(4, '0')}`;
      const newItem = {
        surveyId: newId,
        clienteId: newId,
        clienteNombre: clientName,
        vendedorEmail: email,
        vendedor: sellerName,
        estadoEncuesta: (row['Estado Encuesta'] || 'COMPLETA').trim(),
        tipoCliente: (row['Tipo Cliente'] || '').trim(),
        rifCedula: rif,
        telefono: (row['Teléfono'] || '').trim(),
        email: (row.Email || '').trim(),
        estado: (row.Estado || '').trim(),
        municipio: (row.Municipio || '').trim(),
        latitud: lat,
        longitud: lng,
        notas: (row.Notas || '').trim(),
        fecha: (row.Fecha || '').trim(),
        matchedWithCartera: false
      };
      existingSurveys.push(newItem);
      existingByRifOrName.set(key, newItem);
      added++;
    }
  });

  fs.writeFileSync(surveyFilePath, JSON.stringify(existingSurveys, null, 2), 'utf8');
  console.log(`Processed: Added ${added}, Updated ${updated}, Total ${existingSurveys.length}`);
}

module.exports = { processCsvContent };
