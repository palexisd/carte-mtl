// Initialize the map and disable default scroll-to-zoom for custom handling
const map = L.map('map', {
    scrollWheelZoom: false 
}).setView([45.5019, -73.5674], 11);

// Add the styled base map tiles from CARTO
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// A global reference to the cluster group to access it from our functions
let markerClusterGroup;

// --- Custom code for trackpad gestures (pan & zoom) ---
const mapContainer = document.getElementById('map');
mapContainer.addEventListener('wheel', function(event) {
    event.preventDefault();
    // On Mac, a pinch gesture fires a wheel event with the ctrlKey pressed.
    if (event.ctrlKey) {
        if (event.deltaY < 0) { map.zoomIn(); } else { map.zoomOut(); }
    } else {
        // A two-finger slide pans the map.
        map.panBy([event.deltaX, event.deltaY], { animate: false });
    }
});

/**
 * Creates a marker icon with a size appropriate for the current zoom level.
 * This is the reliable way to control marker size.
 * @param {number} zoom The current map zoom level.
 * @returns {L.DivIcon} A Leaflet DivIcon with the correct size.
 */
function createMarkerIcon(zoom) {
    let size;
    if (zoom <= 11) {
        size = 16; // Smallest
    } else if (zoom <= 13) {
        size = 22; // Medium
    } else {
        size = 30; // Full size
    }
    const anchor = size / 2;

    return L.divIcon({
        html: `<span class="marker-pin"></span>`,
        className: 'custom-marker-icon',
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
        popupAnchor: [0, -anchor]
    });
}

/**
 * Updates the icon for every marker on the map to match the current zoom level.
 * This function is called every time the user finishes zooming.
 */
function updateAllMarkerIcons() {
    const currentZoom = map.getZoom();
    const newIcon = createMarkerIcon(currentZoom);

    if (markerClusterGroup) {
        markerClusterGroup.eachLayer(layer => layer.setIcon(newIcon));
    }
}

/**
 * Fetches ALL records and plots them.
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

        const fetchPromises = [];
        for (let offset = 0; offset < totalRecords; offset += recordsPerPage) {
            const pageUrl = `https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=${resourceId}&limit=${recordsPerPage}&offset=${offset}`;
            fetchPromises.push(fetch(pageUrl).then(response => response.json()));
        }

        const allPageResults = await Promise.all(fetchPromises);
        allPageResults.forEach(pageResult => allRecords.push(...pageResult.result.records));
        console.log(`Successfully fetched all ${allRecords.length} records.`);
        
        const initialIcon = createMarkerIcon(map.getZoom());

        markerClusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false, // Correctly disables hover polygon
            // By NOT setting spiderfyOnMaxZoom to false, we allow it to work correctly.
            // By NOT setting disableClusteringAtZoom, we let the plugin decide when to show markers.
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let className = 'custom-cluster';
                if (count < 10) { className += ' small'; } 
                else if (count < 100) { className += ' medium'; } 
                else { className += ' large'; }
                return L.divIcon({ html: `<b>${count}</b>`, className: className, iconSize: L.point(40, 40) });
            }
        });

        allRecords.forEach(record => {
            if (record.lat && record.long) {
                const marker = L.marker([record.lat, record.long], { icon: initialIcon });
                let popupContent = `<div class="custom-popup"><b>${record.titre || 'No Title'}</b>`;
                if (record.description) popupContent += `<p>${record.description}</p>`;
                popupContent += `<hr>`;
                if (record.arrondissement) popupContent += `<b>Borough:</b> ${record.arrondissement}<br>`;
                if (record.type_evenement) popupContent += `<b>Type:</b> ${record.type_evenement}<br>`;
                if (record.cout) popupContent += `<b>Cost:</b> ${record.cout}<br>`;
                if (record.url_fiche) popupContent += `<br><a href="${record.url_fiche}" target="_blank">Official Info Page</a>`;
                popupContent += `</div>`;
                marker.bindPopup(popupContent);
                markerClusterGroup.addLayer(marker);
            }
        });
        
        map.addLayer(markerClusterGroup);

        // Listen for zoom changes to update marker sizes
        map.on('zoomend', updateAllMarkerIcons);

    } catch (error) {
        console.error("Failed to fetch or plot data:", error);
    }
}

// Run the function
plotAllData();
