// This module handles map initialization and marker drawing.

let map;
let markerClusterGroup;

/**
 * Initializes the Leaflet map and returns the map instance.
 * @returns {L.Map} The initialized Leaflet map object.
 */
export function initializeMap() {
    map = L.map('map', {
        scrollWheelZoom: false,
        attributionControl: false
    }).setView([45.5019, -73.5674], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    map.getContainer().addEventListener('wheel', function(event) {
        event.preventDefault();
        if (event.ctrlKey) {
            if (event.deltaY < 0) { map.zoomIn(); } else { map.zoomOut(); }
        } else {
            map.panBy([event.deltaX, event.deltaY], { animate: false });
        }
    });
    
    return map;
}

/**
 * Creates a marker icon with a size appropriate for the current zoom level.
 * @param {number} zoom The current map zoom level.
 * @returns {L.DivIcon} A Leaflet DivIcon with the correct size.
 */
export function createMarkerIcon(zoom) {
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
export function updateAllMarkerIcons() {
    if (!map || !markerClusterGroup) return;
    const currentZoom = map.getZoom();
    const newIcon = createMarkerIcon(currentZoom);
    markerClusterGroup.eachLayer(layer => layer.setIcon(newIcon));
}

/**
 * Clears existing markers and draws new ones based on the provided records.
 * @param {Array} recordsToDraw The array of records to display on the map.
 */
export function drawMarkers(recordsToDraw) {
    if (!map) return;

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
        map.addLayer(markerClusterGroup);
    }
    
    const initialIcon = createMarkerIcon(map.getZoom());

    recordsToDraw.forEach(record => {
        if (record.lat && record.long) {
            const marker = L.marker([record.lat, record.long], { icon: initialIcon });
            marker.bindPopup(createPopupContent(record));
            markerClusterGroup.addLayer(marker);
        }
    });
}

/**
 * Generates the HTML content for a marker's popup.
 * @param {object} record The data record for the marker.
 * @returns {string} The HTML content string.
 */
function createPopupContent(record) {
    let content = `<div class="custom-popup"><b>${record.titre || 'Sans titre'}</b>`;
    if (record.description) content += `<p>${record.description}</p>`;
    content += `<hr>`;
    
    if (record.arrondissement && record.arrondissement !== 'nan') content += `<b>Arrondissement :</b> ${record.arrondissement}<br>`;
    if (record.type_evenement && record.type_evenement !== 'nan') content += `<b>Type :</b> ${record.type_evenement}<br>`;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (record.date_debut) {
        const startDate = new Date(record.date_debut).toLocaleDateString('fr-CA', options);
        content += `<b>Date de début :</b> ${startDate}<br>`;
    }
    if (record.date_fin && record.date_fin !== record.date_debut) {
        const endDate = new Date(record.date_fin).toLocaleDateString('fr-CA', options);
        content += `<b>Date de fin :</b> ${endDate}<br>`;
    }
    
    if (record.public_cible && record.public_cible !== 'nan') content += `<b>Public cible :</b> ${record.public_cible}<br>`;
    if (record.emplacement && record.emplacement !== 'nan') content += `<b>Emplacement :</b> ${record.emplacement}<br>`;
    if (record.inscription && record.inscription !== 'nan') content += `<b>Inscription :</b> ${record.inscription}<br>`;
    if (record.cout && record.cout !== 'nan') content += `<b>Coût :</b> ${record.cout}<br>`;

    let addressInfo = '';
    if (record.titre_adresse && record.titre_adresse !== 'nan') addressInfo += `${record.titre_adresse}<br>`;
    if (record.adresse_principale && record.adresse_principale !== 'nan') addressInfo += `${record.adresse_principale}<br>`;
    if (record.adresse_secondaire && record.adresse_secondaire !== 'nan') addressInfo += `${record.adresse_secondaire}<br>`;
    if (record.code_postal && record.code_postal !== 'nan') addressInfo += `${record.code_postal}<br>`;
    
    if (addressInfo) {
        content += `<br><b>Adresse :</b><br>${addressInfo}`;
    }

    if (record.url_fiche) content += `<br><a href="${record.url_fiche}" target="_blank">Page d'information officielle</a>`;
    content += `</div>`;
    
    return content;
}