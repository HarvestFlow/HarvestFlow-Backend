// backend/controllers/farmerController.js
import Company from '../models/farmer.js';
import multer from 'multer';
import path from 'path';

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'certification') {
      cb(null, 'uploads/certifications/');
    } else if (file.fieldname === 'imageUser') {
      cb(null, 'uploads/user-images/'); // New folder for user images
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers PDF et images (JPEG, JPG, PNG) sont acceptés'));
  }
}).fields([
  { name: 'certification', maxCount: 1 },
  { name: 'imageUser', maxCount: 1 }
]); // Handle multiple fields

export const updateFarmerProfile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Erreur Multer:', err.message); // Log erreur multer
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    try {
      console.log('Fichiers reçus par Multer:', req.files); // Log des fichiers
      console.log('Corps de la requête:', req.body); // Log des données textuelles

      const { id } = req.params;
      const { productionType, productionMethod } = req.body;

      const updateFields = {};

      // Validation de productionType
      if (productionType) {
        const parsedProductionType = JSON.parse(productionType);
        const validTypes = ["Bio", "Conventionnel", "Raisonné"];
        if (!Array.isArray(parsedProductionType) || !parsedProductionType.every(type => validTypes.includes(type))) {
          return res.status(400).json({
            success: false,
            message: 'Type de production invalide. Doit être un tableau contenant uniquement: Bio, Conventionnel, ou Raisonné',
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
            message: 'Méthode de production invalide. Doit être un tableau contenant uniquement: Bio, Conventionnel, ou Raisonné',
          });
        }
        updateFields.productionMethod = parsedProductionMethod;
      }

      // Gestion des fichiers
      if (req.files) {
        if (req.files['certification']) {
          console.log('Certification détectée:', req.files['certification'][0].path);
          updateFields.certification = req.files['certification'][0].path;
        }
        if (req.files['imageUser']) {
          console.log('ImageUser détectée:', req.files['imageUser'][0].path);
          updateFields.imageUser = req.files['imageUser'][0].path;
        } else {
          console.log('Aucune imageUser détectée dans req.files');
        }
      } else {
        console.log('Aucun fichier reçu dans req.files');
      }

      // Mise à jour dans la base de données
      console.log('Champs à mettre à jour:', updateFields);
      const updatedFarmer = await Company.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updatedFarmer) {
        return res.status(404).json({
          success: false,
          message: 'Agriculteur non trouvé',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profil agriculteur mis à jour avec succès',
        data: updatedFarmer,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour',
        error: error.message,
      });
    }
  });
};