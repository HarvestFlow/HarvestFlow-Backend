import express from 'express';
import { recalculateMatches } from '../controllers/matchcontroller.js';

const router = express.Router();

// Trigger recalculation of matches
router.post('/recalculate', recalculateMatches);

export default router;