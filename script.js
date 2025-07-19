// Initialize the map and disable default scroll-to-zoom for custom handling
const map = L.map('map', {
    scrollWheelZoom: false 
}).setView([45.5019, -73.5674], 11);

// Add the styled base map tiles from CARTO
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// --- Global variables for data and layers ---
let allRecords = [];
let markerClusterGroup;
let currentFilters = {
    arrondissement: 'all',
    type_evenement: 'all'
};

// --- Custom code for trackpad gestures (pan & zoom) ---
const mapContainer = document.getElementById('map');
mapContainer.addEventListener('wheel', function(event) {
    event.preventDefault();
    if (event.ctrlKey) {
        if (event.deltaY < 0) { map.zoomIn(); } else { map.zoomOut(); }
    } else {
        map.panBy([event.deltaX, event.deltaY], { animate: false });
    }
});

/**
 * Creates a marker icon with a size appropriate for the current zoom level.
 * @param {number} zoom The current map zoom level.
 * @returns {L.DivIcon} A Leaflet DivIcon with the correct size.
 */
function createMarkerIcon(zoom) {
    let size;
    if (zoom <= 11) { size = 16; } 
    else if (zoom <= 13) { size = 22; } 
    else { size = 30; }
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
 */
function updateAllMarkerIcons() {
    const currentZoom = map.getZoom();
    const newIcon = createMarkerIcon(currentZoom);
    if (markerClusterGroup) {
        markerClusterGroup.eachLayer(layer => layer.setIcon(newIcon));
    }
}

/**
 * Filters and plots records based on the currentFilters object.
 */
function applyFiltersAndRedraw() {
    if (markerClusterGroup) {
        markerClusterGroup.clearLayers();
    } else {
        markerClusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let className = 'custom-cluster';
                if (count < 10) { className += ' small'; } 
                else if (count < 100) { className += ' medium'; } 
                else { className += ' large'; }
                return L.divIcon({ html: `<b>${count}</b>`, className: className, iconSize: L.point(40, 40) });
            }
        });
    }

    const filteredRecords = allRecords.filter(record => {
        const boroughMatch = currentFilters.arrondissement === 'all' || record.arrondissement === currentFilters.arrondissement;
        const typeMatch = currentFilters.type_evenement === 'all' || record.type_evenement === currentFilters.type_evenement;
        return boroughMatch && typeMatch;
    });
    
    const initialIcon = createMarkerIcon(map.getZoom());

    filteredRecords.forEach(record => {
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
}

/**
 * Creates and populates the filter controls in the UI.
 */
function createFilterControls() {
    const container = document.getElementById('filter-container');

    // Get unique, sorted values for filters
    const boroughs = [...new Set(allRecords.map(r => r.arrondissement).filter(Boolean))].sort();
    const eventTypes = [...new Set(allRecords.map(r => r.type_evenement).filter(Boolean))].sort();

    // Borough Filter
    let boroughHtml = `
        <div class="filter-control">
            <label for="borough-filter">Borough</label>
            <select id="borough-filter">
                <option value="all">All Boroughs</option>
                ${boroughs.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
        </div>`;

    // Event Type Filter
    let eventTypeHtml = `
        <div class="filter-control">
            <label for="type-filter">Event Type</label>
            <select id="type-filter">
                <option value="all">All Types</option>
                ${eventTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
        </div>`;

    // Reset Button
    let resetButtonHtml = `<button id="reset-filters">Reset Filters</button>`;

    container.innerHTML = boroughHtml + eventTypeHtml + resetButtonHtml;

    // Add event listeners
    const boroughSelect = document.getElementById('borough-filter');
    const typeSelect = document.getElementById('type-filter');
    const resetButton = document.getElementById('reset-filters');

    boroughSelect.addEventListener('change', (e) => {
        currentFilters.arrondissement = e.target.value;
        applyFiltersAndRedraw();
    });

    typeSelect.addEventListener('change', (e) => {
        currentFilters.type_evenement = e.target.value;
        applyFiltersAndRedraw();
    });

    resetButton.addEventListener('click', () => {
        boroughSelect.value = 'all';
        typeSelect.value = 'all';
        currentFilters.arrondissement = 'all';
        currentFilters.type_evenement = 'all';
        applyFiltersAndRedraw();
    });
}

/**
 * Fetches ALL records and initializes the map.
 */
async function fetchAndInitialize() {
    const resourceId = '6decf611-6f11-4f34-bb36-324d804c9bad';
    const recordsPerPage = 500;
    
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
        
        // Once data is fetched, create UI and plot
        createFilterControls();
        applyFiltersAndRedraw();

        // Listen for zoom changes to update marker sizes
        map.on('zoomend', updateAllMarkerIcons);

    } catch (error) {
        console.error("Failed to fetch or plot data:", error);
    }
}

// Run the main function
fetchAndInitialize();