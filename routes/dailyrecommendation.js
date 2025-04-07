// routes/recommendation.js
import express from "express";
import { getRecommendationsByShape } from "../controllers/recommendationController.js";

const router = express.Router();

router.get("/:parcelleId/:shapeId", getRecommendationsByShape);

export default router;