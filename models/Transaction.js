import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  account: {
    type: String,
    required: true,
    enum: [
      'Vente de produits agricoles',
      'Achat d’intrants',
      'Main-d’œuvre',
      'Frais de transport',
      'Commissions',
      'Services externes',
    ],
  },
  type: {
    type: String,
    required: true,
    enum: ['Recette', 'Dépense'],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'EUR',
    enum: ['EUR', 'TND', 'USD'],
  },
  reference: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  carrierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Carrier',
    required: false, // Optional, only for transport-related transactions
  },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);