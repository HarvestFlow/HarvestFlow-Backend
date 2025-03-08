import express from 'express';
import { createParcel, getParcelleByUserId ,deleteShape} from "../controllers/parcelle.js";

const router = express.Router();

// Create or update parcelle
router.post('/parcelle', createParcel);

// Get parcelle by userId
router.get('/parcelle/:userId', getParcelleByUserId);
router.delete("/parcelle/:userId/:shapeId", deleteShape);
export default router;
