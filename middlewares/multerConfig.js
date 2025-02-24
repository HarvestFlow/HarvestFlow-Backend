import multer, { diskStorage } from 'multer';
import path from 'path';

// Définir les extensions MIME pour les fichiers Excel et les notebooks Python
const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/x-ipynb+json': 'ipynb',
  'text/plain': 'txt', // Ajout pour les fichiers texte
  'application/vnd.ms-powerpoint': 'ppt', // Ajout pour les présentations PowerPoint
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', // Ajout pour les présentations PowerPoint
  'text/x-python': 'py', // Ajout pour les fichiers Python
  'video/mp4': 'mp4', // Ajout pour les fichiers vidéo MP4
  'video/quicktime': 'mov', // Ajout pour les fichiers vidéo MOV
  'image/gif': 'gif', // Ajout pour les fichiers GIF
  'image/bmp': 'bmp', // Ajout pour les fichiers BMP
  'text/csv': 'csv', // Ajout pour les fichiers CSV
  'application/json': 'json', // Ajout pour les fichiers JSON
  'application/pdf': 'pdf' // Ajout pour les fichiers PDF
};


const storage = diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'uploads/'); // Répertoire de stockage
  },
  filename: (req, file, callback) => {
    // Générer un nom de fichier unique avec une extension appropriée
    const extension = MIME_TYPES[file.mimetype];
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const relativePath = file.fieldname + '_' + uniqueSuffix + '.' + extension;
    callback(null, relativePath); // Stocker le chemin relatif du fichier
  },
});


// Configuration de multer avec les options de stockage
const upload = multer({
  storage: storage,
  // Limiter la taille des fichiers à 10Mo
  limits: { fileSize: 10 * 1024 * 1024 },
  // Filtre pour accepter uniquement les fichiers d'image, les fichiers Excel et les notebooks Python
  fileFilter: (req, file, callback) => {
    const isValidFileType = !!MIME_TYPES[file.mimetype];
    if (isValidFileType) {
      callback(null, true);
    } else {
      callback(new Error('Invalid file type.'));
    }
  },
}).single('file'); // Le fichier est envoyé dans le body avec le nom/clé 'file'

export default upload;
