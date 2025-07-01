import express from 'express';
import { createFarmerForm, getFarmerForms, getAllFarmerForms, updateFarmerForm, deleteFarmerForm ,getRecommendations,getBuyerRecommendations} from '../controllers/farmerFormController.js';
import { createBuyerForm, getBuyerForms, getAllBuyerForms, updateBuyerForm, deleteBuyerForm } from '../controllers/BuyerFormController.js';
import { getAlibabaWheatOffers } from '../controllers/alibabaWheatController.js';

const router = express.Router();

// Alibaba wheat offers route
router.get('/getAlibabaWheatOffers', getAlibabaWheatOffers);

// Farmer form routes
router.post('/farmer', createFarmerForm);
router.get('/farmer/:userId', getFarmerForms);
router.get('/farmer', getAllFarmerForms);
router.put('/farmerforms/:id', updateFarmerForm);
router.delete('/farmerforms/:id', deleteFarmerForm);
router.get('/recommendations/:offerId', getRecommendations);

// Buyer form routes
router.post('/buyer', createBuyerForm);
router.get('/buyer/:userId', getBuyerForms);
router.get('/buyer', getAllBuyerForms);
router.put('/buyerforms/:id', updateBuyerForm);
router.delete('/buyerforms/:formId', deleteBuyerForm);
router.get('/buyer/recommendations/:buyerFormId', getBuyerRecommendations);
export default router;