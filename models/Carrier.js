import mongoose from 'mongoose';

const carrierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
    trim: true, // e.g., phone number or email
  },
  address: {
    type: String,
    trim: true,
  },
  companyName: {
    type: String,
    trim: true,
  },
  vehicleType: {
    type: String,
    enum: ['Camion', 'Fourgon', 'Remorque', 'Autre'],
    default: 'Autre',
  },
  capacity: {
    type: Number,
    min: 0, // e.g., in tons or cubic meters
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

export default mongoose.model('Carrier', carrierSchema);