import mongoose from 'mongoose';

const criticalConditionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', required: false }, // Optionnel si global
  type: { type: String, enum: ['frost', 'drought', 'heat', 'rain'], required: true },
  threshold: { type: Number, required: true }, // Ex. 0 pour gel, 7 pour jours sans pluie
  unit: { type: String, required: true }, // Ex. "°C", "days"
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('CriticalCondition', criticalConditionSchema);