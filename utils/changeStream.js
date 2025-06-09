import mongoose from 'mongoose';
import { recalculateAllMatches } from './matching.js';

export const setupChangeStreams = () => {
    if (!mongoose.connection.readyState) {
        console.error('MongoDB connection not ready for change streams');
        return;
    }

    const farmerFormCollection = mongoose.connection.collection('farmerforms');
    const offerCollection = mongoose.connection.collection('offers');

    console.log('Setting up change streams for farmerforms and offers...');

    const farmerFormStream = farmerFormCollection.watch([], { fullDocument: 'updateLookup' });
    const offerStream = offerCollection.watch([], { fullDocument: 'updateLookup' });

    farmerFormStream.on('change', async (change) => {
        console.log(`FarmerForm change detected:`, JSON.stringify(change, null, 2));
        try {
            if (['insert', 'update', 'delete'].includes(change.operationType)) {
                console.log(`FarmerForm ${change.operationType} (ID: ${change.documentKey._id}). Triggering recalculation...`);
                await recalculateAllMatches();
                console.log('Recalculation completed for FarmerForm change');
            }
        } catch (error) {
            console.error('Error in FarmerForm change stream:', error.message);
        }
    });

    offerStream.on('change', async (change) => {
        console.log(`Offer change detected:`, JSON.stringify(change, null, 2));
        try {
            if (['insert', 'update', 'delete'].includes(change.operationType)) {
                console.log(`Offer ${change.operationType} (ID: ${change.documentKey._id}). Triggering recalculation...`);
                await recalculateAllMatches();
                console.log('Recalculation completed for Offer change');
            }
        } catch (error) {
            console.error('Error in Offer change stream:', error.message);
        }
    });

    farmerFormStream.on('error', (error) => {
        console.error('FarmerForm stream error:', error.message);
    });

    offerStream.on('error', (error) => {
        console.error('Offer stream error:', error.message);
    });

    console.log('Change streams setup for farmerforms and offers collections');
};