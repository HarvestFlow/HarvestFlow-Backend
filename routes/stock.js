import express from "express";
import {
  getHarvests,
  getInputs,
  createStockItem,
  updateStockQuantity,
  getInputUsages,
  createInputUsage,
} from "../controllers/stock.js";
import { auth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/harvests", auth, getHarvests);
router.get("/inputs", auth, getInputs);
router.get("/usage/:shapeId", auth, getInputUsages); // Nouvelle route
router.post("/", auth, createStockItem);
router.post("/usage", auth, createInputUsage); // Nouvelle route
router.put("/:id", auth, updateStockQuantity);

export default router;