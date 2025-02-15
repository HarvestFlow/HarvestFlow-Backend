import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: false, // Make lastname optional
  },
  securityQuestions: [
    {
      type: String,
      required: false
    }
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
    required: false, // Make imageUser optional
  },

  certification: {
    type: String,
    required: false, // Make imageUser optional
  },
  companyname: {
    type: String,
    required: false, // Make imageUser optional
  },





  createdAt: {
    type: Date,
    default: Date.now // La date par défaut est la date actuelle lors de la création du profil
  },
  role: {
    type: String,
    enum: ["admin", "farmer", "distributor", "transporter", "superAdmin"],
  },
 
  

});

const User = mongoose.model("User", userSchema);

export default User;
