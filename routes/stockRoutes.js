import express from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getMovements,
  createMovement,
  getAlerts,
} from '../controllers/stockController.js';

const router = express.Router();

// Produits
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Mouvements
router.get('/movements', getMovements);
router.post('/movements', createMovement);

// Alertes
router.get('/alerts', getAlerts);

// Fournisseurs

export default router;