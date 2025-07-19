// Initialize the map and disable default scroll-to-zoom for custom handling
const map = L.map('map', {
    scrollWheelZoom: false,
    attributionControl: false // This line removes the Leaflet attribution
}).setView([45.5019, -73.5674], 11);

// Add the styled base map tiles from CARTO
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
            
            let popupContent = `<div class="custom-popup"><b>${record.titre || 'Sans titre'}</b>`;
            if (record.description) popupContent += `<p>${record.description}</p>`;
            popupContent += `<hr>`;
            
            if (record.arrondissement && record.arrondissement !== 'nan') popupContent += `<b>Arrondissement :</b> ${record.arrondissement}<br>`;
            if (record.type_evenement && record.type_evenement !== 'nan') popupContent += `<b>Type :</b> ${record.type_evenement}<br>`;
            
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            if (record.date_debut) {
                const startDate = new Date(record.date_debut).toLocaleDateString('fr-CA', options);
                popupContent += `<b>Date de début :</b> ${startDate}<br>`;
            }
            if (record.date_fin && record.date_fin !== record.date_debut) {
                const endDate = new Date(record.date_fin).toLocaleDateString('fr-CA', options);
                popupContent += `<b>Date de fin :</b> ${endDate}<br>`;
            }
            
            if (record.public_cible && record.public_cible !== 'nan') popupContent += `<b>Public cible :</b> ${record.public_cible}<br>`;
            if (record.emplacement && record.emplacement !== 'nan') popupContent += `<b>Emplacement :</b> ${record.emplacement}<br>`;
            if (record.inscription && record.inscription !== 'nan') popupContent += `<b>Inscription :</b> ${record.inscription}<br>`;
            if (record.cout && record.cout !== 'nan') popupContent += `<b>Coût :</b> ${record.cout}<br>`;

            let addressInfo = '';
            if (record.titre_adresse && record.titre_adresse !== 'nan') addressInfo += `${record.titre_adresse}<br>`;
            if (record.adresse_principale && record.adresse_principale !== 'nan') addressInfo += `${record.adresse_principale}<br>`;
            if (record.adresse_secondaire && record.adresse_secondaire !== 'nan') addressInfo += `${record.adresse_secondaire}<br>`;
            if (record.code_postal && record.code_postal !== 'nan') addressInfo += `${record.code_postal}<br>`;
            
            if (addressInfo) {
                popupContent += `<br><b>Adresse :</b><br>${addressInfo}`;
            }

            if (record.url_fiche) popupContent += `<br><a href="${record.url_fiche}" target="_blank">Page d'information officielle</a>`;
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

    const boroughs = [...new Set(allRecords.map(r => r.arrondissement).filter(Boolean))].sort();
    const eventTypes = [...new Set(allRecords.map(r => r.type_evenement).filter(Boolean))].sort();

    let boroughHtml = `
        <div class="filter-control">
            <label for="borough-filter">Arrondissement</label>
            <select id="borough-filter">
                <option value="all">Tous les arrondissements</option>
                ${boroughs.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
        </div>`;

    let eventTypeHtml = `
        <div class="filter-control">
            <label for="type-filter">Type d'événement</label>
            <select id="type-filter">
                <option value="all">Tous les types</option>
                ${eventTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
        </div>`;

    let resetButtonHtml = `<button id="reset-filters">Réinitialiser les filtres</button>`;

    container.innerHTML = boroughHtml + eventTypeHtml + resetButtonHtml;

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
 * Creates the toggle button for the filter menu.
 */
function createToggleControl() {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'filter-toggle';
    toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z"/></svg>`;
    document.body.appendChild(toggleButton);

    toggleButton.addEventListener('click', () => {
        document.getElementById('filter-container').classList.toggle('hidden');
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
        
        createFilterControls();
        createToggleControl(); // Create the new toggle button
        applyFiltersAndRedraw();

        map.on('zoomend', updateAllMarkerIcons);

    } catch (error) {
        console.error("Failed to fetch or plot data:", error);
    }
}

// Run the main function
fetchAndInitialize();