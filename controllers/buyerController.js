// controllers/buyerController.js
import { spawn } from 'child_process';
import { WheatBuyer } from '../models/WheatBuyer.js';
import { createHash } from 'crypto';
import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';
import { generateKnnVector } from './normalization.js';

const normalizeText = (text) => {
    if (!text || text === 'N/A') return 'N/A';
    return text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

const generateBuyerId = (buyer) => {
    const key = `${normalizeText(buyer.title)}|${normalizeText(buyer.country)}|${normalizeText(buyer.contact_name)}`;
    return createHash('md5').update(key).digest('hex');
};

export const scrapeBuyers = async (req, res) => {
    try {
        console.log('Lancement du scraping des acheteurs...');
        const pythonProcess = spawn('python', ['./go4worldbusiness_wheat_buyers.py']);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Python stdout:', data.toString());
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('Python stderr:', data.toString());
        });

        pythonProcess.on('close', async (code) => {
            console.log(`Python script exited with code ${code}`);
            if (code !== 0) {
                console.error('Erreur dans le script Python:', errorOutput);
                return res.status(500).json({ status: 'error', message: 'Erreur lors du scraping', error: errorOutput });
            }

            // Read and parse the CSV file
            let buyers = [];
            try {
                const csvFilePath = './go4worldbusiness_buyers.csv';
                console.log(`Lecture du fichier CSV: ${csvFilePath}`);
                const csvData = await fs.readFile(csvFilePath, 'utf-8');
                if (!csvData.trim()) {
                    console.warn('Fichier CSV vide');
                    return res.status(400).json({ status: 'error', message: 'Fichier CSV vide' });
                }

                const records = parse(csvData, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    quote: '"',
                    escape: '"',
                    relax_quotes: true,
                    skip_lines_with_error: true // Skip lines with incorrect column counts
                });

                console.log(`Colonnes détectées: ${Object.keys(records[0] || {})}`);
                buyers = records.map((record, index) => {
                    // Validate that the record has exactly 11 columns
                    const expectedColumns = [
                        'Title', 'Country', 'Quantity Required', 'Payment Terms',
                        'Destination', 'Looking for Suppliers From', 'Product Description',
                        'Contact Name', 'Verified Status', 'Date', 'Cereal Type'
                    ];
                    const recordKeys = Object.keys(record);
                    if (recordKeys.length !== 11 || !expectedColumns.every(col => col in record)) {
                        console.warn(`Ligne ${index + 2} invalide ignorée: ${JSON.stringify(record)}`);
                        return null;
                    }
                    return {
                        title: record['Title'] || 'Unknown Buyer',
                        country: record['Country'] || 'N/A',
                        quantity_required: record['Quantity Required'] || 'N/A',
                        payment_terms: record['Payment Terms'] || 'N/A',
                        destination: record['Destination'] || 'N/A',
                        supplier_regions: record['Looking for Suppliers From'] || 'N/A',
                        product_description: record['Product Description'] || 'N/A',
                        contact_name: record['Contact Name'] || 'N/A',
                        verified_status: record['Verified Status'] || 'N/A',
                        date: record['Date'] || new Date().toISOString(),
                        cereal_type: record['Cereal Type'] || 'N/A'
                    };
                }).filter(buyer => buyer !== null);

                console.log(`Nombre d'acheteurs parsés : ${buyers.length}`);
            } catch (parseError) {
                console.error('Erreur lors du parsing CSV:', parseError);
                if (buyers.length === 0) {
                    return res.status(500).json({ status: 'error', message: 'Erreur lors du parsing CSV', error: parseError.message });
                }
                console.warn('Certaines lignes du CSV ont été ignorées en raison d\'erreurs.');
            }

            if (buyers.length === 0) {
                console.warn('Aucun acheteur valide trouvé dans le CSV.');
                return res.status(400).json({ status: 'error', message: 'Aucun acheteur valide trouvé dans le CSV' });
            }

            let insertedCount = 0;
            let updatedCount = 0;

            for (const buyer of buyers) {
                const buyer_id = generateBuyerId(buyer);
                const vector = generateKnnVector(buyer);
                const existingBuyer = await WheatBuyer.findOne({ buyer_id });

                try {
                    if (!existingBuyer) {
                        await WheatBuyer.create({
                            buyer_id,
                            ...buyer,
                            vector,
                            last_updated: new Date(),
                            is_active: true
                        });
                        insertedCount++;
                        console.log(`Acheteur inséré : ${buyer.title} | ${buyer.cereal_type} | ${buyer_id} | Vecteur: ${vector}`);
                    } else {
                        await WheatBuyer.updateOne(
                            { buyer_id },
                            { $set: { ...buyer, vector, last_updated: new Date(), is_active: true } }
                        );
                        updatedCount++;
                        console.log(`Acheteur mis à jour : ${buyer.title} | ${buyer.cereal_type} | ${buyer_id} | Vecteur: ${vector}`);
                    }
                } catch (dbError) {
                    console.error(`Erreur lors du traitement de l'acheteur ${buyer.title}:`, dbError);
                    continue;
                }
            }

            // Mark outdated records as inactive
            let inactiveCount = 0;
            try {
                const result = await WheatBuyer.updateMany(
                    { last_updated: { $lt: new Date() }, is_active: true },
                    { $set: { is_active: false } }
                );
                inactiveCount = result.modifiedCount;
                console.log(`Acheteurs marqués comme inactifs : ${inactiveCount}`);
            } catch (dbError) {
                console.error('Erreur lors de la mise à jour des acheteurs inactifs:', dbError);
            }

            res.json({
                status: 'success',
                message: 'Scraping des acheteurs terminé',
                data: { inserted_count: insertedCount, updated_count: updatedCount, inactive_count: inactiveCount }
            });
        });
    } catch (error) {
        console.error('Erreur serveur:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

export const getBuyers = async (req, res) => {
    try {
        const buyers = await WheatBuyer.find({ is_active: false }).sort({ last_updated: -1 });
        console.log(`Acheteurs récupérés : ${buyers.length}`);
        res.json({ status: 'success', data: buyers });
    } catch (error) {
        console.error('Erreur lors de la récupération des acheteurs:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

export const updateBuyer = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        if (!updatedData.title) {
            return res.status(400).json({ status: 'error', message: 'Le titre est requis' });
        }
        const vector = generateKnnVector(updatedData);
        const updatedBuyer = await WheatBuyer.findOneAndUpdate(
            { buyer_id: id },
            { $set: { ...updatedData, vector, last_updated: new Date(), is_active: true } },
            { new: true }
        );
        if (!updatedBuyer) {
            return res.status(404).json({ status: 'error', message: 'Acheteur non trouvé' });
        }
        res.json({ status: 'success', data: updatedBuyer });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'acheteur:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

export const deleteBuyer = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBuyer = await WheatBuyer.findOneAndDelete({ buyer_id: id });
        if (!deletedBuyer) {
            return res.status(404).json({ status: 'error', message: 'Acheteur non trouvé' });
        }
        res.json({ status: 'success', message: 'Acheteur supprimé' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'acheteur:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

export const matchBuyers = async (req, res) => {
    try {
        const { cereal_type, quantity, supplier_region, price } = req.body;
        if (!cereal_type || !quantity || !supplier_region) {
            return res.status(400).json({ status: 'error', message: 'cereal_type, quantity, et supplier_region sont requis' });
        }

        const queryVector = generateKnnVector({
            cereal_type,
            quantity_required: quantity,
            supplier_regions: supplier_region,
            product_description: price ? `Price: ${price} USD` : 'N/A'
        });

        const buyers = await WheatBuyer.find({ is_active: true });

        const matches = buyers.map(buyer => {
            const vector = buyer.vector;
            const distance = Math.sqrt(
                queryVector.reduce((sum, val, i) => sum + Math.pow(val - vector[i], 2), 0)
            );
            return { buyer, distance };
        });

        matches.sort((a, b) => a.distance - b.distance);

        const topMatches = matches.slice(0, 5).map(match => ({
            buyer: match.buyer,
            similarity: 1 / (1 + match.distance)
        }));

        res.json({ status: 'success', data: topMatches });
    } catch (error) {
        console.error('Erreur lors du matching:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};