const fs = require('fs');
const Papa = require('papaparse');
const data = Papa.parse(fs.readFileSync("/tmp/productos.csv", "utf8"), {header: true}).data;
console.log(data.find(d => String(d['Cód. Producto']).trim() === '8'));
