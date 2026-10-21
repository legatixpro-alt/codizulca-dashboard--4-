const fs = require('fs');

const REGIONS = [
  { name: 'Maracaibo_Metro_CostaOccidental', bbox: '10.30,-72.05,11.05,-71.40' },
  { name: 'COL_Perija_Baralt', bbox: '9.75,-72.65,10.50,-70.90' },
  { name: 'Falcon_Completo', bbox: '10.65,-71.10,12.10,-68.50' },
  { name: 'Trujillo_Merida_SurLago', bbox: '8.90,-71.35,9.75,-70.20' },
];

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

async function fetchRegion(region) {
  const query = `[out:json][timeout:90];(way["highway"]["name"](${region.bbox});node["place"]["name"](${region.bbox});way["place"]["name"](${region.bbox});node["amenity"]["name"](${region.bbox}););out center tags;`;
  for (const endpoint of ENDPOINTS) {
    try {
      const t0 = Date.now();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CodizulcaGeofenceEngine/1.0',
        },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) {
        console.warn(`Endpoint ${endpoint} returned ${res.status} for ${region.name}`);
        continue;
      }
      const text = await res.text();
      if (!text.trim().startsWith('{')) {
        console.warn(`Endpoint ${endpoint} returned non-JSON for ${region.name}`);
        continue;
      }
      const json = JSON.parse(text);
      console.log(`Fetched ${region.name}: ${json.elements.length} elements in ${Date.now() - t0}ms`);
      return json.elements || [];
    } catch (err) {
      console.warn(`Error on ${endpoint} for ${region.name}:`, err.message);
    }
  }
  return [];
}

(async () => {
  const allElements = [];
  for (const reg of REGIONS) {
    const els = await fetchRegion(reg);
    allElements.push(...els);
  }
  fs.writeFileSync('scripts/osm_streets_places.json', JSON.stringify(allElements));
  console.log(`Total OSM elements saved: ${allElements.length}`);
})();
