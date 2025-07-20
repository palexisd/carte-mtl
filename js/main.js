import { fetchAllRecords } from './api.js';
import { initializeMap, drawMarkers, updateAllMarkerIcons } from './map.js';
import { ui, createFilterControls, createToggleControl, updateFilterIndicator, setFilterControlsFromState } from './ui.js';

// --- Global State ---
let allRecords = [];
let currentFilters = {
    arrondissement: 'all',
    type_evenement: 'all',
    emplacement: 'all',
    cout: 'all',
    date: 'all',
    search: ''
};

// --- Core Application Logic ---

/**
 * Filters records based on current state and redraws the map.
 */
function applyFiltersAndRedraw() {
    const filteredRecords = filterRecords();
    drawMarkers(filteredRecords);
    ui.noResultsMessage.classList.toggle('hidden', filteredRecords.length > 0);
    updateURLWithFilters();
    updateFilterIndicator(currentFilters);
}

/**
 * Applies all active filters to the main record list.
 * @returns {Array} The array of filtered records.
 */
function filterRecords() {
    const searchTerm = currentFilters.search.toLowerCase();
    
    return allRecords.filter(record => {
        const boroughMatch = currentFilters.arrondissement === 'all' || record.arrondissement === currentFilters.arrondissement;
        const typeMatch = currentFilters.type_evenement === 'all' || record.type_evenement === currentFilters.type_evenement;
        const emplacementMatch = currentFilters.emplacement === 'all' || record.emplacement === currentFilters.emplacement;
        const coutMatch = currentFilters.cout === 'all' || record.cout === currentFilters.cout;
        
        const searchMatch = !searchTerm || 
                            (record.titre && record.titre.toLowerCase().includes(searchTerm)) || 
                            (record.description && record.description.toLowerCase().includes(searchTerm));

        const dateMatch = checkDateFilter(record);

        return boroughMatch && typeMatch && emplacementMatch && coutMatch && searchMatch && dateMatch;
    });
}

/**
 * Checks if a record matches the current date filter.
 * @param {object} record The record to check.
 * @returns {boolean} True if the record matches, otherwise false.
 */
function checkDateFilter(record) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recordStartDate = new Date(record.date_debut);
    const recordEndDate = new Date(record.date_fin);

    switch (currentFilters.date) {
        case 'today':
            return recordStartDate <= today && today <= recordEndDate;
        case 'thisWeek':
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - today.getDay()) + 1); // End of Sunday
            return recordStartDate < endOfWeek && recordEndDate >= today;
        case 'thisMonth':
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return recordStartDate <= endOfMonth && recordEndDate >= today;
        case 'all':
        default:
            return true;
    }
}


// --- URL Management ---

/**
 * Updates the browser URL with the current filter state.
 */
function updateURLWithFilters() {
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([key, value]) => {
        if ((key === 'search' && value) || (key !== 'search' && value !== 'all')) {
            params.set(key, value);
        }
    });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.pushState({}, '', newUrl);
}

/**
 * Reads filters from the URL on page load and sets the initial state.
 */
function readFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
        if (currentFilters.hasOwnProperty(key)) {
            currentFilters[key] = value;
        }
    });
}


// --- Initialization ---

/**
 * The main function to start the application.
 */
async function main() {
    const map = initializeMap();
    map.on('zoomend', updateAllMarkerIcons);

    try {
        allRecords = await fetchAllRecords();
        console.log(`Successfully fetched all ${allRecords.length} records.`);
        
        readFiltersFromURL();
        createFilterControls(allRecords, currentFilters, applyFiltersAndRedraw);
        setFilterControlsFromState(currentFilters);
        createToggleControl();
        applyFiltersAndRedraw();

    } catch (error) {
        console.error("Failed to initialize application:", error);
        ui.apiErrorMessage.classList.remove('hidden');
    }
}

// Run the application
main();