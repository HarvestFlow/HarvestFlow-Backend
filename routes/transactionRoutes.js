import express from 'express';
import { addTransaction, getJournal, deleteTransaction ,getFinancialAnalytics } from '../controllers/transactionController.js';

const router = express.Router();

router.post('/transactions', addTransaction);
router.get('/transactions', getJournal);
router.delete('/transactions/:id', deleteTransaction);
router.get('/analytics', getFinancialAnalytics);
export default router;