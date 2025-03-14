
import mongoose from "mongoose";


const DailyObservationSchema = new mongoose.Schema({
    parcelleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parcelle",
      required: true, // Lien avec la parcelle parent
    },
    shapeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // Lien obligatoire avec un shape spécifique
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true, // Index pour optimiser les requêtes par date
    },
    weather: {
      temperature: {
        min: { type: Number, required: false },
        max: { type: Number, required: false },
      },
      precipitation: { type: Number, default: 0, required: false },
      humidity: { type: Number, min: 0, max: 100, required: false },
      windSpeed: { type: Number, required: false },
      windDirection: {
        type: String,
        enum: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
        required: false,
      },
      weatherSource: {
        type: String,
        enum: ["manual", "sensor", "api"],
        default: "manual",
      },
    },
    soil: {
      moisture: { type: Number, min: 0, max: 100, required: false },
      temperature: { type: Number, required: false },
      pH: { type: Number, min: 0, max: 14, required: false },
      compactionLevel: {
        type: String,
        enum: ["low", "medium", "high"],
        required: false,
      },
      measuredBy: {
        type: String,
        enum: ["manual", "sensor"],
        default: "manual",
      },
    },
    cropHealth: {
      growthStage: {
        type: String,
        required: false, // Stade spécifique à ce shape
      },
      plantHeight: { type: Number, required: false },
      leafColor: {
        type: String,
        enum: ["green", "light_green", "yellowing", "brown", "wilted"],
        required: false,
      },
      pestPresence: [{
        pestType: { type: String, required: false },
        severity: { type: String, enum: ["low", "medium", "high"], required: false },
        affectedArea: { type: Number, min: 0, max: 100, required: false },
      }],
      weedPresence: { type: String, required: false },
      healthIndex: {
        type: Number,
        min: 0,
        max: 100,
        required: false, // Score calculé pour ce shape
      },
    },
    interventions: [{
      type: {
        type: String,
        enum: ["irrigation", "fertilizer", "pesticide", "manual_work"],
        required: true,
      },
      details: {
        quantity: { type: Number, required: false },
        product: { type: String, required: false },
        notes: { type: String, required: false },
      },
      timestamp: { type: Date, default: Date.now },
    }],
    alerts: [{
      type: {
        type: String,
        enum: ["pest", "disease", "water", "nutrient", "weather"],
        required: true,
      },
      message: { type: String, required: true },
      severity: { type: String, enum: ["info", "warning", "critical"], required: true },
      triggeredAt: { type: Date, default: Date.now },
    }],
    notes: {
      type: String,
      required: false,
    },
    sensorData: {
      type: mongoose.Schema.Types.Mixed,
      required: false, // Données brutes pour ce shape
    },
  });
  
  // Modèle Mongoose
  const DailyObservation = mongoose.model("DailyObservation", DailyObservationSchema);
  export default DailyObservation;