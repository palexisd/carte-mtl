import { fetchAllRecords } from './api.js';
import {
  initializeMap,
  drawMarkers,
  updateAllMarkerIcons,
  panToUserLocation,
  panAndOpenPopup,
  highlightMarker,
  clearAllHighlights
} from './map.js';
import {
  ui,
  createFilterControls,
  createMapControls,
  updateFilterIndicator,
  setFilterControlsFromState,
  createExtraControls,
  createAboutModal, // Import the new function
} from './ui.js';

// --- Global State ---
let allRecords = [];
let currentFilters = {
  arrondissement: 'all',
  type_evenement: 'all',
  emplacement: 'all',
  cout: 'all',
  date: 'all',
  search: '',
  event: null, // For permalinks
};

// --- Core Application Logic ---

function applyFiltersAndRedraw() {
  clearAllHighlights();
  const filteredRecords = filterRecords();
  
  drawMarkers(filteredRecords);

  // If a single result from search, highlight it
  if (filteredRecords.length === 1 && currentFilters.search) {
      highlightMarker(filteredRecords[0]._id);
  }

  ui.noResultsMessage.classList.toggle('hidden', filteredRecords.length > 0);
  updateURLWithFilters();
  updateFilterIndicator(currentFilters);
}

function resetAllFilters() {
  currentFilters = {
    arrondissement: 'all',
    type_evenement: 'all',
    emplacement: 'all',
    cout: 'all',
    date: 'all',
    search: '',
    event: null,
  };
  setFilterControlsFromState(currentFilters);
  applyFiltersAndRedraw();
}

function filterRecords() {
  const searchTerm = currentFilters.search.toLowerCase();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return allRecords.filter((record) => {
    const recordEndDate = new Date(record.date_fin);
    if (recordEndDate < today) {
      return false;
    }

    const boroughMatch =
      currentFilters.arrondissement === 'all' ||
      record.arrondissement === currentFilters.arrondissement;
    const typeMatch =
      currentFilters.type_evenement === 'all' ||
      record.type_evenement === currentFilters.type_evenement;
    const emplacementMatch =
      currentFilters.emplacement === 'all' ||
      record.emplacement === currentFilters.emplacement;
    const coutMatch =
      currentFilters.cout === 'all' || record.cout === currentFilters.cout;

    const searchMatch =
      !searchTerm ||
      (record.titre && record.titre.toLowerCase().includes(searchTerm)) ||
      (record.description &&
        record.description.toLowerCase().includes(searchTerm));

    const dateMatch = checkDateFilter(record);

    return (
      boroughMatch &&
      typeMatch &&
      emplacementMatch &&
      coutMatch &&
      searchMatch &&
      dateMatch
    );
  });
}

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
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()) + 1);
      return recordStartDate < endOfWeek && recordEndDate >= today;
    case 'thisMonth':
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return recordStartDate <= endOfMonth && recordEndDate >= today;
    default:
      return true;
  }
}

// --- URL Management ---

function updateURLWithFilters() {
  const params = new URLSearchParams();
  Object.entries(currentFilters).forEach(([key, value]) => {
    if (
      (key === 'search' && value) ||
      (key === 'event' && value) ||
      (key !== 'search' && key !== 'event' && value !== 'all' && value !== null)
    ) {
      params.set(key, value);
    }
  });

  const queryString = params.toString();
  const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
  history.pushState({}, '', newUrl);
}

function readFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  params.forEach((value, key) => {
    if (currentFilters.hasOwnProperty(key)) {
        if (key === 'event') {
            currentFilters[key] = Number(value); // event ID is a number
        } else {
            currentFilters[key] = value;
        }
    }
  });
}

// --- Initialization ---

async function main() {
    const onPopupOpen = (eventId) => {
        currentFilters.event = eventId;
        updateURLWithFilters();
        updateFilterIndicator(currentFilters);
    };

    const map = initializeMap(onPopupOpen);
    map.on('zoomend', updateAllMarkerIcons);
    map.on('popupclose', () => {
        currentFilters.event = null;
        updateURLWithFilters();
        updateFilterIndicator(currentFilters);
        clearAllHighlights();
    });

  try {
    allRecords = await fetchAllRecords();

    readFiltersFromURL();
    createFilterControls(
      allRecords,
      currentFilters,
      applyFiltersAndRedraw,
      resetAllFilters
    );
    setFilterControlsFromState(currentFilters);
    createMapControls(resetAllFilters);
    createExtraControls(panToUserLocation);
    createAboutModal(); // Initialize the about modal
    applyFiltersAndRedraw();

    // Handle permalink event after initial draw
    if (currentFilters.event) {
        panAndOpenPopup(currentFilters.event);
    }

  } catch (error) {
    console.error('Failed to initialize application:', error);
    ui.apiErrorMessage.classList.remove('hidden');
  }
}

main();
