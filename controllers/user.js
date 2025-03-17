

import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { auth, invalidateRefreshToken } from '../middlewares/auth.js';
import { signAccessToken, signRefreshToken , verifyRefreshToken} from "../middlewares/auth.js";

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
        isActivated,
        role,

        productionType,
        productionMethod ,
        country,
        address,

        buisnessType,
        volumeApprovisionnement,
         


        // Ajout pour Distributor
      } = req.body;
      console.log("Data received in request body:", req.body);  // Affiche tout le corps de la requête

  
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
          //  certification: certificationFile, // Ajoutez le chemin du fichier de certification
            role,
            country,
            address,
            securityQuestions,
            productionType,
            productionMethod ,
            isActivated,
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
            certification: certificationFile, // Ajoutez le chemin du fichier de certification
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
            certification: certificationFile, // Ajoutez le chemin du fichier de certification
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
  
      // Envoyer les tokens dans la réponse
      await sendWelcomeEmail(admin);

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 86400000, // Expire dans 24 heures
    });
      return res.status(201).json({ admin, accessToken });
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
  
  export async function getAllAdmins(req, res) {
    try {
      const { role } = req.auth; 
  
      if (role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized action' });
      }
  
      const users = await User.find({ role: 'admin' });
  
      return res.status(200).json({ users });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching admins', error });
    }
  }

  export async function getProfile(req, res) {
    const userId = req.auth.userId;
  
    if (!userId) {
      return res.status(400).json({ error: "User ID is missing" });
    }
  
    try {
      let profile = await User.findById(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if isActivated exists, if not, set it to false and save
      if (typeof profile.isActivated === 'undefined') {
        profile.isActivated = false;
        await profile.save();
      }
      
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
}
  
  // Fonction pour supprimer un utilisateur par le superAdmin

 
  export async function uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        console.log('Aucun fichier trouvé dans la requête.');
        return res.status(400).send('Aucun fichier téléchargé.');
      }
  
      const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      console.log(`L'URL de l'image est : ${imageUrl}`);
  
      const user = await User.findByIdAndUpdate(
        req.userId, // Assurez-vous que req.userId est valide
        { imageUser: imageUrl },
        { new: true }
      );
  
      if (!user) {
        console.log(`Utilisateur non trouvé avec l'ID: ${req.userId}`);
        return res.status(404).send('Utilisateur non trouvé.');
      }
  
      res.json({ imageUrl: user.imageUser });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image :', error.message);
      res.status(500).send('Erreur lors de la mise à jour de l\'image.');
    }
  }
  
  export function updateProfile(req, res) {
    const updateData = req.body;
  
    if (!mongoose.Types.ObjectId.isValid(req.auth.userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
  
    if (req.file && req.file.filename) {
      const imagePath = req.file.filename;
      updateData.imageUser = imagePath;
    }
  
    User.findById(req.auth.userId)
      .then((user) => {
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
  
        if (user.role === 'challenger') {
          challenger
            .findOneAndUpdate({ _id: req.auth.userId }, updateData, { new: true })
            .then((updatedChallenged) => {
              res.status(200).json(updatedChallenged);
            })
            .catch((err) => {
              res.status(500).json({ error: err });
            });
        } else if (user.role === 'company') {
          Company.findOneAndUpdate({ _id: req.auth.userId }, updateData, { new: true })
            .then((updatedCompany) => {
              res.status(200).json(updatedCompany);
            })
            .catch((err) => {
              res.status(500).json({ error: err });
            });
        }
      })
      .catch((err) => {
        res.status(500).json({ error: err });
      });
  }
  
////////////////////////////////////////////////////////
     
////////////////////////////////////////////////////////
export const updateUserActivation = async (req, res) => {
  const { userId } = req.params; // ID de l'utilisateur à modifier (passé dans l'URL)
  const loggedInUserId = req.auth.userId; // ID de l'utilisateur connecté
  const { isActivated } = req.body;

  try {
    if (typeof isActivated !== 'boolean') {
      return res.status(400).json({ message: 'isActivated doit être un booléen' });
    }

    // Vérifier si l'utilisateur connecté est autorisé (exemple : admin)
    const loggedInUser = await User.findById(loggedInUserId);
    if (!loggedInUser ) { // Suppose un champ isAdmin
      return res.status(403).json({ message: 'Accès refusé : droits administratifs requis' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActivated },
      { new: true, runValidators: true }
    ).select('_id email isActivated');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
};
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '_id email isActivated certification').lean(); // Sélectionne uniquement les champs nécessaires
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message,
    });
  }
};