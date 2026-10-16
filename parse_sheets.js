import fetch from 'node-fetch';

async function run() {
  const url = 'https://docs.google.com/spreadsheets/d/16pU4iEcNU_1j6sB7rZbshu2PM8OyH5hI7a24-vYO7P0/gviz/tq?tqx=out:json';
  const res = await fetch(url);
  const text = await res.text();
  console.log(text.substring(0, 500));
}
run();
