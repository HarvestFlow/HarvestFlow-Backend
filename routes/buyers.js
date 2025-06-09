import express from 'express';
import { scrapeBuyers, getBuyers, updateBuyer, deleteBuyer } from '../controllers/buyerController.js';

const router = express.Router();

router.post('/scrape-buyers', scrapeBuyers);
router.get('/buyers', getBuyers);
router.put('/buyers/:id', updateBuyer);
router.delete('/buyers/:id', deleteBuyer);

export default router;