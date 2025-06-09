/**
 * Utility functions for normalizing buyer data and generating KNN vectors.
 * Used to process scraped data from go4worldbusiness_buyers.csv and create
 * numerical vectors for k-Nearest Neighbors matching.
 */

/**
 * Normalizes the quantity required field, handling various formats like
 * single values ("100 Tons"), ranges ("1 000 - 3 000 Tons"), containers
 * ("10 Twenty-Foot Container"), and unspecified values ("Not specified").
 * Returns a value in [0, 1] using logarithmic scaling.
 * @param {string} quantity - The quantity string from the CSV.
 * @returns {number} - Normalized quantity value.
 */
const normalizeQuantity = (quantity) => {
    if (!quantity || quantity.toLowerCase() === 'n/a' || quantity.toLowerCase() === 'not specified' || quantity.toLowerCase() === 'moq') {
        return 0.1; // Default value for unspecified quantities
    }

    // Remove commas and normalize spaces
    let cleanedQuantity = quantity.replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    // Handle containers (e.g., "10 Twenty-Foot Container")
    if (cleanedQuantity.includes('twenty-foot container')) {
        const match = cleanedQuantity.match(/(\d+)\s*twenty-foot container/);
        const count = match ? parseInt(match[1]) : 1;
        return normalizeValue(count * 22); // Assume 22 tons per container
    }

    // Handle ranges (e.g., "1 000 - 3 000 Tons")
    let value;
    if (cleanedQuantity.includes('-')) {
        const rangeMatch = cleanedQuantity.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(tons|tonnes|metric tons|mt|t)/i);
        if (rangeMatch) {
            const min = parseFloat(rangeMatch[1]);
            const max = parseFloat(rangeMatch[2]);
            value = (min + max) / 2; // Use average of range
        }
    }

    // Handle single values (e.g., "100 Tons")
    if (!value) {
        const singleMatch = cleanedQuantity.match(/(\d+\.?\d*)\s*(tons|tonnes|metric tons|mt|t)/i);
        value = singleMatch ? parseFloat(singleMatch[1]) : 0;
    }

    // Handle cases with frequency (e.g., "12 000 Metric Tons Monthly")
    if (value === 0) {
        const freqMatch = cleanedQuantity.match(/(\d+\.?\d*)\s*(tons|tonnes|metric tons|mt|t)\s*(monthly|yearly)/i);
        value = freqMatch ? parseFloat(freqMatch[1]) : 0;
    }

    return normalizeValue(value);
};

/**
 * Helper function to normalize a numerical value to [0, 1] using logarithmic scaling.
 * Prevents large quantities from dominating KNN distance calculations.
 * @param {number} value - The raw quantity value in tons.
 * @returns {number} - Normalized value in [0, 1].
 */
const normalizeValue = (value) => {
    if (value <= 0) return 0;
    const maxLogValue = Math.log(1000000); // Max expected quantity: 1 million tons
    return Math.log(value + 1) / maxLogValue; // Logarithmic scaling
};

/**
 * Normalizes the supplier regions field, mapping region names to numerical codes.
 * @param {string} regions - The supplier regions string from the CSV.
 * @returns {number} - Numerical code for the region.
 */
const normalizeSupplierRegions = (regions) => {
    if (!regions || regions === 'N/A') return 0;
    const regionMapping = {
        'worldwide': 1,
        'africa': 2,
        'asia': 3,
        'europe': 4,
        'americas': 5,
        'middle east': 6,
        'india': 7, // Added for specific cases in the CSV
        'canada': 8,
        'australia': 9,
        'ukraine': 10,
        'russia': 11,
        'russian federation': 11 // Alias for Russia
    };
    const normalizedRegion = regions.toLowerCase().trim();
    return regionMapping[normalizedRegion] || 0;
};

/**
 * Normalizes the cereal type field, mapping to 0 (wheat) or 1 (barley).
 * @param {string} cereal - The cereal type string from the CSV.
 * @returns {number} - 0 for wheat, 1 for barley.
 */
const normalizeCerealType = (cereal) => {
    if (!cereal || cereal === 'N/A') return 0;
    return cereal.toLowerCase() === 'wheat' ? 0 : 1;
};

/**
 * Extracts and normalizes a price from the product description.
 * @param {string} description - The product description string from the CSV.
 * @returns {number} - Normalized price in [0, 1].
 */
const extractPrice = (description) => {
    if (!description || description === 'N/A') return 0;
    const priceMatch = description.match(/\$?(\d+\.?\d*)\s*(usd|dollar)/i);
    const value = priceMatch ? parseFloat(priceMatch[1]) : 0;
    const maxPrice = 1000; // Max expected price: $1000 USD
    return value / maxPrice;
};

/**
 * Generates a KNN vector from a buyer object.
 * Combines normalized values for cereal type, quantity, supplier regions, and price.
 * @param {Object} buyer - The buyer object with fields from the CSV.
 * @returns {number[]} - A 4-dimensional vector for KNN matching.
 */
const generateKnnVector = (buyer) => {
    return [
        normalizeCerealType(buyer.cereal_type),
        normalizeQuantity(buyer.quantity_required),
        normalizeSupplierRegions(buyer.supplier_regions),
        extractPrice(buyer.product_description)
    ];
};

export { normalizeQuantity, normalizeSupplierRegions, normalizeCerealType, extractPrice, generateKnnVector };