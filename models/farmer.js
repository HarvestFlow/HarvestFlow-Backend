import mongoose from "mongoose";
const Schema = mongoose.Schema;
import User from "../models/user.js";

const farmerSchema = new Schema(
  {
    productionType: {
      type: [String],  // Array of strings
      enum: ["Bio", "Conventionnel", "Raisonné"],  // Options that can be selected
      required: false,  // Not required since it's optional
    },
    

      productionMethod: {
        type: [String],  // Array of strings
        enum: ["Bio", "Conventionnel", "Raisonné"],  // Options that can be selected
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

const Company = User.discriminator("farmer", farmerSchema);
export default Company;