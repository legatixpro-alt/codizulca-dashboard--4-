const fs = require('fs');
const Papa = require('papaparse');
const text = `"Fecha","Id Cliente","Id Articulo","Vendedor","Cajas","Unidades","Kg","Monto","Costo","Utilidad","% de utilidad ","","","","","","","","","","","","","",""
"2026-09-16 0:00:00","8210","8","MARIA BRICEÑO","200","200","200","480","360","120","33.33","","","","","","","","","","","","","",""`;
const res = Papa.parse(text, {header: true});
console.log(res.data[0]);
