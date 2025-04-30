import mongoose from 'mongoose';

const farmerFormSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
  },
  quantityRequired: {
    type: String,
    required: [true, 'Quantity Required is required'],
    trim: true,
  },
  paymentTerms: {
    type: String,
    default: 'N/A',
    trim: true,
  },
  destination: {
    type: String,
    default: 'N/A',
    trim: true,
  },
  lookingForSuppliersFrom: {
    type: String,
    default: 'N/A',
    trim: true,
  },
  productDescription: {
    type: String,
    required: [true, 'Product Description is required'],
    trim: true,
  },
  contactName: {
    type: String,
    required: [true, 'Contact Name is required'],
    trim: true,
  },
  verifiedStatus: {
    type: String,
    enum: ['VERIFIED', 'NOT_VERIFIED'],
    default: 'NOT_VERIFIED',
  },
  availabilityEndDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return !value || value >= new Date();
      },
      message: 'Availability end date must be in the future',
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
}, { timestamps: true });

export default mongoose.model('FarmerForm', farmerFormSchema);