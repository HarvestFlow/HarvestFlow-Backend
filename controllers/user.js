

import bcrypt from "bcryptjs";
import user from "../models/user.js";
import { auth, invalidateRefreshToken } from '../middlewares/auth.js';
import { signAccessToken, signRefreshToken , verifyRefreshToken} from "../middlewares/auth.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import distributor from "../models/distributor.js";
import farmer from "../models/farmer.js";
import transporter from "../models/transporter.js";





let utilisateur;

try {
  // Vérifiez si le modèle User existe déjà
  utilisateur = mongoose.model('User');
} catch (error) {
  // Si le modèle n'existe pas, compilez-le
  const userSchema = new mongoose.Schema({
    // Vos autres champs de modèle...
    createdAt: {
      type: Date,
      default: Date.now // La date par défaut est la date actuelle lors de la création du profil
    }
  });

  // Compilez le modèle User
  utilisateur = mongoose.model('User', userSchema);
}


export async function createUser(req, res) {
    // 1️⃣ **Validation des Données**
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      // 2️⃣ **Récupération des Données de la Requête**
      const {
        firstname,
        lastname,
        securityQuestions,
        phone,
        email,
        password,
        companyname,
        certification,
        role,

        productionType,
        productionMethod ,
        country,
        address,

        buisnessType,
        volumeApprovisionnement,
        

        // Ajout pour Distributor
      } = req.body;
  
      // 3️⃣ **Vérification si l'utilisateur existe déjà**
      const existingUser = await (role === "farmer" ? farmer 
                            : role === "distributor" ? distributor 
                            : transporter).findOne({ email });
  
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
  
      // 4️⃣ **Hachage du Mot de Passe**
      const hashPass = await bcrypt.hash(password, 10);
      let user;
  
      // 5️⃣ **Création du compte selon le rôle**
      if (role === "farmer") {
        console.log("Creating challenger account...");
        user = await farmer.create({
            firstname,
            lastname,
            securityQuestions,
            phone,
            email,
            password: hashPass,
            companyname,
            certification,
            role,
            country,
            address,
            securityQuestions,
            productionType,
            productionMethod ,

        });
      } else if (role === "distributor") {
        console.log("Creating company account...");
        user = await distributor.create({
            firstname,
            lastname,
            securityQuestions,
            phone,
            email,
            password: hashPass,
            companyname,
            certification,
            role,
            country,
            address,
            buisnessType,
            volumeApprovisionnement,
            

        });
      } else if (role === "transporter") {
        console.log("Creating distributor account...");
        user = await transporter.create({
            firstname,
            lastname,
            securityQuestions,
            phone,
            email,
            password: hashPass,
            companyname,
            certification,
            role,
            country,
            address,


        });
      } else {
        return res.status(400).json({ message: "Invalid role" });
      }
  
      // 6️⃣ **Vérification de la Création**
      if (!user) {
        console.log("User creation failed");
        return res.status(500).json({ message: "User creation failed" });
      }
  
      // 7️⃣ **Génération du Token**
      const accessToken = await signAccessToken(user.id);
  
      // 8️⃣ **Stocker le Token dans un Cookie Sécurisé**
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 3600000, // 1 heure
      });
  
      console.log("User created successfully");
      return res.status(201).json({ user, accessToken });
  
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Error creating user", error });
    }
  }
  