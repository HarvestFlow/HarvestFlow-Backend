// backend/controllers/farmerController.js
import Company from '../models/farmer.js';
import multer from 'multer';
import path from 'path';

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/certifications/'); // Dossier où seront stockés les fichiers
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accepter uniquement certains types de fichiers (ex: pdf, images)
    const filetypes = /pdf|jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers PDF et images sont acceptés'));
  }
}).single('certification'); // 'certification' est le nom du champ du fichier dans le form-data

export const updateFarmerProfile = async (req, res) => {
  // Middleware multer
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const { id } = req.params;
      const { productionType, productionMethod } = req.body;

      // Créer l'objet de mise à jour
      const updateFields = {};

      // Validation de productionType
      if (productionType) {
        const parsedProductionType = JSON.parse(productionType); // Car les arrays viennent en string via form-data
        const validTypes = ["Bio", "Conventionnel", "Raisonné"];
        if (!Array.isArray(parsedProductionType) || !parsedProductionType.every(type => validTypes.includes(type))) {
          return res.status(400).json({
            success: false,
            message: 'Type de production invalide. Doit être un tableau contenant uniquement: Bio, Conventionnel, ou Raisonné'
          });
        }
        updateFields.productionType = parsedProductionType;
      }

      // Validation de productionMethod
      if (productionMethod) {
        const parsedProductionMethod = JSON.parse(productionMethod);
        const validMethods = ["Bio", "Conventionnel", "Raisonné"];
        if (!Array.isArray(parsedProductionMethod) || !parsedProductionMethod.every(method => validMethods.includes(method))) {
          return res.status(400).json({
            success: false,
            message: 'Méthode de production invalide. Doit être un tableau contenant uniquement: Bio, Conventionnel, ou Raisonné'
          });
        }
        updateFields.productionMethod = parsedProductionMethod;
      }

      // Gestion du fichier certification
      if (req.file) {
        updateFields.certification = req.file.path; // Stocker le chemin du fichier
      }

      // Mise à jour dans la base de données
      const updatedFarmer = await Company.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updatedFarmer) {
        return res.status(404).json({
          success: false,
          message: 'Agriculteur non trouvé'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profil agriculteur mis à jour avec succès',
        data: updatedFarmer
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour',
        error: error.message
      });
    }
  });
};