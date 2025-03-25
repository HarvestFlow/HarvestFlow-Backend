import express from 'express';
import { updateShape,createParcel, getParcelleByUserId ,deleteShape  ,  getShapeCoordinates} from "../controllers/parcelle.js";
import {
    getObservationsByShape,
    createObservation,
    updateObservation,
  } from "../controllers/dailyobservations.js";
const router = express.Router();

// Create or update parcelle
router.post('/parcelle', createParcel);

// Get parcelle by userId
router.get('/parcelle/:userId', getParcelleByUserId);
router.delete("/parcelle/:userId/:shapeId", deleteShape);
router.put('/parcelle/:userId/:shapeId', updateShape);
router.get('/shape/:shapeId', getShapeCoordinates);
router.get("/dailyObservation/:parcelleId/:shapeId", getObservationsByShape);
router.post("/dailyObservation/:parcelleId/:shapeId", createObservation);
router.put("/dailyObservation/:observationId", updateObservation);
export default router;
