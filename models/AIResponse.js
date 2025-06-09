import mongoose from 'mongoose';

const aiResponseSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const AIResponseModel = mongoose.model('AIResponse', aiResponseSchema);