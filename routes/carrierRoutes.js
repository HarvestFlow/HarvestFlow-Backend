import express from 'express';
import {
  getCarriers,
  createCarrier,
  updateCarrier,
  deleteCarrier,
} from '../controllers/carrierController.js';

const router = express.Router();

router.get('/carriers', getCarriers);
router.post('/carriers', createCarrier);
router.put('/carriers/:id', updateCarrier);
router.delete('/carriers/:id', deleteCarrier);

export default router;