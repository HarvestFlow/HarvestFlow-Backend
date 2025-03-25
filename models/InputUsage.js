import mongoose from "mongoose";

const inputUsageSchema = new mongoose.Schema({
  shapeId: {
    type: String,
    required: true,
  },
  inputId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stock",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("InputUsage", inputUsageSchema);