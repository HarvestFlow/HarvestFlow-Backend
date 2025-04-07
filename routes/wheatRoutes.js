// routes/wheatRoutes.js
import express from "express";
const router = express.Router();
import {
  getCountryStats,
  predictWheatYield,
  uploadWheatData
  } from "../controllers/wheatController.js";
// Route pour la prédiction
router.post('/predict', predictWheatYield);
router.get('/stats/:countryName', getCountryStats);
router.post('/upload', uploadWheatData); // Nouvelle route pour l'upload
export default router;
