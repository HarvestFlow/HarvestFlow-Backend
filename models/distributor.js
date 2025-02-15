import mongoose from "mongoose";
const Schema = mongoose.Schema;
import User from "../models/user.js";

const distributorSchema = new Schema(
  {
    buisnessType: {
        type: String,
        enum: ["GROS", "detail"],
        required: false,
      },

      volumeApprovisionnement: {
        type: String,
        enum: ["petit", "moyen"],
        required: false,
      },
    
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

const Company = User.discriminator("distributor", distributorSchema);
export default Company;