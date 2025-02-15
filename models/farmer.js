import mongoose from "mongoose";
const Schema = mongoose.Schema;
import User from "../models/user.js";

const farmerSchema = new Schema(
  {
    productionType: {
        type: String,
        enum: ["Bio", "Conventionnel","Raisonné"],
        required: false,
      },

      productionMethod: {
        type: String,
        enum: ["Fruits", "legumes","Cereales"],
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