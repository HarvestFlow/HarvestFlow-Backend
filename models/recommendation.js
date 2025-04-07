// models/recommendation.js
import mongoose from "mongoose";

const RecommendationSchema = new mongoose.Schema({
  parcelleId: { type: mongoose.Schema.Types.ObjectId, ref: "Parcelle", required: true },
  shapeId: { type: String, required: true },
  observationId: { type: mongoose.Schema.Types.ObjectId, ref: "DailyObservation", required: true },
  recommendation: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Recommendation", RecommendationSchema);