import fetch from 'node-fetch';

async function run() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/16pU4iEcNU_1j6sB7rZbshu2PM8OyH5hI7a24-vYO7P0/gviz/tq?tqx=out:csv');
  const text = await res.text();
  const lines = text.split('\n');
  let sum = 0;
  for(let i=1; i<lines.length; i++) {
    const row = lines[i].split('","');
    if(row.length > 7) {
      const monto = parseFloat(row[7].replace(/["',]/g, ''));
      if(!isNaN(monto)) sum += monto;
    }
  }
  console.log("Total Monto:", sum);
}
run();
