const fs = require('fs');
const Papa = require('papaparse');
const data = Papa.parse(fs.readFileSync("/tmp/productos.csv", "utf8"), {header: true}).data;
console.log(data.filter(d => String(d['Cód. Producto']).trim() === '8' || String(d['Producto']).includes('8')));
