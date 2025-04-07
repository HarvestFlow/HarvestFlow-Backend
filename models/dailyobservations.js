import mongoose from "mongoose";

const DailyObservationSchema = new mongoose.Schema({
  parcelleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parcelle",
    required: true,
  },
  shapeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
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
      required: false,
    },
    dailyGDD: { // Nouveau champ pour stocker le GDD quotidien
      type: Number,
      default: 0,
      required: false,
    },
    accumulatedGDD: {
      type: Number,
      default: 0, // Accumulated GDD stored here
      required: false,
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
      required: false,
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
    required: false,
  },
});

// GDD Parameters
const BASE_TEMP = 10; // Base temperature for GDD (e.g., 10°C for wheat)
const growthStages = [
  { name: "Germination and Emergence", gddMin: 0, gddMax: 150 },
  { name: "Leaf Development", gddMin: 151, gddMax: 300 },
  { name: "Tillering", gddMin: 301, gddMax: 500 },
  { name: "Stem Elongation", gddMin: 501, gddMax: 700 },
  { name: "Booting", gddMin: 701, gddMax: 900 },
  { name: "Ear Emergence", gddMin: 901, gddMax: 1100 },
  { name: "Flowering", gddMin: 1101, gddMax: 1300 },
  { name: "Milk Development", gddMin: 1301, gddMax: 1500 },
  { name: "Dough Development", gddMin: 1501, gddMax: 1700 },
  { name: "Ripening", gddMin: 1701, gddMax: Infinity },
];

// Pre-save hook to calculate GDD and update growth stage
DailyObservationSchema.pre("save", async function (next) {
  const observation = this;

  // Check if temperature data is available
  const minTemp = observation.weather?.temperature?.min || 0;
  const maxTemp = observation.weather?.temperature?.max || 0;

  // Calculate daily GDD
  const dailyGDD = Math.max(0, ((minTemp + maxTemp) / 2) - BASE_TEMP);

  // Fetch previous observations for this shape to calculate accumulated GDD
  const previousObservations = await mongoose.model("DailyObservation").find({
    shapeId: observation.shapeId,
    date: { $lt: observation.date },
  }).sort({ date: 1 });

  // Calculate accumulated GDD based on daily GDDs from previous observations
  const accumulatedGDD = previousObservations.reduce((sum, obs) => {
    return sum + (obs.cropHealth?.dailyGDD || 0); // Somme des GDD quotidiens
  }, 0) + dailyGDD;

  // Determine growth stage based on accumulated GDD
  const growthStage = growthStages.find(
    (stage) => accumulatedGDD >= stage.gddMin && accumulatedGDD <= stage.gddMax
  )?.name || "Unknown";

  // Update the observation
  observation.cropHealth.dailyGDD = dailyGDD; // Stocker le GDD quotidien
  observation.cropHealth.accumulatedGDD = accumulatedGDD;
  observation.cropHealth.growthStage = growthStage;

  // Update the corresponding Shape in Parcelle
  await mongoose.model("Parcelle").updateOne(
    { "shapes._id": observation.shapeId },
    { $set: { "shapes.$.properties.growthStage": growthStage } }
  );

  next();
});

const DailyObservation = mongoose.model("DailyObservation", DailyObservationSchema);
export default DailyObservation;