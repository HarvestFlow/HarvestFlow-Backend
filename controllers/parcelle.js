import Parcelle from "../models/parcelle.js";
import mongoose from "mongoose"; // Ajout pour vérifier ObjectId

// Create or update a Parcelle for a user


// Créer une nouvelle Parcelle
export const createParcel = async (req, res) => {
    try {
      const { userId, shapes } = req.body;
  
      if (!userId || !shapes || !Array.isArray(shapes)) {
        return res.status(400).json({
          success: false,
          message: "userId et shapes sont requis",
        });
      }
  
      // Vérifier si un document existe déjà pour cet utilisateur
      let parcel = await Parcelle.findOne({ userId });
  
      if (parcel) {
        // Si un document existe, mettre à jour les shapes
        parcel.shapes = shapes; // Remplacer complètement les shapes existants
        const updatedParcel = await parcel.save();
        res.status(200).json({
          success: true,
          data: updatedParcel,
          message: "Parcelle mise à jour avec succès",
        });
      } else {
        // Si aucun document n'existe, créer un nouveau
        const newParcel = new Parcelle({
          userId,
          shapes,
        });
        const savedParcel = await newParcel.save();
        res.status(201).json({
          success: true,
          data: savedParcel,
          message: "Parcelle créée avec succès",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la création/mise à jour de la parcelle:", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message,
      });
    }
  };
  export const updateShape = async (req, res) => {
    const { userId, shapeId } = req.params;
    const { cropType, plantingDate, growthStage, estimatedYield, expectedHarvestDate } = req.body;
  
    try {
      const parcelle = await Parcelle.findOne({ userId });
      
      if (!parcelle) {
        return res.status(404).json({ message: "Parcel not found" });
      }
  
      const shape = parcelle.shapes.id(shapeId);
      if (!shape) {
        return res.status(404).json({ message: "Shape not found" });
      }
  
      // Mise à jour des attributs de la shape
      shape.properties.cropType = cropType;
      shape.properties.plantingDate = plantingDate;
      shape.properties.growthStage = growthStage;
      shape.properties.estimatedYield = estimatedYield;
      shape.properties.expectedHarvestDate = expectedHarvestDate;
  
      await parcelle.save();
      res.status(200).json(shape);
    } catch (error) {
      res.status(500).json({ message: "Error updating shape", error });
    }
  };
// Get a Parcelle by userId
export async function getParcelleByUserId(req, res) {
    try {
      const { userId } = req.params;
  
      // Vérifier si userId est un ObjectId valide
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId format." });
      }
  
      // Recherche de toutes les parcelles associées à l'userId
      const parcelles = await Parcelle.find({ userId }).lean(); // Utilisation de lean() pour optimiser la requête
  
      if (!parcelles || parcelles.length === 0) {
        return res.status(404).json({ message: "No parcelles found for this user." });
      }
  
      return res.status(200).json(parcelles);
    } catch (error) {
      console.error("Error in getParcelleByUserId:", error);
      return res.status(500).json({ message: "Error fetching Parcelle data." });
    }
  }
  
  export const deleteShape = async (req, res) => {
    try {
      const { userId, shapeId } = req.params;
  
      // Trouver le document de la parcelle pour cet utilisateur
      const parcel = await Parcelle.findOne({ userId });
      if (!parcel) {
        return res.status(404).json({
          success: false,
          message: "Aucune parcelle trouvée pour cet utilisateur",
        });
      }
  
      // Filtrer les shapes pour supprimer celui avec l'ID spécifié
      const initialLength = parcel.shapes.length;
      parcel.shapes = parcel.shapes.filter(
        (shape) => shape.properties.id !== parseInt(shapeId)
      );
  
      if (parcel.shapes.length === initialLength) {
        return res.status(404).json({
          success: false,
          message: "Forme non trouvée",
        });
      }
  
      // Sauvegarder les modifications
      await parcel.save();
  
      res.status(200).json({
        success: true,
        message: "Forme supprimée avec succès",
        data: parcel.shapes,
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de la forme:", error);
      res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message,
      });
    }
  };

