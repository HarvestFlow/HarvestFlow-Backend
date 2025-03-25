import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["harvest", "input"],
  },
  type: {
    type: String,
    required: true,
    enum: ["wheat", "barley", "other_cereals", "pesticide", "fertilizer", "seeds"],
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    enum: ["t", "kg", "bushels", "sacks", "L"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Stock", stockSchema);