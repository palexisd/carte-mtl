// This module handles UI creation and DOM manipulation.
import { debounce } from './utils.js';

export const ui = {
  noResultsMessage: document.getElementById('no-results-message'),
  apiErrorMessage: document.getElementById('api-error-message'),
  filterContainer: document.getElementById('filter-container'),
  toggleButton: null,
  resetButton: null,
};

/**
 * Creates and populates the filter controls in the UI.
 * @param {Array} allRecords - The complete list of records to build filter options from.
 * @param {object} currentFilters - The current state of filters.
 * @param {function} onFilterChange - The callback function to execute when a filter changes.
 * @param {function} onReset - The callback function to execute when filters are reset.
 */
export function createFilterControls(
  allRecords,
  currentFilters,
  onFilterChange,
  onReset
) {
  const boroughs = [
    ...new Set(allRecords.map((r) => r.arrondissement).filter(Boolean)),
  ].sort();
  const eventTypes = [
    ...new Set(
      allRecords
        .map((r) => r.type_evenement)
        .filter(Boolean)
        .filter((type) => type !== 'nan')
    ),
  ].sort();
  const emplacements = [
    ...new Set(allRecords.map((r) => r.emplacement).filter(Boolean)),
  ].sort();
  const costs = [...new Set(allRecords.map((r) => r.cout).filter(Boolean))].sort();

  ui.filterContainer.innerHTML = `
        <div class="filter-control">
            <label for="search-filter">Rechercher</label>
            <input type="text" id="search-filter" placeholder="Par titre ou description...">
        </div>
        <div class="filter-control">
            <label for="date-filter">Date</label>
            <select id="date-filter">
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="thisWeek">Cette semaine</option>
                <option value="thisMonth">Ce mois-ci</option>
            </select>
        </div>
        <div class="filter-control">
            <label for="borough-filter">Arrondissement</label>
            <select id="borough-filter">
                <option value="all">Tous les arrondissements</option>
                ${boroughs.map((b) => `<option value="${b}">${b}</option>`).join('')}
            </select>
        </div>
        <div class="filter-control">
            <label for="type-filter">Type d'événement</label>
            <select id="type-filter">
                <option value="all">Tous les types</option>
                ${eventTypes
                  .map((t) => `<option value="${t}">${t}</option>`)
                  .join('')}
            </select>
        </div>
        <div class="filter-control">
            <label for="emplacement-filter">Lieu</label>
            <select id="emplacement-filter">
                <option value="all">Tous les lieux</option>
                ${emplacements
                  .map((e) => `<option value="${e}">${e}</option>`)
                  .join('')}
            </select>
        </div>
        <div class="filter-control">
            <label for="cost-filter">Coût</label>
            <select id="cost-filter">
                <option value="all">Tous les coûts</option>
                ${costs.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>
        <button id="reset-filters">Réinitialiser les filtres</button>
    `;

  const debouncedOnFilterChange = debounce(onFilterChange, 300);

  document
    .getElementById('search-filter')
    .addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      debouncedOnFilterChange();
    });

  const selects = ui.filterContainer.querySelectorAll('select');
  selects.forEach((select) => {
    select.addEventListener('change', (e) => {
      const filterKey = e.target.id.replace('-filter', '');
      if (filterKey === 'borough') {
        currentFilters.arrondissement = e.target.value;
      } else if (filterKey === 'type') {
        currentFilters.type_evenement = e.target.value;
      } else if (filterKey === 'cost') {
        currentFilters.cout = e.target.value;
      } else {
        currentFilters[filterKey] = e.target.value;
      }
      onFilterChange();
    });
  });

  document.getElementById('reset-filters').addEventListener('click', onReset);
}

/**
 * Updates the UI form controls to match the current filter state.
 * @param {object} currentFilters The current state of filters.
 */
export function setFilterControlsFromState(currentFilters) {
  document.getElementById('search-filter').value = currentFilters.search || '';
  document.getElementById('date-filter').value = currentFilters.date || 'all';
  document.getElementById('borough-filter').value =
    currentFilters.arrondissement || 'all';
  document.getElementById('type-filter').value =
    currentFilters.type_evenement || 'all';
  document.getElementById('emplacement-filter').value =
    currentFilters.emplacement || 'all';
  document.getElementById('cost-filter').value = currentFilters.cout || 'all';
}

/**
 * Creates the main map control buttons (toggle and reset).
 * @param {function} onReset - The callback function to execute when the reset button is clicked.
 */
export function createMapControls(onReset) {
  ui.toggleButton = document.createElement('button');
  ui.toggleButton.id = 'filter-toggle';
  ui.toggleButton.className = 'map-control-button';
  ui.toggleButton.title = 'Afficher/masquer les filtres';
  ui.toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z"/></svg>`;
  document.body.appendChild(ui.toggleButton);

  ui.toggleButton.addEventListener('click', () => {
    ui.filterContainer.classList.toggle('hidden');
  });

  ui.resetButton = document.createElement('button');
  ui.resetButton.id = 'reset-button-map';
  ui.resetButton.className = 'map-control-button';
  ui.resetButton.title = 'Réinitialiser les filtres';
  ui.resetButton.classList.add('hidden');
  ui.resetButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>`;
  document.body.appendChild(ui.resetButton);

  ui.resetButton.addEventListener('click', onReset);
}

/**
 * Updates the visibility and style of map controls based on filter state.
 * @param {object} currentFilters The current state of filters.
 */
export function updateFilterIndicator(currentFilters) {
  const isAnyFilterActive = Object.keys(currentFilters).some(
    (key) => {
        if (key === 'event') return currentFilters[key] !== null;
        if (key === 'search') return currentFilters[key] !== '';
        return currentFilters[key] !== 'all';
    }
  );
  ui.toggleButton.classList.toggle('active', isAnyFilterActive);
  ui.resetButton.classList.toggle('hidden', !isAnyFilterActive);
}

/**
 * Creates the geolocation button.
 * @param {function} onGeoLocate - The callback for the geolocation button.
 */
export function createExtraControls(onGeoLocate) {
  const geoButton = document.createElement('button');
  geoButton.id = 'geolocation-button';
  geoButton.className = 'map-control-button';
  geoButton.title = 'Trouver ma position';
  geoButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 0c17.7 0 32 14.3 32 32V66.7C368.4 80.1 431.9 143.6 445.3 224H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H445.3C431.9 368.4 368.4 431.9 288 445.3V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V445.3C143.6 431.9 80.1 368.4 66.7 288H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H66.7C80.1 143.6 143.6 80.1 224 66.7V32c0-17.7 14.3-32 32-32zM128 256a128 128 0 1 0 256 0 128 128 0 1 0 -256 0zm128-80a80 80 0 1 1 0 160 80 80 0 1 1 0-160z"/></svg>`;
  document.body.appendChild(geoButton);
  geoButton.addEventListener('click', onGeoLocate);
}