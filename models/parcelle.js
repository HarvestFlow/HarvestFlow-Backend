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
      required: false, // Optional, updated via observations
      enum: [
        'Germination and Emergence',      // GS0
        'Leaf Development',              // GS1
        'Tillering',                     // GS2
        'Stem Elongation',               // GS3
        'Booting',                       // GS4
        'Ear Emergence',                 // GS5
        'Flowering',                     // GS6
        'Milk Development',              // GS7
        'Dough Development',             // GS8
        'Ripening'                       // GS9
      ],
      default: null, // Starts as null until observed
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
