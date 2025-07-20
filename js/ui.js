// This module handles UI creation and DOM manipulation.
import { debounce } from './utils.js';

export const ui = {
    noResultsMessage: document.getElementById('no-results-message'),
    apiErrorMessage: document.getElementById('api-error-message'),
    filterContainer: document.getElementById('filter-container'),
    toggleButton: null
};

/**
 * Creates and populates the filter controls in the UI.
 * @param {Array} allRecords - The complete list of records to build filter options from.
 * @param {object} currentFilters - The current state of filters.
 * @param {function} onFilterChange - The callback function to execute when a filter changes.
 */
export function createFilterControls(allRecords, currentFilters, onFilterChange) {
    const boroughs = [...new Set(allRecords.map(r => r.arrondissement).filter(Boolean))].sort();
    // MODIFIED LINE: Added a filter to remove the string 'nan'
    const eventTypes = [...new Set(allRecords.map(r => r.type_evenement).filter(Boolean).filter(type => type !== 'nan'))].sort();
    const emplacements = [...new Set(allRecords.map(r => r.emplacement).filter(Boolean))].sort();
    const costs = [...new Set(allRecords.map(r => r.cout).filter(Boolean))].sort();

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
                ${boroughs.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
        </div>
        <div class="filter-control">
            <label for="type-filter">Type d'événement</label>
            <select id="type-filter">
                <option value="all">Tous les types</option>
                ${eventTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
        </div>
        <div class="filter-control">
            <label for="emplacement-filter">Lieu</label>
            <select id="emplacement-filter">
                <option value="all">Tous les lieux</option>
                ${emplacements.map(e => `<option value="${e}">${e}</option>`).join('')}
            </select>
        </div>
        <div class="filter-control">
            <label for="cost-filter">Coût</label>
            <select id="cost-filter">
                <option value="all">Tous les coûts</option>
                ${costs.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>
        <button id="reset-filters">Réinitialiser les filtres</button>
    `;

    // Debounce the filter change handler specifically for the search input
    const debouncedOnFilterChange = debounce(onFilterChange, 300);

    document.getElementById('search-filter').addEventListener('input', e => {
        currentFilters.search = e.target.value;
        debouncedOnFilterChange(); // Use the debounced function here
    });

    // Other filters can trigger the change instantly
    document.getElementById('date-filter').addEventListener('change', e => {
        currentFilters.date = e.target.value;
        onFilterChange();
    });

    document.getElementById('borough-filter').addEventListener('change', e => {
        currentFilters.arrondissement = e.target.value;
        onFilterChange();
    });

    document.getElementById('type-filter').addEventListener('change', e => {
        currentFilters.type_evenement = e.target.value;
        onFilterChange();
    });

    document.getElementById('emplacement-filter').addEventListener('change', e => {
        currentFilters.emplacement = e.target.value;
        onFilterChange();
    });

    document.getElementById('cost-filter').addEventListener('change', e => {
        currentFilters.cout = e.target.value;
        onFilterChange();
    });

    document.getElementById('reset-filters').addEventListener('click', () => {
        Object.keys(currentFilters).forEach(key => currentFilters[key] = key === 'search' ? '' : 'all');
        setFilterControlsFromState(currentFilters);
        onFilterChange();
    });
}

/**
 * Updates the UI form controls to match the current filter state.
 * @param {object} currentFilters The current state of filters.
 */
export function setFilterControlsFromState(currentFilters) {
    document.getElementById('search-filter').value = currentFilters.search;
    document.getElementById('date-filter').value = currentFilters.date;
    document.getElementById('borough-filter').value = currentFilters.arrondissement;
    document.getElementById('type-filter').value = currentFilters.type_evenement;
    document.getElementById('emplacement-filter').value = currentFilters.emplacement;
    document.getElementById('cost-filter').value = currentFilters.cout;
}

/**
 * Creates the toggle button for the filter menu.
 */
export function createToggleControl() {
    ui.toggleButton = document.createElement('button');
    ui.toggleButton.id = 'filter-toggle';
    ui.toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z"/></svg>`;
    document.body.appendChild(ui.toggleButton);

    ui.toggleButton.addEventListener('click', () => {
        ui.filterContainer.classList.toggle('hidden');
    });
}

/**
 * Updates the filter toggle button's style if any filters are active.
 * @param {object} currentFilters The current state of filters.
 */
export function updateFilterIndicator(currentFilters) {
    const isAnyFilterActive = Object.keys(currentFilters).some(key =>
        (key === 'search' && currentFilters[key] !== '') || (key !== 'search' && currentFilters[key] !== 'all')
    );
    ui.toggleButton.classList.toggle('active', isAnyFilterActive);
}