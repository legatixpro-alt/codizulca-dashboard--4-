const fs = require('fs');
const Papa = require('papaparse');
const text = `"Cód. Producto","Producto","Categoria "
"170","TOCINETA AHUM S/CUERO ALIMEX X KG","ENTEROS"`;
const res = Papa.parse(text, {header: true});
console.log(res.data);
