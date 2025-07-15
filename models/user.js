import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: false,
  },
  securityQuestions: [
    {
      type: String,
      required: false,
    },
  ],
  phone: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: false,
  },
  password: {
    type: String,
    required: true,
  },
  codeForget: {
    type: String,
    default: "",
  },
  imageUser: {
    type: String,
    required: false,
  },
  certification: {
    type: String,
    required: false,
  },
  companyname: {
    type: String,
    required: false,
  },
  isActivated: {
    type: Boolean,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ["admin", "farmer", "distributor", "transporter", "superAdmin"],
  },
  contactAttempts: {
    count: {
      type: Number,
      default: 0, // Tracks number of contact attempts today
    },
    lastReset: {
      type: Date,
      default: Date.now, // Tracks when the count was last reset
    },
  },
});

const User = mongoose.model("User", userSchema);

export default User;