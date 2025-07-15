import mongoose from "mongoose";

const sendInterestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  totalSends: {
    type: Number,
    default: 3,
  },
});

const SendInterest = mongoose.model("SendInterest", sendInterestSchema);

export default SendInterest;