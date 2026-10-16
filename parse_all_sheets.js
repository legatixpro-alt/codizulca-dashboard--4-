import fs from 'fs';
import Papa from 'papaparse';

async function fetchSheet(sheetName) {
    try {
        const url = sheetName 
            ? `https://docs.google.com/spreadsheets/d/16pU4iEcNU_1j6sB7rZbshu2PM8OyH5hI7a24-vYO7P0/gviz/tq?tqx=out:csv&sheet=${sheetName}`
            : `https://docs.google.com/spreadsheets/d/16pU4iEcNU_1j6sB7rZbshu2PM8OyH5hI7a24-vYO7P0/gviz/tq?tqx=out:csv`;
            
        const res = await fetch(url);
        if(!res.ok) return [];
        const text = await res.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        return result.data;
    } catch(e) {
        return [];
    }
}

async function run() {
    const ventas = await fetchSheet();
    console.log("Ventas rows:", ventas.length);
    if(ventas.length > 0) {
        const sampleDates = ventas.slice(0, 10).map(r => r.Fecha);
        console.log("Sample dates from main sheet:", sampleDates);
    }
}
run();
