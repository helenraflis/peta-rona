// Inisialisasi peta
var map = L.map('map').setView([-6.2, 106.8], 11); // koordinat Jakarta

// Tambahkan basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Tambahkan marker contoh
L.marker([-6.2, 106.8])
  .addTo(map)
  .bindPopup('Halo dari Jakarta!')
  .openPopup();

// Load data GeoJSON
fetch("./data.geojson")
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data).addTo(map);
  })
  .catch(err => console.log("Gagal load GeoJSON:", err));
