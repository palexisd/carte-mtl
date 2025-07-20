import { config } from './config.js';

const { resourceId, recordsPerPage, baseUrl } = config.api;

/**
 * Fetches all records from the City of Montréal's open data portal.
 * @returns {Promise<Array>} A promise that resolves to an array of all records.
 */
export async function fetchAllRecords() {
  const initialUrl = `${baseUrl}?resource_id=${resourceId}&limit=1`;
  const initialResponse = await fetch(initialUrl);
  if (!initialResponse.ok) {
    throw new Error(`API Error: ${initialResponse.statusText}`);
  }
  const initialData = await initialResponse.json();
  const totalRecords = initialData.result.total;

  const fetchPromises = [];
  for (let offset = 0; offset < totalRecords; offset += recordsPerPage) {
    const pageUrl = `${baseUrl}?resource_id=${resourceId}&limit=${recordsPerPage}&offset=${offset}`;
    fetchPromises.push(fetch(pageUrl).then((response) => response.json()));
  }

  const allPageResults = await Promise.all(fetchPromises);
  const allRecords = [];
  allPageResults.forEach((pageResult) => {
    if (pageResult.success && pageResult.result.records) {
      allRecords.push(...pageResult.result.records);
    }
  });

  return allRecords;
}