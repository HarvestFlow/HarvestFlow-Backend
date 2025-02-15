import multer from 'multer';
import path from 'path';

// Configuration de multer pour définir l'emplacement des fichiers téléchargés
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Définir le répertoire où le fichier sera stocké
    cb(null, 'uploads/certifications'); // Répertoire "uploads/certifications"
  },
  filename: (req, file, cb) => {
    // Définir le nom du fichier avec un préfixe d'ID unique
    cb(null, Date.now() + path.extname(file.originalname)); // Ajoute un horodatage pour rendre les noms de fichiers uniques
  }
});

// Définir les règles de filtre pour les fichiers
const fileFilter = (req, file, cb) => {
  // Permettre seulement les fichiers de type PDF ou image
  const fileTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Le fichier doit être une image ou un fichier PDF.'));
  }
};

// Créer l'instance de multer avec la configuration
const upload = multer({ storage, fileFilter });
