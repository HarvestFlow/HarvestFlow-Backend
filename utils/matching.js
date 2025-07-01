import FarmerForm from '../models/FarmerForm.js';
import Offer from '../models/Offer.js';
import BuyerForm from '../models/BuyerForm.js';
import { WheatBuyer } from '../models/WheatBuyer.js';
import { normalizeText } from '../utils/offerNormalization.js';
import winston from 'winston';
import { getCode } from 'country-list';

const logger = winston.createLogger({
    transports: [
        new winston.transports.File({ filename: 'logs/server.log' }),
        new winston.transports.Console()
    ]
});

let recalculationPending = false;

const triggerRecalculation = async () => {
    if (recalculationPending) {
        logger.info('Recalculation pending, skipping...');
        return;
    }
    recalculationPending = true;
    try {
        await recalculateAllMatches();
        logger.info('Recalculation completed');
    } catch (error) {
        logger.error('Recalculation error:', error.message);
    } finally {
        recalculationPending = false;
    }
};

const findOfferMatches = async ({ queryVector, cropType, preferredCountries = [] }) => {
    try {
        if (!queryVector || queryVector.length !== 4 || queryVector.some(v => isNaN(v))) {
            logger.error('Invalid query vector:', queryVector);
            return [];
        }
        if (!cropType || !['Wheat', 'Barley'].includes(cropType)) {
            logger.error('Invalid crop type:', cropType);
            return [];
        }

        logger.info(`Matching for cropType: ${cropType}, preferredCountries: ${preferredCountries}`);

        const weights = [0.4, 0.1, 0.1, 0.4];
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);

        const matches = [];

        const computeDistance = (vec1, vec2) => {
            let sum = 0;
            for (let i = 0; i < vec1.length; i++) {
                sum += normalizedWeights[i] * Math.pow(vec1[i] - vec2[i], 2);
            }
            return Math.sqrt(sum);
        };

        const normalizeCountry = (country) => {
            if (!country) return '';
            const countryLower = normalizeText(country).toLowerCase();
            const countryMap = {
                'australia': 'AU',
                'azerbaijan': 'AZ',
                'tunisia': 'TN',
                'united states': 'US',
                'canada': 'CA',
                'kazakhstan': 'KZ',
                'france': 'FR'
            };
            const code = countryMap[countryLower] || getCode(countryLower) || getCode(countryLower.replace(/republic of |united /g, ''));
            return code ? code.toUpperCase() : '';
        };

        const normalizeCountryArray = (countries) => {
            if (!Array.isArray(countries)) return [];
            return countries.map(normalizeCountry).filter(c => c);
        };

        const extractCountry = (info) => {
            const infoLower = normalizeText(info || '').toLowerCase();
            const countries = ['AU', 'TN', 'CN', 'US', 'TR', 'TH', 'CA', 'AT', 'UA', 'KZ', 'AE', 'IN', 'BR', 'ZA', 'FR', 'PK', 'DE'];
            return countries.find(country => infoLower.includes(country.toLowerCase())) || '';
        };

        const farmerForms = await FarmerForm.find({
            productCategory: cropType,
            availabilityEndDate: { $gte: new Date() }
        }).lean();
        logger.info(`Fetched farmerForms: ${farmerForms.length}`);

        const offers = await Offer.find({
            crop_type: cropType.toLowerCase(),
            status: 'active'
        }).lean();
        logger.info(`Fetched offers: ${offers.length}`);

        let countryMatches = 0;

        for (const form of farmerForms) {
            try {
                const formCountry = normalizeCountry(form.destination);
                const normalizedPreferred = normalizeCountryArray(preferredCountries);
                if (normalizedPreferred.length > 0 && !normalizedPreferred.includes(formCountry)) {
                    logger.warn(`Skipping FarmerForm ${form._id} due to destination: ${form.destination} (normalized: ${formCountry})`);
                    continue;
                }
                if (!form.vector || form.vector.length !== 4) {
                    logger.warn(`Invalid vector for FarmerForm ${form._id}`);
                    continue;
                }
                const distance = computeDistance(queryVector, form.vector);
                const similarity = 1 / (1 + distance);
                matches.push({
                    type: 'farmer_form',
                    item: {
                        id: form._id.toString(),
                        title: form.title,
                        quantity: form.quantityAvailable?.value || 0,
                        price: form.pricePerUnit?.value || 0,
                        location: form.destination,
                        contact: form.contactName,
                        email: form.company?.contactEmail || 'N/A'
                    },
                    similarity,
                    reason: `Matches due to similar quantity (${form.quantityAvailable?.value || 0} tons) and price (${form.pricePerUnit?.value || 0} USD)`
                });
                countryMatches++;
            } catch (error) {
                logger.warn(`Error processing FarmerForm ${form._id}: ${error.message}`);
            }
        }

        for (const offer of offers) {
            try {
                const offerCountry = extractCountry(offer.supplier_info);
                const normalizedPreferred = normalizeCountryArray(preferredCountries);
                if (normalizedPreferred.length > 0 && !normalizedPreferred.includes(offerCountry)) {
                    logger.warn(`Skipping Offer ${offer.offer_id} due to supplier_info: ${offer.supplier_info} (normalized: ${offerCountry})`);
                    continue;
                }
                if (!offer.vector || offer.vector.length !== 4) {
                    logger.warn(`Invalid vector for Offer ${offer.offer_id}`);
                    continue;
                }
                const distance = computeDistance(queryVector, offer.vector);
                const similarity = 1 / (1 + distance);
                matches.push({
                    type: 'external_offer',
                    item: {
                        id: offer.offer_id,
                        title: offer.title,
                        quantity: offer.min_quantity || 'N/A',
                        price: offer.price || 'N/A',
                        location: offer.supplier_info,
                        contact: offer.contact_name || 'N/A',
                        email: offer.email || 'N/A'
                    },
                    similarity,
                    reason: `Matches due to similar quantity (${offer.min_quantity || 'N/A'}) and price (${offer.price || 'N/A'})`
                });
                countryMatches++;
            } catch (error) {
                logger.warn(`Error processing Offer ${offer.offer_id}: ${error.message}`);
            }
        }

        logger.info(`Total country matches: ${countryMatches}`);

        if (matches.length === 0 && (farmerForms.length > 0 || offers.length > 0)) {
            logger.info('No country matches found, including top matches based on price and quantity');
            for (const form of farmerForms.slice(0, 2)) {
                try {
                    if (!form.vector || form.vector.length !== 4) continue;
                    const distance = computeDistance(queryVector, form.vector);
                    const similarity = 1 / (1 + distance);
                    matches.push({
                        type: 'farmer_form',
                        item: {
                            id: form._id.toString(),
                            title: form.title,
                            quantity: form.quantityAvailable?.value || 0,
                            price: form.pricePerUnit?.value || 0,
                            location: form.destination,
                            contact: form.contactName,
                            email: form.company?.contactEmail || 'N/A'
                        },
                        similarity,
                        reason: `Included due to no country matches; similar quantity (${form.quantityAvailable?.value || 0} tons) and price (${form.pricePerUnit?.value || 0} USD)`
                    });
                } catch (error) {
                    logger.warn(`Error in fallback for FarmerForm ${form._id}: ${error.message}`);
                }
            }
            for (const offer of offers.slice(0, 2)) {
                try {
                    if (!offer.vector || offer.vector.length !== 4) continue;
                    const distance = computeDistance(queryVector, offer.vector);
                    const similarity = 1 / (1 + distance);
                    matches.push({
                        type: 'external_offer',
                        item: {
                            id: offer.offer_id,
                            title: offer.title,
                            quantity: offer.min_quantity || 'N/A',
                            price: offer.price || 'N/A',
                            location: offer.supplier_info,
                            contact: offer.contact_name || 'N/A',
                            email: offer.email || 'N/A'
                        },
                        similarity,
                        reason: `Included due to no country matches; similar quantity (${offer.min_quantity || 'N/A'}) and price (${offer.price || 'N/A'})`
                    });
                } catch (error) {
                    logger.warn(`Error in fallback for Offer ${offer.offer_id}: ${error.message}`);
                }
            }
        }

        logger.info(`Total matches before sorting: ${matches.length}`);
        matches.sort((a, b) => b.similarity - a.similarity);

        return matches.slice(0, 3);
    } catch (error) {
        logger.error('Error finding offer matches:', error.message);
        return [];
    }
};

const findBuyerMatches = async ({ queryVector, cropType, lookingForBuyersFrom = [], farmerFormId }) => {
    try {
        if (!queryVector || queryVector.length !== 4 || queryVector.some(v => isNaN(v))) {
            logger.error(`Invalid query vector for FarmerForm ${farmerFormId}: ${JSON.stringify(queryVector)}`);
            return [];
        }
        if (!cropType || !['Wheat', 'Barley'].includes(cropType)) {
            logger.error(`Invalid crop type for FarmerForm ${farmerFormId}: ${cropType}`);
            return [];
        }

        logger.info(`Matching for FarmerForm ${farmerFormId}, cropType: ${cropType}, lookingForBuyersFrom: ${lookingForBuyersFrom}`);

        const weights = [0.5, 0.1, 0.1, 0.4];
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);

        const matches = [];

        const computeDistance = (vec1, vec2) => {
            let sum = 0;
            for (let i = 0; i < vec1.length; i++) {
                sum += normalizedWeights[i] * Math.pow(vec1[i] - vec2[i], 2);
            }
            return Math.sqrt(sum);
        };

        const normalizeCountry = (country) => {
            if (!country) return '';
            const countryLower = normalizeText(country).toLowerCase();
            const countryMap = {
                'australia': 'AU',
                'azerbaijan': 'AZ',
                'tunisia': 'TN',
                'united states': 'US',
                'canada': 'CA',
                'kazakhstan': 'KZ',
                'france': 'FR'
            };
            const code = countryMap[countryLower] || getCode(countryLower) || getCode(countryLower.replace(/republic of |united /g, ''));
            return code ? code.toUpperCase() : '';
        };

        const normalizeCountryArray = (countries) => {
            if (!Array.isArray(countries)) return [];
            return countries.map(normalizeCountry).filter(c => c);
        };

        const extractCountry = (info) => {
            const infoLower = normalizeText(info || '').toLowerCase();
            const countries = ['AU', 'TN', 'CN', 'US', 'TR', 'TH', 'CA', 'AT', 'UA', 'KZ', 'AE', 'IN', 'BR', 'ZA', 'FR', 'PK', 'DE'];
            return countries.find(country => infoLower.includes(country.toLowerCase())) || '';
        };

        const parseQuantity = (qty) => {
            if (!qty || qty === 'N/A') return null;
            const match = qty.match(/(\d+\.?\d*)\s*(tons|ton|mt|tonnes|tonnesmtriques)/i);
            return match ? Number(match[1]) : null;
        };

        const parsePrice = (description) => {
            if (!description || description === 'N/A') return null;
            const match = description.match(/Price:\s*\$?(\d+\.?\d*)/i) ||
                         description.match(/(\d+\.?\d*)\s*USD\/ton/i);
            return match ? Number(match[1]) : null;
        };

        const farmerForm = await FarmerForm.findById(farmerFormId).select('userId').lean();
        if (!farmerForm) {
            logger.error(`FarmerForm ${farmerFormId} not found`);
            return [];
        }
        const farmerUserId = farmerForm.userId;

        const farmerCountries = normalizeCountryArray(lookingForBuyersFrom);
        if (farmerCountries.length === 0) {
            logger.warn(`FarmerForm ${farmerFormId} has no valid lookingForBuyersFrom: ${lookingForBuyersFrom}`);
        }

        // 1. Match BuyerForms
        const buyerForms = await BuyerForm.find({
            productCategory: cropType,
            offerEndDate: { $gte: new Date() },
            userId: { $ne: farmerUserId } // Exclude BuyerForms from the same user
        }).lean();
        logger.info(`Fetched ${buyerForms.length} buyerForms for FarmerForm ${farmerFormId}`);

        let countryMatches = 0;

        for (const buyerForm of buyerForms) {
            try {
                if (!buyerForm.quantityDesired?.value || !buyerForm.pricePerUnit?.value ||
                    buyerForm.quantityDesired.value <= 0 || buyerForm.pricePerUnit.value <= 0 ||
                    !buyerForm.quantityDesired.unit || !buyerForm.pricePerUnit.currency) {
                    logger.warn(`Skipping BuyerForm ${buyerForm._id}: invalid quantity=${buyerForm.quantityDesired?.value}, price=${buyerForm.pricePerUnit?.value}`);
                    continue;
                }

                const buyerCountries = normalizeCountryArray(buyerForm.preferredSuppliersFrom || []);
                if (buyerCountries.length === 0) {
                    logger.warn(`BuyerForm ${buyerForm._id} has no valid preferredSuppliersFrom: ${buyerForm.preferredSuppliersFrom}`);
                }

                let countryMatch = false;
                let countryReason = '';
                if (farmerCountries.length === 0 || buyerCountries.length === 0) {
                    countryMatch = true;
                    countryReason = `Matched: no country restrictions (farmerCountries=${farmerCountries}, buyerCountries=${buyerCountries})`;
                } else {
                    const commonCountries = farmerCountries.filter(c => buyerCountries.includes(c));
                    countryMatch = commonCountries.length > 0;
                    countryReason = countryMatch
                        ? `Matched: common countries ${commonCountries.join(', ')}`
                        : `No match: farmerCountries=${farmerCountries} vs buyerCountries=${buyerCountries}`;
                }

                if (!countryMatch) {
                    logger.info(`Country mismatch for BuyerForm ${buyerForm._id}: ${countryReason}`);
                    continue;
                }

                if (!buyerForm.vector || buyerForm.vector.length !== 4) {
                    logger.warn(`Invalid vector for BuyerForm ${buyerForm._id}: ${JSON.stringify(buyerForm.vector)}`);
                    continue;
                }

                const distance = computeDistance(queryVector, buyerForm.vector);
                let similarity = 1 / (1 + distance);

                if (farmerForm.quantityAvailable?.value === buyerForm.quantityDesired?.value &&
                    farmerForm.pricePerUnit?.value === buyerForm.pricePerUnit?.value) {
                    similarity = Math.min(similarity + 0.2, 1.0);
                    logger.info(`Boosted similarity for BuyerForm ${buyerForm._id} due to exact quantity=${buyerForm.quantityDesired.value}, price=${buyerForm.pricePerUnit.value}`);
                }
                if (countryMatch && farmerCountries.length > 0 && buyerCountries.length > 0) {
                    similarity = Math.min(similarity + 0.1, 1.0);
                    logger.info(`Boosted similarity for BuyerForm ${buyerForm._id} due to country match: ${countryReason}`);
                }

                logger.info(`BuyerForm ${buyerForm._id}: title=${buyerForm.title}, distance=${distance}, similarity=${similarity}, vector=${JSON.stringify(buyerForm.vector)}, quantity=${buyerForm.quantityDesired.value}, price=${buyerForm.pricePerUnit.value}, countryReason=${countryReason}`);
                if (similarity < 0.5) {
                    logger.warn(`BuyerForm ${buyerForm._id} skipped due to low similarity: ${similarity}`);
                    continue;
                }

                matches.push({
                    type: 'buyer_form',
                    item: {
                        id: buyerForm._id.toString(),
                        title: buyerForm.title,
                        quantity: buyerForm.quantityDesired.value,
                        price: buyerForm.pricePerUnit.value,
                        location: buyerCountries.join(', ') || 'N/A',
                        contact: buyerForm.contactName || 'N/A',
                        email: buyerForm.company?.contactEmail || 'N/A'
                    },
                    similarity,
                    reason: `Matches due to: ${countryReason}; similar quantity (${buyerForm.quantityDesired.value} tons) and price (${buyerForm.pricePerUnit.value} USD)`
                });
                countryMatches++;
            } catch (error) {
                logger.warn(`Error processing BuyerForm ${buyerForm._id}: ${error.message}`);
            }
        }

        // 2. Match WheatBuyer
        const wheatBuyers = await WheatBuyer.find({
            cereal_type: cropType,
            is_active: true
        }).lean();
        logger.info(`Fetched ${wheatBuyers.length} WheatBuyer records for FarmerForm ${farmerFormId}`);

        for (const buyer of wheatBuyers) {
            try {
                const buyerCountries = normalizeCountryArray(buyer.supplier_regions || []);
                if (buyerCountries.length === 0) {
                    logger.warn(`WheatBuyer ${buyer.buyer_id} has no valid supplier_regions: ${buyer.supplier_regions}`);
                }

                let countryMatch = false;
                let countryReason = '';
                if (farmerCountries.length === 0 || buyerCountries.length === 0) {
                    countryMatch = true;
                    countryReason = `Matched: no country restrictions (farmerCountries=${farmerCountries}, buyerCountries=${buyerCountries})`;
                } else {
                    const commonCountries = farmerCountries.filter(c => buyerCountries.includes(c));
                    countryMatch = commonCountries.length > 0;
                    countryReason = countryMatch
                        ? `Matched: common countries ${commonCountries.join(', ')}`
                        : `No match: farmerCountries=${farmerCountries} vs buyerCountries=${buyerCountries}`;
                }

                if (!countryMatch) {
                    logger.info(`Country mismatch for WheatBuyer ${buyer.buyer_id}: ${countryReason}`);
                    continue;
                }

                if (!buyer.vector || buyer.vector.length !== 4) {
                    logger.warn(`Invalid vector for WheatBuyer ${buyer.buyer_id}: ${JSON.stringify(buyer.vector)}`);
                    continue;
                }

                const quantity = parseQuantity(buyer.quantity_required);
                if (!quantity || quantity <= 0) {
                    logger.warn(`Invalid quantity for WheatBuyer ${buyer.buyer_id}: quantity_required=${buyer.quantity_required}`);
                    continue;
                }

                const price = parsePrice(buyer.product_description);
                const distance = computeDistance(queryVector, buyer.vector);
                let similarity = 1 / (1 + distance);

                if (farmerForm.quantityAvailable?.value === quantity &&
                    farmerForm.pricePerUnit?.value === price) {
                    similarity = Math.min(similarity + 0.2, 1.0);
                    logger.info(`Boosted similarity for WheatBuyer ${buyer.buyer_id} due to exact quantity=${quantity}, price=${price}`);
                }
                if (countryMatch && farmerCountries.length > 0 && buyerCountries.length > 0) {
                    similarity = Math.min(similarity + 0.1, 1.0);
                    logger.info(`Boosted similarity for WheatBuyer ${buyer.buyer_id} due to country match: ${countryReason}`);
                }

                logger.info(`WheatBuyer ${buyer.buyer_id}: title=${buyer.title || 'N/A'}, distance=${distance}, similarity=${similarity}, vector=${JSON.stringify(buyer.vector)}, quantity=${quantity}, price=${price || 'N/A'}`);
                if (similarity < 0.5) {
                    logger.warn(`WheatBuyer ${buyer.buyer_id} skipped due to low similarity: ${similarity}`);
                    continue;
                }

                matches.push({
                    type: 'wheat_buyer',
                    item: {
                        id: 'wbh001',
                        title: 'External Buyer Match',
                        quantity: quantity,
                        price: price || '0',
                        location: buyerCountries.join(', ') || 'N/A',
                        contact: buyer.contact_name || 'N/A',
                        email: 'N/A'
                    },
                    similarity,
                    reason: `Matches due to: ${countryReason}; similar quantity (${quantity} tons) and ${price ? `price (${price} USD)` : 'no price specified'}`
                });
                countryMatches++;
            } catch (error) {
                logger.warn(`Error processing WheatBuyer ${buyer.buyer_id}: ${error.message}`);
            }
        }

        // 3. Match Offers
        const offers = await Offer.find({
            crop_type: cropType.toLowerCase(),
            status: 'active'
        }).lean();
        logger.info(`Fetched ${offers.length} offers for FarmerForm ${farmerFormId}`);

        for (const offer of offers) {
            try {
                const offerCountry = extractCountry(offer.supplier_info);
                if (!offerCountry) {
                    logger.warn(`Offer ${offer.offer_id} has no valid supplier country code: ${offer.supplier_info}`);
                    continue;
                }

                let countryMatch = false;
                let countryReason = '';
                if (farmerCountries.length === 0) {
                    countryMatch = true;
                    countryReason = 'Matched: no farmer country restrictions (farmerCountries=${farmerCountries}, offerCountry=${offerCountry})';
                } else {
                    const countryMatch = farmerCountries.filter(c => c === offerCountry);
                    countryMatch = countryMatch.length > 0;
                    countryReason = countryMatch
                        ? 'Matched: offerCountry ${offerCountry} in farmerCountries'
                        : 'No match: farmerCountries=${farmerCountries} vs offerCountry=${offerCountry}';
                }

                if (!countryMatch) {
                    logger.info(`Country mismatch for Offer ${offer.offer_id}: ${countryReason}`);
                    continue;
                }

                if (!offer.vector || offer.vector.length !== 4) {
                    logger.warn(`Invalid vector for Offer ${offer.offer_id}: ${JSON.stringify(offer.vector)}`);
                    continue;
                }

                const quantity = parseQuantity(offer.min_quantity);
                if (!quantity || quantity <= 0) {
                    logger.warn(`Invalid quantity for Offer ${offer.offer_id}: min_quantity=${offer.min_quantity}`);
                    continue;
                }

                const price = parsePrice(offer.price);
                const distance = computeDistance(queryVector, offer.vector);
                let similarity = 1 / (1 + distance);

                if (farmerForm.quantityAvailable?.value === quantity &&
                    farmerForm.pricePerUnit?.value === price) {
                    similarity = Math.min(similarity + 0.2, 1.0);
                    logger.info(`Boosted similarity for Offer ${offer.offer_id} due to exact quantity=${quantity}, price=${price}`);
                }
                if (countryMatch && farmerCountries.length > 0) {
                    similarity = Math.min(similarity + 0.1, 1.0);
                    logger.info(`Boosted similarity for Offer ${offer.offer_id} due to country match: ${countryReason}`);
                }

                logger.info(`Offer ${offer.offer_id}: title=${offer.title || 'N/A'}, distance=${distance}, similarity=${similarity}, vector=${JSON.stringify(offer.vector)}, quantity=${quantity}, price=${price || 'N/A'}`);
                if (similarity < 0.5) {
                    logger.warn(`Offer ${offer.offer_id} skipped due to low similarity: ${similarity}`);
                    continue;
                }

                matches.push({
                    type: 'external_offer',
                    item: {
                        id: offer.offer_id,
                        title: offer.title || 'External Offer',
                        quantity: quantity,
                        price: price || 'N/A',
                        location: offerCountry,
                        contact: offer.contact_name || 'N/A',
                        email: offer.email || 'N/A'
                    },
                    similarity,
                    reason: `Matches due to: ${countryReason}; similar quantity (${quantity} tons) and ${price ? `price (${price} USD)` : 'no price specified'}`
                });
                countryMatches++;
            } catch (error) {
                logger.warn(`Error processing Offer ${offer.offer_id}: ${error.message}`);
            }
        }

        logger.info(`Total country matches for buyers and offers for FarmerForm ${farmerFormId}: ${countryMatches}`);

        // Fallback: Include top matches if no matches found
        if (matches.length === 0 && (buyerForms.length > 0 || wheatBuyers.length > 0 || offers.length > 0)) {
            logger.info(`No matches found for FarmerForm ${farmerFormId}, including top matches based on quantity and price`);

            // BuyerForm fallback
            const sortedBuyerForms = buyerForms
                .filter(buyerForm =>
                    buyerForm.quantityDesired?.value > 0 &&
                    buyerForm.pricePerUnit?.value > 0 &&
                    buyerForm.quantityDesired.unit &&
                    buyerForm.pricePerUnit.currency &&
                    buyerForm.vector && buyerForm.vector.length === 4
                )
                .map(buyerForm => {
                    const quantityDiff = Math.abs(buyerForm.quantityDesired.value - (farmerForm.quantityAvailable?.value || 0));
                    const priceDiff = Math.abs(buyerForm.pricePerUnit.value - (farmerForm.pricePerUnit?.value || 0));
                    const distance = computeDistance(queryVector, buyerForm.vector);
                    let similarity = 1 / (1 + distance);
                    const buyerCountries = normalizeCountryArray(buyerForm.preferredSuppliersFrom || []);
                    const commonCountries = farmerCountries.filter(c => buyerCountries.includes(c));
                    if (quantityDiff === 0 && priceDiff === 0) {
                        similarity = Math.min(similarity + 0.2, 1.0);
                    }
                    if (commonCountries.length > 0) {
                        similarity = Math.min(similarity + 0.1, 1.0);
                    }
                    return { buyerForm, quantityDiff, priceDiff, similarity, commonCountries };
                })
                .sort((a, b) => a.quantityDiff - b.quantityDiff || a.priceDiff - b.priceDiff || b.similarity - a.similarity)
                .slice(0, 2);

            for (const { buyerForm, similarity, commonCountries } of sortedBuyerForms) {
                try {
                    const buyerCountries = normalizeCountryArray(buyerForm.preferredSuppliersFrom || []);
                    const reason = commonCountries.length > 0
                        ? `common countries ${commonCountries.join(', ')}`
                        : `no country restrictions`;
                    matches.push({
                        type: 'buyer_form',
                        item: {
                            id: buyerForm._id.toString(),
                            title: buyerForm.title,
                            quantity: buyerForm.quantityDesired.value,
                            price: buyerForm.pricePerUnit.value,
                            location: buyerCountries.join(', ') || 'N/A',
                            contact: buyerForm.contactName || 'N/A',
                            email: buyerForm.company?.contactEmail || 'N/A'
                        },
                        similarity,
                        reason: `Included in fallback; ${reason}; similar quantity (${buyerForm.quantityDesired.value} tons) and price (${buyerForm.pricePerUnit.value} USD)`
                    });
                } catch (error) {
                    logger.warn(`Error in fallback for BuyerForm ${buyerForm._id}: ${error.message}`);
                }
            }

            // WheatBuyer fallback
            const sortedWheatBuyers = wheatBuyers
                .filter(buyer => {
                    const quantity = parseQuantity(buyer.quantity_required);
                    return quantity && quantity > 0 && buyer.vector && buyer.vector.length === 4;
                })
                .map(buyer => {
                    const quantity = parseQuantity(buyer.quantity_required);
                    const price = parsePrice(buyer.product_description);
                    const quantityDiff = Math.abs(quantity - (farmerForm.quantityAvailable?.value || 0));
                    const priceDiff = price ? Math.abs(price - (farmerForm.pricePerUnit?.value || 0)) : Infinity;
                    const distance = computeDistance(queryVector, buyer.vector);
                    let similarity = 1 / (1 + distance);
                    const buyerCountries = normalizeCountryArray(buyer.supplier_regions || []);
                    const commonCountries = farmerCountries.filter(c => buyerCountries.includes(c));
                    if (quantityDiff === 0 && priceDiff === 0) {
                        similarity = Math.min(similarity + 0.2, 1.0);
                    }
                    if (commonCountries.length > 0) {
                        similarity = Math.min(similarity + 0.1, 1.0);
                    }
                    return { buyer, quantityDiff, priceDiff, similarity, commonCountries };
                })
                .sort((a, b) => a.quantityDiff - b.quantityDiff || a.priceDiff - b.priceDiff || b.similarity - a.similarity)
                .slice(0, 2);

            for (const { buyer, similarity, commonCountries } of sortedWheatBuyers) {
                try {
                    const quantity = parseQuantity(buyer.quantity_required);
                    const price = parsePrice(buyer.product_description);
                    const buyerCountries = normalizeCountryArray(buyer.supplier_regions || []);
                    const reason = commonCountries.length > 0
                        ? `common countries ${commonCountries.join(', ')}`
                        : `no country restrictions`;
                    matches.push({
                        type: 'wheat_buyer',
                        item: {
                            id: buyer.buyer_id,
                            title: buyer.title || 'External Wheat Buyer',
                            quantity: quantity,
                            price: price || 'N/A',
                            location: buyerCountries.join(', ') || 'N/A',
                            contact: buyer.contact_name || 'N/A',
                            email: 'N/A'
                        },
                        similarity,
                        reason: `Included in fallback; ${reason}; similar quantity (${quantity} tons) and ${price ? `price (${price} USD)` : 'no price specified'}`
                    });
                } catch (error) {
                    logger.warn(`Error in fallback for WheatBuyer ${buyer.buyer_id}: ${error.message}`);
                }
            }

            // Offer fallback
            const sortedOffers = offers
                .filter(offer => {
                    const quantity = parseQuantity(offer.min_quantity);
                    return quantity && quantity > 0 && offer.vector && offer.vector.length === 4;
                })
                .map(offer => {
                    const quantity = parseQuantity(offer.min_quantity);
                    const price = parsePrice(offer.price);
                    const quantityDiff = Math.abs(quantity - (farmerForm.quantityAvailable?.value || 0));
                    const priceDiff = price ? Math.abs(price - (farmerForm.pricePerUnit?.value || 0)) : Infinity;
                    const distance = computeDistance(queryVector, offer.vector);
                    let similarity = 1 / (1 + distance);
                    const offerCountry = extractCountry(offer.supplier_info);
                    const countryMatch = offerCountry && farmerCountries.includes(offerCountry);
                    if (quantityDiff === 0 && priceDiff === 0) {
                        similarity = Math.min(similarity + 0.2, 1.0);
                    }
                    if (countryMatch) {
                        similarity = Math.min(similarity + 0.1, 1.0);
                    }
                    return { offer, quantityDiff, priceDiff, similarity, countryMatch };
                })
                .sort((a, b) => a.quantityDiff - b.quantityDiff || a.priceDiff - b.priceDiff || b.similarity - a.similarity)
                .slice(0, 2);

            for (const { offer, similarity, countryMatch } of sortedOffers) {
                try {
                    const quantity = parseQuantity(offer.min_quantity);
                    const price = parsePrice(offer.price);
                    const offerCountry = extractCountry(offer.supplier_info);
                    const reason = countryMatch
                        ? `offerCountry ${offerCountry} in farmerCountries`
                        : `no country restrictions`;
                    matches.push({
                        type: 'external_offer',
                        item: {
                            id: offer.offer_id,
                            title: offer.title || 'External Offer',
                            quantity: quantity,
                            price: price || 'N/A',
                            location: offerCountry || 'N/A',
                            contact: offer.contact_name || 'N/A',
                            email: offer.email || 'N/A'
                        },
                        similarity,
                        reason: `Included in fallback; ${reason}; similar quantity (${quantity} tons) and ${price ? `price (${price} USD)` : 'no price specified'}`
                    });
                } catch (error) {
                    logger.warn(`Error in fallback for Offer ${offer.offer_id}: ${error.message}`);
                }
            }
        }

        logger.info(`Total buyer and offer matches before sorting for FarmerForm ${farmerFormId}: ${matches.length}`);
        matches.sort((a, b) => b.similarity - a.similarity);

        return matches.slice(0, 3);
    } catch (error) {
        logger.error(`Error finding buyer matches for FarmerForm ${farmerFormId}: ${error.message}`);
        return [];
    }
};

const recalculateAllMatches = async () => {
    try {
        logger.info('Starting recalculation of matches for all active BuyerForms and FarmerForms...');

        // Match offers to BuyerForms
        const buyerForms = await BuyerForm.find({
            offerEndDate: { $gte: new Date() }
        }).lean();
        logger.info(`Found ${buyerForms.length} active BuyerForms`);

        let buyerUpdatedCount = 0;
        let buyerNotifiedCount = 0;
        const batchSize = 50;

        for (let i = 0; i < buyerForms.length; i += batchSize) {
            const batch = buyerForms.slice(i, i + batchSize);
            logger.info(`Processing BuyerForm batch ${i / batchSize + 1} with ${batch.length} BuyerForms`);

            const updatePromises = batch.map(async (buyerForm) => {
                try {
                    const { vector: queryVector, productCategory: cropType, preferredSuppliersFrom: preferredCountries, _id } = buyerForm;

                    if (!queryVector || queryVector.length !== 4 || queryVector.some(v => isNaN(v))) {
                        logger.warn(`Skipping BuyerForm ${_id} due to invalid vector`);
                        return;
                    }

                    const newMatches = await findOfferMatches({
                        queryVector,
                        cropType,
                        preferredCountries: preferredCountries || []
                    });

                    const oldMatches = buyerForm.recommendations || [];
                    const oldMatchIds = oldMatches.map(match => match.item.id);
                    const newMatchIds = newMatches.map(m => m.item.id);
                    const hasNewMatches = newMatches.some(match => !oldMatchIds.includes(match.item.id));

                    await BuyerForm.updateOne(
                        { _id },
                        {
                            $set: {
                                recommendations: newMatches,
                                lastMatched: new Date()
                            }
                        }
                    );
                    buyerUpdatedCount++;

                    if (hasNewMatches && newMatches.length > 0) {
                        logger.info(`New matches found for BuyerForm ${_id}: ${buyerForm.title}`);
                        logger.info(`Notification to ${buyerForm.company.contactEmail}: New matches for ${buyerForm.title}: ${newMatches.map(m => m.item.title).join(', ')}`);
                        buyerNotifiedCount++;
                    }
                } catch (error) {
                    logger.error(`Error processing BuyerForm ${buyerForm._id}: ${error.message}`);
                }
            });

            await Promise.all(updatePromises);
        }

        // Match buyers to FarmerForms
        const farmerForms = await FarmerForm.find({
            availabilityEndDate: { $gte: new Date() }
        }).lean();
        logger.info(`Found ${farmerForms.length} active FarmerForms`);

        let farmerUpdatedCount = 0;
        let farmerNotifiedCount = 0;

        for (let i = 0; i < farmerForms.length; i += batchSize) {
            const batch = farmerForms.slice(i, i + batchSize);
            logger.info(`Processing FarmerForm batch ${i / batchSize + 1} with ${batch.length} FarmerForms`);

            const updatePromises = batch.map(async (farmerForm) => {
                try {
                    const { vector: queryVector, productCategory: cropType, lookingForBuyersFrom, _id } = farmerForm;

                    if (!queryVector || queryVector.length !== 4 || queryVector.some(v => isNaN(v))) {
                        logger.warn(`Skipping FarmerForm ${_id} due to invalid vector`);
                        return;
                    }

                    const newMatches = await findBuyerMatches({
                        queryVector,
                        cropType,
                        lookingForBuyersFrom: lookingForBuyersFrom || [],
                        farmerFormId: _id
                    });

                    const oldMatches = farmerForm.recommendations || [];
                    const oldMatchIds = oldMatches.map(match => match.item.id);
                    const newMatchIds = newMatches.map(m => m.item.id);
                    const hasNewMatches = newMatches.some(match => !oldMatchIds.includes(match.item.id));

                    await FarmerForm.updateOne(
                        { _id },
                        {
                            $set: {
                                recommendations: newMatches,
                                lastMatched: new Date()
                            }
                        }
                    );
                    farmerUpdatedCount++;

                    if (hasNewMatches && newMatches.length > 0) {
                        logger.info(`New matches found for FarmerForm ${_id}: ${farmerForm.title}`);
                        logger.info(`Notification to ${farmerForm.company.contactEmail}: New buyer matches for ${farmerForm.title}: ${newMatches.map(m => m.item.title).join(', ')}`);
                        farmerNotifiedCount++;
                    }
                } catch (error) {
                    logger.error(`Error processing FarmerForm ${farmerForm._id}: ${error.message}`);
                }
            });

            await Promise.all(updatePromises);
        }

        logger.info(`Recalculation complete: Updated ${buyerUpdatedCount} BuyerForms, Notified ${buyerNotifiedCount} users; Updated ${farmerUpdatedCount} FarmerForms, Notified ${farmerNotifiedCount} farmers`);
    } catch (error) {
        logger.error('Error in recalculateAllMatches:', error.message);
    }
};

export { findOfferMatches, findBuyerMatches, recalculateAllMatches, triggerRecalculation };