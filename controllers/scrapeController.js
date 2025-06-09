import { spawn } from 'child_process';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import crypto from 'crypto';
import Offer from '../models/Offer.js';
import { normalizeText, normalizePrice, generateOfferVector } from '../utils/offerNormalization.js';
import { recalculateAllMatches } from '../utils/matching.js';

const generateOfferId = (offer) => {
    const key = `${offer.title}${offer.price}${offer.supplier}${offer.crop_type}`;
    console.log(`Clé pour offer_id: "${key}"`);
    const offer_id = crypto.createHash('md5').update(key).digest('hex');
    console.log(`offer_id généré: ${offer_id}`);
    return offer_id;
};

const extractCountry = (info) => {
    const infoLower = info.toLowerCase();
    const countries = ['au', 'tn', 'cn', 'us', 'tr', 'th', 'ca', 'at', 'ua', 'kz', 'ae', 'in', 'br', 'za', 'fr', 'pk', 'de'];
    return countries.find(country => infoLower.includes(country)) || 'unknown';
};

export const startScrape = async (req, res) => {
    try {
        console.log('Lancement du script de scraping CSV...');
        const scrapeProcess = spawn('python', ['./alibaba_wheat_scraper.py']);
        let scrapeOutput = '';
        let scrapeErrorOutput = '';

        scrapeProcess.stdout.on('data', (data) => {
            scrapeOutput += data.toString();
        });

        scrapeProcess.stderr.on('data', (data) => {
            scrapeErrorOutput += data.toString();
        });

        const scrapeResult = await new Promise((resolve, reject) => {
            scrapeProcess.on('close', (code) => {
                console.log(`Script de scraping CSV terminé avec le code: ${code}`);
                if (code === 0) {
                    try {
                        const result = JSON.parse(scrapeOutput);
                        resolve(result);
                    } catch (e) {
                        console.error('Erreur de parsing JSON (scraping) :', e);
                        reject({ message: 'Erreur lors du parsing des données de scraping', error: `${e.message}\n${scrapeOutput}` });
                    }
                } else {
                    console.error('Erreur lors du scraping :', scrapeErrorOutput);
                    reject({ message: 'Erreur lors de l\'exécution du script de scraping', error: scrapeErrorOutput });
                }
            });
        });

        if (scrapeResult.status === 'error') {
            return res.status(500).json(scrapeResult);
        }

        console.log('Suppression des offres non éditées manuellement dans MongoDB...');
        await Offer.deleteMany({ is_manually_edited: false });
        console.log('Lecture et transfert du CSV vers MongoDB...');

        const operations = [];
        const seenOfferIds = new Set();
        let insertedCount = 0;
        let totalRows = 0;

        const parser = createReadStream('./alibaba_crops_no_login.csv').pipe(
            parse({
                columns: true,
                skip_empty_lines: true,
                trim: true,
                encoding: 'utf-8'
            })
        );

        for await (const record of parser) {
            totalRows++;
            try {
                console.log(`Traitement de la ligne ${totalRows}: ${record['Title']}`);
                const supplierInfo = record['Supplier Info (Years & Location)'] || 'unknown';
                const countryCode = extractCountry(supplierInfo);
                const offerData = {
                    title: normalizeText(record['Title']),
                    price: normalizePrice(record['Price']),
                    min_quantity: normalizeText(record['Min Quantity'] || 'N/A'),
                    supplier: normalizeText(record['Supplier']),
                    supplier_info: countryCode,
                    contact_name: normalizeText(record['Contact Name']),
                    email: normalizeText(record['Email']),
                    phone: normalizeText(record['Phone']),
                    image_url: record['Image URL'] || 'N/A',
                    crop_type: normalizeText(record['Crop Type']).toLowerCase()
                };

                if (!['wheat', 'barley'].includes(offerData.crop_type)) {
                    console.log(`Type de culture invalide ignoré: ${offerData.crop_type} pour ${offerData.title}`);
                    continue;
                }

                const offer_id = generateOfferId(offerData);

                if (seenOfferIds.has(offer_id)) {
                    console.log(`Doublon ignoré dans le CSV : ${offerData.title} (offer_id: ${offer_id})`);
                    continue;
                }

                const existingOffer = await Offer.findOne({ offer_id });
                if (existingOffer && existingOffer.is_manually_edited) {
                    console.log(`Offre manuellement éditée ignorée : ${offerData.title} (offer_id: ${offer_id})`);
                    continue;
                }

                seenOfferIds.add(offer_id);

                const vector = generateOfferVector(offerData);

                const currentTime = new Date();
                operations.push({
                    updateOne: {
                        filter: { offer_id },
                        update: {
                            $set: {
                                ...offerData,
                                offer_id,
                                vector,
                                status: 'active',
                                created_at: existingOffer ? existingOffer.created_at : currentTime,
                                last_updated: currentTime,
                                scraped_at: currentTime,
                                is_manually_edited: false
                            }
                        },
                        upsert: true
                    }
                });

            } catch (e) {
                console.error(`Erreur lors du traitement de la ligne ${totalRows}: ${record['Title']} - ${e.message}`);
                continue;
            }
        }

        console.log(`Total des lignes traitées dans le CSV : ${totalRows}`);

        if (operations.length > 0) {
            console.log('Écriture des nouvelles offres dans MongoDB...');
            const result = await Offer.bulkWrite(operations);
            insertedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
            console.log(`Offres insérées ou mises à jour: ${insertedCount}`);

            console.log('Scheduling recalculation of all matches...');
            setTimeout(() => {
                recalculateAllMatches().catch(error => {
                    console.error('Error during async match recalculation:', error.message);
                });
            }, 0);
        } else {
            console.warn('Aucune offre à insérer.');
        }

        res.status(200).json({
            status: 'success',
            data: {
                inserted_count: insertedCount,
                total_rows: totalRows
            },
            message: `Transfert terminé: ${insertedCount} offres insérées ou mises à jour. Matching recalculation scheduled.`
        });

    } catch (error) {
        console.error('Erreur serveur :', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

export const getOffers = async (req, res) => {
    try {
        console.log('Tentative de récupération des offres...');
        const offers = await Offer.find({ status: 'active' });
        console.log(`Nombre d'offres récupérées: ${offers.length}`);
        res.status(200).json({ status: 'success', data: offers });
    } catch (error) {
        console.error('Erreur dans getOffers:', error);
        res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des offres', error: error.message });
    }
};

export const updateOffer = async (req, res) => {
    try {
        const { offer_id } = req.params;
        const { title, price, min_quantity, supplier, supplier_info, contact_name, email, phone, image_url, crop_type } = req.body;

        if (!title || !price || !min_quantity || !supplier || !supplier_info || !crop_type) {
            return res.status(400).json({ status: 'error', message: 'Les champs title, price, min_quantity, supplier, supplier_info et crop_type sont requis' });
        }

        if (!['wheat', 'barley'].includes(crop_type.toLowerCase())) {
            return res.status(400).json({ status: 'error', message: 'crop_type doit être "wheat" ou "barley"' });
        }

        const countryCode = extractCountry(supplier_info);
        const offerData = {
            title: normalizeText(title),
            price: normalizePrice(price),
            min_quantity: normalizeText(min_quantity),
            supplier: normalizeText(supplier),
            supplier_info: countryCode,
            contact_name: normalizeText(contact_name || 'N/A'),
            email: normalizeText(email || 'N/A'),
            phone: normalizeText(phone || 'N/A'),
            image_url: image_url || 'N/A',
            crop_type: crop_type.toLowerCase(),
            last_updated: new Date(),
            is_manually_edited: true
        };

        const vector = generateOfferVector(offerData);
        const new_offer_id = generateOfferId(offerData);

        const existingOffer = await Offer.findOne({ offer_id: new_offer_id });
        if (existingOffer && existingOffer.offer_id !== offer_id) {
            return res.status(409).json({ status: 'error', message: 'Une offre avec ces title, price, supplier et crop_type existe déjà' });
        }

        const updatedOffer = await Offer.findOneAndUpdate(
            { offer_id },
            { ...offerData, offer_id: new_offer_id, vector },
            { new: true }
        );

        if (!updatedOffer) {
            return res.status(404).json({ status: 'error', message: 'Offre non trouvée' });
        }

        console.log('Scheduling recalculation of all matches after offer update...');
        setTimeout(() => {
            recalculateAllMatches().catch(error => {
                console.error('Error during async match recalculation:', error.message);
            });
        }, 0);

        res.status(200).json({ status: 'success', data: updatedOffer, message: 'Offre mise à jour avec succès. Matching recalculation scheduled.' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'offre:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

export const deleteOffer = async (req, res) => {
    try {
        const { offer_id } = req.params;
        const deletedOffer = await Offer.findOneAndDelete({ offer_id });

        if (!deletedOffer) {
            return res.status(404).json({ status: 'error', message: 'Offre non trouvée' });
        }

        console.log('Scheduling recalculation of all matches after offer deletion...');
        setTimeout(() => {
            recalculateAllMatches().catch(error => {
                console.error('Error during async match recalculation:', error.message);
            });
        }, 0);

        res.status(200).json({ status: 'success', message: 'Offre supprimée avec succès. Matching recalculation scheduled.' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'offre:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

export const matchOffers = async (req, res) => {
    try {
        const { crop_type, min_quantity, country, price } = req.body;

        if (!crop_type || !min_quantity || !country || !price) {
            return res.status(400).json({ status: 'error', message: 'Les champs crop_type, min_quantity, country et price sont requis' });
        }

        const queryOffer = {
            crop_type: normalizeText(crop_type).toLowerCase(),
            min_quantity: normalizeText(min_quantity),
            supplier_info: extractCountry(country),
            price: normalizePrice(price)
        };

        if (!['wheat', 'barley'].includes(queryOffer.crop_type)) {
            return res.status(400).json({ status: 'error', message: 'crop_type doit être "wheat" ou "barley"' });
        }

        const queryVector = generateOfferVector(queryOffer);
        const offers = await Offer.find({ status: 'active' });

        const weights = [0.4, 0.1, 0.1, 0.4];
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const normalizedWeights = weights.map(w => w / totalWeight);

        const matches = offers
            .map(offer => {
                const distance = Math.sqrt(
                    queryVector.reduce((sum, val, i) => sum + normalizedWeights[i] * Math.pow(val - offer.vector[i], 2), 0)
                );
                return {
                    offer,
                    distance,
                    similarity: 1 / (1 + distance)
                };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);

        res.status(200).json({
            status: 'success',
            data: matches.map(match => ({
                offer: match.offer,
                similarity: match.similarity
            })),
            message: 'Matching des offres terminé'
        });
    } catch (error) {
        console.error('Erreur lors du matching des offres:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};