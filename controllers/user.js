

import bcrypt from "bcryptjs";
import User from "../models/user.js";
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
      //const certificationFile = req.file.path;

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
            //certification: certificationFile, // Ajoutez le chemin du fichier de certification
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
           // certification: certificationFile, // Ajoutez le chemin du fichier de certification
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
           // certification: certificationFile, // Ajoutez le chemin du fichier de certification
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
        maxAge: 86400000, // Expire dans 24 heures
    });
  
      console.log("User created successfully");
      return res.status(201).json({ user, accessToken });
  
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Error creating user", error });
    }
  }
  export async function getUserById(req, res) {
    try {
      const userId = req.params.userId; // Accéder à la propriété userId de req.params
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({ user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  export async function addAdmin(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      const { firstname, lastname, phone, email, password } = req.body;
  
      const connect = req.auth.userId;
      console.log(connect);
  
      const Super = await User.findById(connect);
      const test = Super.role == "superAdmin";
  
      if (!test) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      // Hacher le mot de passe avec bcrypt
      const hashPass = await bcrypt.hash(password, 10);
  
      // Créer un nouvel administrateur
      const admin = await User.create({
        firstname,
        lastname,
        phone,
        email,
        password: hashPass,
        role: "admin",
      });
  
      // Générer des tokens
      const accessToken = await signAccessToken(admin.id);
      const refreshToken = await signRefreshToken(admin.id);
  
      // Envoyer les tokens dans la réponse
      await sendWelcomeEmail(admin);
  
      return res.status(201).json({ admin, accessToken, refreshToken });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error adding admin", error });
    }
  }
  
  export async function login(req, res, next) {
    try {
      const { email, password } = req.body;
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "No user found" });
      }
  
      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        return res.status(401).json({ message: "Password does not match" });
      }
  
      console.log("User role:", user.role);
      console.log("User id:", user.id);
  
      // Utilisation de signAccessToken
      const accessToken = await signAccessToken(user.id);
  
      // Stocker le token dans un Cookie HTTP-Only sécurisé
      res.cookie("accessToken", accessToken, {
        httpOnly: true, // Sécurise le cookie contre les scripts côté client
        secure: process.env.NODE_ENV === "production", // Secure seulement en prod
        sameSite: "Strict", // Protège contre CSRF
        maxAge: 86400000, // Expire dans 1 heure
      });
  
      // Réponse sans le token (il est stocké dans le cookie)
      res.status(200).json({
        message: "Login successful",
        role: user.role, // On envoie le rôle pour le frontend
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error logging in", error });
    }
  }
  export async function logout(req, res) {
    try {
      // Supprimer les cookies contenant les tokens
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Secure en mode production
        sameSite: "Strict",
      });
      
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Secure en mode production
        sameSite: "Strict",
      });
  
      // Répondre avec un message de succès
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error logging out:", error);
      return res.status(500).json({ message: "Error logging out", error });
    }
  }
  export async function updateUser(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const userId = req.params.userId; // Assurez-vous que le paramètre correspond à votre route
    const updateData = req.body;
  
    try {
      const user = await User.findById(req.auth.userId); // Récupérer l'utilisateur connecté
  
      // Vérifier si l'utilisateur n'est pas admin et que seul le superAdmin peut effectuer la mise à jour
      if (user.role !== 'superAdmin') {
        return res.status(401).json({ message: "Unauthorized action" });
      }
  
      // Vérifier si l'ID de l'utilisateur à mettre à jour est valide
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
  
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      user.history.push({ 
        action: `You updated user: ${updatedUser.firstname} ${updatedUser.lastname} (ID: ${userId})`, 
        timestamp: new Date() 
      });
      await user.save();
      console.log("User updated successfully:", updatedUser);
      return res.json({ user: updatedUser });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error updating user", error });
    }
  }
  // Fonction pour supprimer un utilisateur par le superAdmin
export async function deleteUser(req, res) {
    try {
      const { role, userId: currentUserId } = req.auth; // Récupérer le rôle et l'ID de l'utilisateur connecté (superAdmin)
      const { userId } = req.params; // Récupérer l'ID de l'utilisateur à supprimer
  
      if (role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized action' });
      }
  
      // Vérifier si l'ID de l'utilisateur à supprimer est valide
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      const deletedUser = await User.findByIdAndDelete(userId);
  
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Ajouter l'action de suppression à l'historique de l'utilisateur qui effectue la suppression
      const currentUser = await User.findById(currentUserId);
      if (!currentUser) {
        return res.status(404).json({ message: 'Current user not found' });
      }
      currentUser.history.push({ 
        action: `You have deleted the user: ${deletedUser.firstname} ${deletedUser.lastname} (ID: ${userId})`, 
        timestamp: new Date() 
      });
          await currentUser.save();
  
      return res.status(200).json({ message: 'User deleted successfully', user: deletedUser });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting user', error });
    }
  }  
  
  