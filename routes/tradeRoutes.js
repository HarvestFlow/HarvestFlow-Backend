import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadTradeData,
  getTradeFiles,
  getTradeData,
  updateTradeData,
  deleteTradeFile,
  addTradeColumn,
  deleteTradeColumn,
  addTradeRow,
  deleteTradeRow,
} from '../controllers/tradeController.js';

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
router.post('/upload', upload.single('tradeData'), uploadTradeData); // Upload a new file
router.get('/files/:userId', getTradeFiles); // List all files for a user
router.get('/:userId/:fileId', getTradeData); // Get data for a specific file
router.put('/:userId/:fileId', updateTradeData); // Update a specific row in a file
router.delete('/:userId/:fileId', deleteTradeFile); // Delete a specific file
router.post('/:userId/:fileId/column', addTradeColumn); // Add a new column
router.delete('/:userId/:fileId/column', deleteTradeColumn); // Delete a column
router.post('/:userId/:fileId/row', addTradeRow); // Add a new row
router.delete('/:userId/:fileId/row', deleteTradeRow); // Delete a row

export default router;