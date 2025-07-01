import express from "express";
import {
  updateShape,
  createParcel,
  getParcelleByUserId,
  deleteShape,
  getShapeCoordinates,
  updateShapeWeather, // Nouvelle fonction pour gérer la mise à jour de la température et du pays
} from "../controllers/parcelle.js";
import {
  getObservationsByShape,
  createObservation,
  updateObservation,
} from "../controllers/dailyobservations.js";

const router = express.Router();

// Create or update parcelle
router.post("/parcelle", createParcel);

// Get parcelle by userId
router.get("/parcelle/:userId", getParcelleByUserId);

// Delete a shape
router.delete("/parcelle/:userId/:shapeId", deleteShape);

// Update shape properties (cropType, plantingDate, etc.)
router.put("/parcelle/:userId/:shapeId", updateShape); // Updated to handle geometry and properties
// Nouvelle route pour mettre à jour la température moyenne et le pays
router.put("/update-shape/:parcelleId/:shapeId", updateShapeWeather);

// Get shape coordinates
router.get("/shape/:shapeId", getShapeCoordinates);

// Daily observations routes
router.get("/dailyObservation/:parcelleId/:shapeId", getObservationsByShape);
router.post("/dailyObservation/:parcelleId/:shapeId", createObservation);
router.put("/dailyObservation/:observationId", updateObservation);

export default router;