import express from 'express';
import { startScrape, getOffers, updateOffer, deleteOffer } from '../controllers/scrapeController.js';

const router = express.Router();

router.post('/scrape', startScrape);
router.get('/offers', getOffers);
router.put('/offers/:offer_id', updateOffer);
router.delete('/offers/:offer_id', deleteOffer);

export default router;