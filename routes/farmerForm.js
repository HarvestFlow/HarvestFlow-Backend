import express from 'express';
import { createFarmerForm, getFarmerForms,getAllFarmerForms } from '../controllers/farmerFormController.js';
import { getAlibabaWheatOffers} from '../controllers/alibabaWheatController.js';

const router = express.Router();
router.get('/getAlibabaWheatOffers', getAlibabaWheatOffers);

router.post('/', createFarmerForm);
router.get('/:userId', getFarmerForms);
router.get('/', getAllFarmerForms); // Get all farmer forms
export default router;