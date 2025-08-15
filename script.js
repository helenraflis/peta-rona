// ====== KONFIGURASI ======
const APP_URL = 'https://script.google.com/macros/s/AKfycbxrI5shjSeRG-7x1MOyO43mTtEBK9qcL6lh_R1RR3mawUVVDloIK6Yw_BsYDvDwARmvjg/exec';
const DEFAULT_CENTER = [-6.2, 106.8];
const DEFAULT_ZOOM = 11;

// ====== INISIALISASI PETA ======
const map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Layer untuk marker yang dimuat dari Sheets
const sheetLayer = L.geoJSON([], {
  onEachFeature: (feature, layer) => {
    const p = feature.properties || {};
    const name = p.name || 'Tanpa Nama';
    const time = p.timestamp ? new Date(p.timestamp).toLocaleString() : '';
    layer.bindPopup(`<b>${name}</b><br>${time}`);
  }
}).addTo(map);

// Simpan marker klik-klik (session) agar bisa di-download juga
let localFeatures = [];

// ====== FUNGSI UTILITAS ======
function featurePoint(lat, lng, name = '') {
  return {
    type: 'Feature',
    properties: { name },
    geometry: { type: 'Point', coordinates: [lng, lat] }
  };
}

async function loadFromSheets() {
  try {
    const res = await fetch(APP_URL, { method: 'GET' });
    if (!res.ok) throw new Error('Gagal GET dari Web App');
    const geojson = await res.json();
    sheetLayer.clearLayers();
    sheetLayer.addData(geojson);
  } catch (err) {
    console.error('Load error:', err);
    alert('Gagal memuat data dari Google Sheets. Cek APP_URL & akses Web App.');
  }
}

function downloadGeoJSON(allFeatures) {
  const geojson = { type: 'FeatureCollection', features: allFeatures };
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'markers.geojson'; a.click();
  URL.revokeObjectURL(url);
}

// ====== EVENT: Klik di peta → tambah marker ======
map.on('click', async (e) => {
  const nameInput = document.getElementById('markerName');
  const name = (nameInput.value || '').trim();
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  // Tampilkan segera di peta (feedback instan)
  const m = L.marker([lat, lng]).addTo(map);
  m.bindPopup(`<b>${name || 'Marker Baru'}</b><br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`).openPopup();

  // Simpan ke localFeatures untuk opsi download
  localFeatures.push(featurePoint(lat, lng, name));

  // Kirim ke Google Sheets
  try {
    // Catatan: jika kena CORS, gunakan mode: 'no-cors' (respons tidak bisa dibaca, tapi data terkirim)
    const res = await fetch(APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lng, ts: Date.now() })
      // , mode: 'no-cors' // un-comment jika CORS bermasalah
    });

    // Jika tidak pakai no-cors, kita bisa cek hasilnya
    if (res && res.ok) {
      const json = await res.json().catch(() => ({}));
      if (!json.ok) console.warn('Web App response:', json);
    }
  } catch (err) {
    console.error('POST error:', err);
    alert('Gagal menyimpan ke Google Sheets. Marker tetap tersimpan lokal dan dapat di-download.');
  }
});

// ====== TOMBOL: Download & Reload ======
document.getElementById('downloadBtn').addEventListener('click', () => {
  // Gabungkan marker dari Sheets (yang sudah ada di layer) + yang lokal sesi ini
  const sheetData = sheetLayer.toGeoJSON();
  const allFeatures = [
    ...(sheetData.features || []),
    ...localFeatures
  ];
  downloadGeoJSON(allFeatures);
});

document.getElementById('reloadBtn').addEventListener('click', () => loadFromSheets());

// ====== MUAT DATA AWAL ======
loadFromSheets();

// (Opsional) juga muat data lokal awal jika ada file data.geojson di repo
fetch('./data.geojson')
  .then(r => r.ok ? r.json() : null)
  .then(data => { if (data) sheetLayer.addData(data); })
  .catch(() => {});