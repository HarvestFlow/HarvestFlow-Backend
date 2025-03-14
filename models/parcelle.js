import mongoose from "mongoose";

const ShapeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["Feature"],
  },
  properties: {
    id: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-F]{6}$/i,
    },
    comment: {
      type: String,
      default: "",
    },
    cropType: {
      type: String,
      required: false, // Ex: "blé", "maïs"
    },
    plantingDate: {
      type: Date,
      required: false,
    },
    growthStage: {
      type: String,
      required: false, // Stade global, mis à jour via observations
    },
    estimatedYield: {
      type: Number,
      required: false,
    },
    expectedHarvestDate: {
      type: Date,
      required: false,
    },
  },
  geometry: {
    type: {
      type: String,
      required: true,
      enum: ["Polygon", "LineString", "Point"],
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  // Nouveau : Référence aux observations quotidiennes spécifiques à ce shape
  dailyObservations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyObservation",
  }],
});

const ParcelleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  shapes: [ShapeSchema], // Chaque shape contient ses propres informations
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Parcelle = mongoose.model("Parcelle", ParcelleSchema);
export default Parcelle;
