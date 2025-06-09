import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let countryMapping = {};
try {
    const data = fs.readFileSync(path.join(__dirname, '../countryMapping.json'), 'utf8');
    if (!data.trim()) {
        throw new Error('countryMapping.json is empty');
    }
    countryMapping = JSON.parse(data);
    console.log('Loaded countryMapping:', Object.keys(countryMapping).length, 'countries');
} catch (error) {
    console.error('Failed to load countryMapping.json:', error.message);
    countryMapping = {
        au: 0.3, tunisia: 1.0, cn: 0.2, us: 0.8, tr: 0.4, th: 0.5, ca: 0.7, at: 0.6, ua: 0.9, kz: 0.3,
        ae: 0.2, in: 0.5, br: 0.4, za: 0.3, fr: 1.0, pk: 0.4, de: 0.6
    };
}

export const normalizeText = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const normalizePrice = (price) => {
    if (!price) return '0 USD/ton';
    const match = price.match(/[\d.]+/);
    return match ? `${match[0]} USD/ton` : '0 USD/ton';
};

export const parseQuantity = (qty) => {
    if (!qty || typeof qty !== 'string') {
        console.warn(`Invalid quantity input: ${qty}`);
        return 0;
    }
    // Match numbers (with optional decimals) followed by optional units
    const match = qty.match(/(\d+\.?\d*)\s*(tonnesmtriques|tonnes|tons|ton|mt|t)?/i);
    if (!match) {
        console.warn(`Failed to parse quantity: ${qty}`);
        return 0;
    }
    const value = parseFloat(match[1]);
    if (isNaN(value)) {
        console.warn(`Parsed quantity is NaN for input: ${qty}`);
        return 0;
    }
    return value;
};

export const generateBuyerFormVector = ({ quantityDesired, productCategory, deliveryLocation, pricePerUnit }) => {
    try {
        const maxQuantity = 1000000;
        const maxPrice = 1000;

        if (!quantityDesired || !quantityDesired.value || !pricePerUnit || !pricePerUnit.value) {
            console.warn('Invalid quantityDesired or pricePerUnit:', { quantityDesired, pricePerUnit });
            return [0, 0, 0, 0];
        }

        const quantity = quantityDesired.value / maxQuantity;
        const cropType = productCategory === 'Wheat' ? 0 : 1;
        const country = countryMapping[normalizeText(deliveryLocation)] || 0;

        if (!countryMapping[normalizeText(deliveryLocation)]) {
            console.warn(`No country mapping for ${normalizeText(deliveryLocation)}, using 0`);
        }

        const price = pricePerUnit.value / maxPrice;

        const vector = [quantity, cropType, country, price];
        console.log(`Generated BuyerForm vector for ${deliveryLocation}:`, vector);
        return vector;
    } catch (error) {
        console.error('Error generating BuyerForm vector:', error.message);
        return [0, 0, 0, 0];
    }
};

export const generateFarmerFormVector = ({ quantityAvailable, productCategory, destination, pricePerUnit }) => {
    try {
        const maxQuantity = 1000000;
        const maxPrice = 1000;

        if (!quantityAvailable || !quantityAvailable.value || !pricePerUnit || !pricePerUnit.value) {
            console.warn('Invalid quantityAvailable or pricePerUnit:', { quantityAvailable, pricePerUnit });
            return [0, 0, 0, 0];
        }

        const quantity = quantityAvailable.value / maxQuantity;
        const cropType = productCategory === 'Wheat' ? 0 : 1;
        const country = countryMapping[normalizeText(destination)] || 0;

        if (!countryMapping[normalizeText(destination)]) {
            console.warn(`No country mapping for ${normalizeText(destination)}, using 0`);
        }

        const price = pricePerUnit.value / maxPrice;

        const vector = [quantity, cropType, country, price]; // Correction ici

        console.log(`Generated FarmerForm vector for ${destination}:`, vector);
        return vector;
    } catch (error) {
        console.error('Error generating FarmerForm vector:', error.message);
        return [0, 0, 0, 0];
    }
};

export const generateOfferVector = ({ min_quantity, crop_type, supplier_info, price }) => {
    try {
        const maxQuantity = 1000000;
        const maxPrice = 1000;

        const quantity = parseQuantity(min_quantity) / maxQuantity;
        const cropType = normalizeText(crop_type) === 'wheat' ? 0 : 1;

        const extractCountry = (info) => {
            const infoLower = normalizeText(info || '');
            const countries = ['au', 'tn', 'cn', 'us', 'tr', 'th', 'ca', 'at', 'ua', 'kz', 'ae', 'in', 'br', 'za', 'fr', 'pk', 'de'];
            return countries.find(country => infoLower.includes(country)) || '';
        };

        const countryCode = extractCountry(supplier_info);
        const country = countryMapping[countryCode] || 0;

        if (!countryCode || !countryMapping[countryCode]) {
            console.warn(`No country mapping for supplier_info: ${supplier_info}, countryCode: ${countryCode}, using 0`);
        }

        const priceMatch = price.match(/[\d.]+/);
        const priceValue = priceMatch ? parseFloat(priceMatch[0]) / maxPrice : 0;

        const vector = [quantity, cropType, country, priceValue];
        console.log(`Generated Offer vector for ${supplier_info} (${countryCode}):`, vector);

        // Warn only if quantity, country, or price are 0 (allow cropType to be 0 for wheat)
        if ([quantity, country, priceValue].every(v => v === 0)) {
            console.warn(
                `Generated near-null vector for offer: min_quantity=${min_quantity}, crop_type=${crop_type}, supplier_info=${supplier_info}, price=${price}, vector=${JSON.stringify(vector)}`
            );
        }

        return vector;
    } catch (error) {
        console.error('Error generating Offer vector:', error.message, { min_quantity, crop_type, supplier_info, price });
        return [0, 0, 0, 0];
    }
};