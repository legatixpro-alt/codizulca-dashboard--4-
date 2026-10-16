const today = new Date();
for(let i=0; i<6; i++) {
  const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  console.log(`${d.getFullYear()}-${m}`);
}
