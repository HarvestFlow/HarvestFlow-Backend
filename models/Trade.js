import mongoose from 'mongoose';

// Schéma pour les données de trade
const tradeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  filename: { type: String, required: true },
  dataType: { type: String, required: true, enum: ['production', 'stocks', 'offres'] },
  data: [mongoose.Schema.Types.Mixed],
  columns: [{ type: String }],
  rowCount: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
});

// Schéma pour journaliser les téléversements (historique)
const uploadLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true },
  filename: { type: String, required: true },
  dataType: { type: String, required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  errorMessage: { type: String, default: null },
  uploadedAt: { type: Date, default: Date.now },
});

export const Trade = mongoose.model('Trade', tradeSchema);
export const UploadLog = mongoose.model('UploadLog', uploadLogSchema);