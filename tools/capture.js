const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 550, deviceScaleFactor: 2 });
  
  // Read trips data
  const tripsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../trips.json'), 'utf8'));

  // Define HTML content with Leaflet
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html { margin: 0; padding: 0; width: 400px; height: 550px; overflow: hidden; background: transparent; }
        #map { 
          width: 400px; 
          height: 550px; 
          filter: sepia(0.6) contrast(1.1) brightness(0.95);
        }
        /* Custom markers to look like drawn dots */
        .vintage-marker {
          background-color: #7a2828;
          border: 2px solid #3b1717;
          border-radius: 50%;
          box-shadow: 1px 1px 3px rgba(0,0,0,0.5);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            zoomAnimation: false
        }).setView([22, 79], 4.5); // Centered on India

        // Use Carto Light tiles for a clean look suitable for sepia filter
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

        const trips = ${JSON.stringify(tripsData.trips)};
        const bounds = L.latLngBounds([]);

        trips.forEach(trip => {
            if (trip.places) {
                trip.places.forEach(place => {
                    if (place.coordinates) {
                        bounds.extend([place.coordinates.lat, place.coordinates.lng]);
                        L.circleMarker([place.coordinates.lat, place.coordinates.lng], {
                            radius: 4,
                            fillColor: "#8b2e2e",
                            color: "#4a1c1c",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.9
                        }).addTo(map);
                    }
                });
            }
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Wait a moment for tiles to render properly
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: path.join(__dirname, '../assets/india_map.png'), type: 'png' });

  await browser.close();
  console.log('Map screenshot saved successfully!');
})();
