import fs from 'fs';

const content = fs.readFileSync('src/pages/TradeMarketing.tsx', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

lines.forEach((line, i) => {
  if (line.includes("activeSubmodule ===") || line.includes("informesTab ===") || line.includes("degustacionSubtab ===") || line.includes("merchandisingSubtab ===")) {
    console.log((i+1) + ': ' + line.trim().slice(0, 120));
  }
});
