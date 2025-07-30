import User from '../models/user.js';
import multer from 'multer';
import path from 'path';

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'certification') {
      cb(null, 'uploads/certifications/');
    } else if (file.fieldname === 'imageUser') {
      cb(null, 'uploads/user-images/');
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
]);

export const updateFarmerProfile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    try {
      const { id } = req.params;
      const {
        firstname,
        lastname,
        email,
        phone,
        companyname,
        country,
        address,
        productionType,
        productionMethod
      } = req.body;

      const updateFields = {};

      // Champs texte simples
      if (firstname) updateFields.firstname = firstname;
      if (lastname) updateFields.lastname = lastname;
      if (email) updateFields.email = email;
      if (phone) updateFields.phone = phone;
      if (companyname) updateFields.companyname = companyname;
      if (country) updateFields.country = country;
      if (address) updateFields.address = address;

      // Validation des tableaux
      if (productionType) {
        const parsedProductionType = JSON.parse(productionType);
        const validTypes = ["Bio", "Conventionnel", "Raisonné"];
        if (!Array.isArray(parsedProductionType) || !parsedProductionType.every(type => validTypes.includes(type))) {
          return res.status(400).json({
            success: false,
            message: 'Type de production invalide',
          });
        }
        updateFields.productionType = parsedProductionType;
      }

      if (productionMethod) {
        const parsedProductionMethod = JSON.parse(productionMethod);
        const validMethods = ["Bio", "Conventionnel", "Raisonné"];
        if (!Array.isArray(parsedProductionMethod) || !parsedProductionMethod.every(method => validMethods.includes(method))) {
          return res.status(400).json({
            success: false,
            message: 'Méthode de production invalide',
          });
        }
        updateFields.productionMethod = parsedProductionMethod;
      }

      // Fichiers
      if (req.files) {
        if (req.files['certification']) {
          updateFields.certification = req.files['certification'][0].path;
        }
        if (req.files['imageUser']) {
          updateFields.imageUser = req.files['imageUser'][0].path;
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: updatedUser,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message,
      });
    }
  });
};