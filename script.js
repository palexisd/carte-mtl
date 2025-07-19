// Initialize the map, and disable the default scroll-to-zoom
const map = L.map('map', {
    scrollWheelZoom: false 
}).setView([45.5019, -73.5674], 11);

// Add the styled base map tiles from CARTO
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// --- NEW: Custom code for trackpad gestures (pan & zoom) ---
const mapContainer = document.getElementById('map');
mapContainer.addEventListener('wheel', function(event) {
    // Prevent the default browser action (scrolling the page)
    event.preventDefault();

    // On Mac, a pinch gesture fires a wheel event with the ctrlKey pressed.
    if (event.ctrlKey) {
        // This is a pinch gesture, so we'll zoom.
        // A negative deltaY means zooming in (scrolling up), positive means zooming out.
        if (event.deltaY < 0) {
            map.zoomIn();
        } else {
            map.zoomOut();
        }
    } else {
        // This is a two-finger slide, so we'll pan.
        map.panBy([event.deltaX, event.deltaY], { animate: false });
    }
});


/**
 * Fetches ALL records and plots them with custom-styled clusters.
 */
async function plotAllData() {
    const resourceId = '6decf611-6f11-4f34-bb36-324d804c9bad';
    const recordsPerPage = 500;
    let allRecords = [];

    try {
        console.log("Fetching initial data...");
        const initialUrl = `https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=${resourceId}&limit=1`;
        const initialResponse = await fetch(initialUrl);
        const initialData = await initialResponse.json();
        const totalRecords = initialData.result.total;
        console.log(`Total records to fetch: ${totalRecords}`);

        const fetchPromises = [];
        for (let offset = 0; offset < totalRecords; offset += recordsPerPage) {
            const pageUrl = `https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=${resourceId}&limit=${recordsPerPage}&offset=${offset}`;
            fetchPromises.push(fetch(pageUrl).then(response => response.json()));
        }

        const allPageResults = await Promise.all(fetchPromises);
        allPageResults.forEach(pageResult => {
            allRecords.push(...pageResult.result.records);
        });
        console.log(`Successfully fetched all ${allRecords.length} records.`);

        const customMarkerIcon = L.divIcon({
            html: `<span class="marker-pin"></span>`,
            className: 'custom-marker-icon',
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -35]
        });

        const markers = L.markerClusterGroup({
            spiderfyOnMaxZoom: false,
            showCoverageOnHover: false,
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let className = 'custom-cluster';
                if (count < 10) {
                    className += ' small';
                } else if (count < 100) {
                    className += ' medium';
                } else {
                    className += ' large';
                }
                return L.divIcon({
                    html: `<b>${count}</b>`,
                    className: className,
                    iconSize: L.point(40, 40)
                });
            }
        });

        allRecords.forEach(record => {
            if (record.lat && record.long) {
                const marker = L.marker([record.lat, record.long], { icon: customMarkerIcon });
                
                let popupContent = `<div class="custom-popup"><b>${record.titre || 'No Title'}</b>`;
                if (record.description) popupContent += `<p>${record.description}</p>`;
                popupContent += `<hr>`;
                if (record.arrondissement) popupContent += `<b>Borough:</b> ${record.arrondissement}<br>`;
                if (record.type_evenement) popupContent += `<b>Type:</b> ${record.type_evenement}<br>`;
                if (record.cout) popupContent += `<b>Cost:</b> ${record.cout}<br>`;
                if (record.url_fiche) popupContent += `<br><a href="${record.url_fiche}" target="_blank">Official Info Page</a>`;
                popupContent += `</div>`;
                marker.bindPopup(popupContent);

                markers.addLayer(marker);
            }
        });
        
        map.addLayer(markers);

    } catch (error) {
        console.error("Failed to fetch or plot data:", error);
    }
}

// Run the function
plotAllData();