//  Ville de Montréal. (2025). Événements publics [Ensemble de données]. Données ouvertes de la Ville de Montréal.
// https://donnees.montreal.ca/dataset/evenements-publics  Vil le de Montréal. (2025). Événements publics [Ensemble de données]. Données ouvertes de la Ville de Montréal.
// https://donnees.montreal.ca/dataset/evenements-publics /// /

// This module handles fetching data from the API.

const RESOURCE_ID = '6decf611-6f11-4f34-bb36-324d804c9bad';
const RECORDS_PER_PAGE = 500;
const API_BASE_URL = 'https://donnees.montreal.ca/api/3/action/datastore_search';

/**
 * Fetches all records from the City of Montréal's open data portal.
 * @returns {Promise<Array>} A promise that resolves to an array of all records.
 */
export async function fetchAllRecords() {
    // First, make a call to get the total number of records.
    const initialUrl = `${API_BASE_URL}?resource_id=${RESOURCE_ID}&limit=1`;
    const initialResponse = await fetch(initialUrl);
    if (!initialResponse.ok) {
        throw new Error(`API Error: ${initialResponse.statusText}`);
    }
    const initialData = await initialResponse.json();
    const totalRecords = initialData.result.total;

    // Create an array of promises for all pages.
    const fetchPromises = [];
    for (let offset = 0; offset < totalRecords; offset += RECORDS_PER_PAGE) {
        const pageUrl = `${API_BASE_URL}?resource_id=${RESOURCE_ID}&limit=${RECORDS_PER_PAGE}&offset=${offset}`;
        fetchPromises.push(fetch(pageUrl).then(response => response.json()));
    }

    // Execute all promises concurrently and combine the results.
    const allPageResults = await Promise.all(fetchPromises);
    const allRecords = [];
    allPageResults.forEach(pageResult => {
        if (pageResult.success && pageResult.result.records) {
            allRecords.push(...pageResult.result.records);
        }
    });

    return allRecords;
}