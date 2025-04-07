import express from 'express';
import multer from 'multer';
import { uploadTradeData, getTradeFiles, getTradeData, updateTradeData, deleteTradeFile } from '../controllers/tradeController.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuration de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV et XLSX sont autorisés.'));
    }
  },
});

// Routes
router.post('/upload', upload.single('tradeData'), uploadTradeData);
router.get('/files/:userId', getTradeFiles); // Nouvelle route pour lister les fichiers
router.get('/:userId/:fileId', getTradeData); // Récupérer les données d’un fichier spécifique
router.put('/:userId/:fileId', updateTradeData); // Mettre à jour une entrée dans un fichier spécifique
router.delete('/:userId/:fileId', deleteTradeFile); // Supprimer un fichier spécifique

export default router;