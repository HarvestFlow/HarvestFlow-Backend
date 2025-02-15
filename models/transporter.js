import mongoose from "mongoose";
const Schema = mongoose.Schema;
import User from "../models/user.js";

const transporterSchema = new Schema(
  {
  

    country: {
        type: String,
        required: false,
      },

    address: {
      type: String,
      required: false,
       },

   
  },
 
  {
    discriminatorKey: "role",
  }
);

const Company = User.discriminator("transporter", transporterSchema);
export default Company;