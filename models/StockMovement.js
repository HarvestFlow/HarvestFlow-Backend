import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['Entrée', 'Sortie', 'Transfert'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  reference: { type: String },
  destination: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('StockMovement', stockMovementSchema);