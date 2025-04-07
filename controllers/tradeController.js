import fs from 'fs';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import { Trade, UploadLog } from '../models/Trade.js';

export const uploadTradeData = async (req, res) => {
  try {
    const file = req.file;
    const { userId, dataType } = req.body;

    // Validation des entrées
    if (!file) return res.status(400).json({ message: 'Aucun fichier uploadé' });
    if (!userId) return res.status(400).json({ message: 'User ID requis' });
    if (!dataType || !['production', 'stocks', 'offres'].includes(dataType)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Type de données invalide. Choisissez entre production, stocks ou offres.' });
    }

    // Parser le fichier selon son type
    let results = [];
    let columns = [];

    if (file.mimetype === 'text/csv') {
      // Parser le CSV
      results = await new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(file.path)
          .pipe(parse({ columns: true, trim: true }))
          .on('data', (row) => {
            data.push(row);
          })
          .on('end', () => resolve(data))
          .on('error', reject);
      });
      columns = results.length > 0 ? Object.keys(results[0]) : [];
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Parser le XLSX
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      results = XLSX.utils.sheet_to_json(sheet);
      columns = results.length > 0 ? Object.keys(results[0]) : [];
    } else {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Type de fichier non supporté. Utilisez CSV ou XLSX.' });
    }

    // Créer un nouveau document pour chaque fichier téléversé
    const trade = new Trade({
      userId,
      filename: file.originalname,
      dataType,
      data: results,
      columns,
      rowCount: results.length,
      uploadedAt: new Date(),
    });

    await trade.save();

    // Journaliser le succès
    await UploadLog.create({
      userId,
      fileId: trade._id,
      filename: file.originalname,
      dataType,
      status: 'success',
    });

    fs.unlinkSync(file.path); // Supprime le fichier temporaire

    res.json({ message: 'Fichier uploadé avec succès', trade });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    if (fs.existsSync(req.file?.path)) fs.unlinkSync(req.file.path);

    // Journaliser l'échec
    await UploadLog.create({
      userId: req.body.userId || 'unknown',
      filename: req.file?.originalname || 'unknown',
      dataType: req.body.dataType || 'unknown',
      status: 'failed',
      errorMessage: error.message,
    });

    res.status(500).json({ message: 'Erreur serveur lors de l\'upload' });
  }
};

// Récupérer la liste des fichiers téléversés
export const getTradeFiles = async (req, res) => {
  try {
    const userId = req.params.userId;
    const files = await Trade.find({ userId }).select('filename dataType rowCount columns uploadedAt _id');
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Aucun fichier trouvé pour cet utilisateur.' });
    }
    res.json({ files });
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des fichiers' });
  }
};

// Récupérer les données d’un fichier spécifique
export const getTradeData = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }
    res.json({ data: trade.data, columns: trade.columns });
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données' });
  }
};

// Mettre à jour une entrée dans un fichier spécifique
export const updateTradeData = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const { rowIndex, updatedData } = req.body;

    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    if (rowIndex < 0 || rowIndex >= trade.data.length) {
      return res.status(400).json({ message: 'Index de ligne invalide' });
    }

    // Mettre à jour la ligne spécifique
    trade.data[rowIndex] = updatedData;
    await trade.save();

    res.json({ message: 'Donnée mise à jour', data: trade.data });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
  }
};

// Supprimer un fichier spécifique
export const deleteTradeFile = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const trade = await Trade.findOneAndDelete({ userId, _id: fileId });
    if (!trade) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Supprimer les logs associés
    await UploadLog.deleteMany({ fileId });

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
};