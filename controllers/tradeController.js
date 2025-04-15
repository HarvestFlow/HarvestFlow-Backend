import fs from 'fs';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import { Trade, UploadLog } from '../models/Trade.js';
import { spawn } from 'child_process';

// Dictionary for column reference
const columnSynonyms = {
  quantity: [
    'quantity', 'quantité', 'qté', 'volume', 'amount', 'qty',
    'number', 'num', 'count', 'total_quantity', 'quantite', 'qte', 'amt'
  ],
  price: [
    'price', 'prix', 'cost', 'coût', 'unit_price', 'unit price', 'price per unit', 'total_price',
    'value', 'rate', 'unit_cost', 'total_cost', 'price_unit', 'cost_per_unit', 'valeur', 'montant'
  ],
  year: [
    'year', 'année', 'yr',
    'annee', 'y', 'season', 'harvest_year'
  ],
  surface: [
    'surface', 'superficie', 'area', 'superficie récoltée (ha)',
    'acreage', 'hectares', 'ha', 'land_area', 'surface_area', 'superfice'
  ],
  yield: [
    'yield', 'rendement', 'productivity', 'rendement (kg/ha)',
    'output_per_ha', 'yield_per_ha', 'productivity_rate', 'rendement_kg_ha'
  ],
  production: [
    'production', 'output', 'production (t)',
    'total_production', 'harvest', 'total_output', 'prod', 'tonnage', 'tons', 'tonnes'
  ],
  crop: [
    'crop', 'culture', 'produce', 'commodity', 'item',
    'product', 'grain', 'commodities', 'crops', 'cultivar', 'variety', 'cosecha', 'produit'
  ],
  date: [
    'date', 'day', 'jour', 'harvestdate', 'harvest date',
    'datetime', 'harvest_date', 'harvest_day', 'date_harvest', 'time'
  ],
  location: [
    'location', 'pays', 'country', 'lieu', 'region',
    'place', 'site', 'zone', 'territory', 'region_name', 'geo', 'loc', 'pays_name'
  ],
  quality: [
    'quality', 'qualité', 'grade',
    'standard', 'level', 'rating', 'qualite', 'qual'
  ],
  buyer: [
    'buyer', 'acheteur', 'purchaser',
    'client', 'customer', 'consumer', 'purchaser_name', 'buyer_name', 'acheteur_name'
  ],
};

// Flatten synonyms to get all reference terms for NLP
const referenceTerms = Object.entries(columnSynonyms).reduce((acc, [standard, synonyms]) => {
  synonyms.forEach(syn => acc[syn.toLowerCase()] = standard);
  return acc;
}, {});

console.log('Reference Terms:', referenceTerms); // Debug: Log reference terms

// Standard column names (keys of columnSynonyms) for validation
const standardColumnsRef = Object.keys(columnSynonyms);

// Normalize column names using Sentence-BERT via Python script (batch processing)
const normalizeColumnNames = async (columnNames) => {
  if (!columnNames || columnNames.length === 0) return columnNames;

  const lowerCols = columnNames.map(col => col.toLowerCase().trim());

  // Prepare input for Python script
  const inputData = {
    column_names: lowerCols,
    reference_terms: referenceTerms,
  };

  // Call the Python script
  const pythonProcess = spawn('python', ['./compute_similarity.py']);

  return new Promise((resolve, reject) => {
    // Send input data to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();

    let output = '';
    let errorOutput = '';

    // Collect output from Python script
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Collect errors from Python script
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Handle process exit
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Error output: ${errorOutput}`);
        return reject(new Error(`Python script failed: ${errorOutput}`));
      }

      try {
        const results = JSON.parse(output);
        const normalizedCols = results.map(result => {
          console.log(`Column "${result.column}" best match: "${result.best_match}" (score: ${result.score}) -> "${result.standard}"`);
          // Use a threshold for semantic similarity (e.g., 0.7)
          return result.score > 0.7 ? result.standard : result.column;
        });
        resolve(normalizedCols);
      } catch (err) {
        console.error(`Failed to parse Python output: ${output}`);
        reject(err);
      }
    });
  });
};

// Helper function to split a row into an array of values
const splitRowData = (row) => {
  if (typeof row === 'string') {
    return row.split(',').map(item => item.trim());
  }
  if (Array.isArray(row) && row.length === 1 && typeof row[0] === 'string') {
    return row[0].split(',').map(item => item.trim());
  }
  return Array.isArray(row) ? row.map(item => String(item).trim()) : [];
};

// Upload and normalize trade data
export const uploadTradeData = async (req, res) => {
  try {
    const file = req.file;
    const { userId, dataType } = req.body;

    if (!file) return res.status(400).json({ message: 'Aucun fichier uploadé' });
    if (!userId) return res.status(400).json({ message: 'User ID requis' });
    if (!dataType || !['production', 'stocks', 'offres'].includes(dataType)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Type de données invalide. Choisissez entre production, stocks ou offres.' });
    }

    let results = [];
    let columns = [];

    if (file.mimetype === 'text/csv') {
      results = await new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(file.path)
          .pipe(parse({ columns: true, trim: true }))
          .on('data', (row) => data.push(row))
          .on('end', () => resolve(data))
          .on('error', reject);
      });
      columns = results.length > 0 ? Object.keys(results[0]) : [];
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      console.log('Raw sheet data:', XLSX.utils.sheet_to_json(sheet, { header: 1 }));
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rawData.length === 0) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ message: 'Fichier XLSX vide' });
      }

      const headers = rawData[0];
      console.log('Extracted headers:', headers);

      if (headers.length === 1 && typeof headers[0] === 'string' && headers[0].includes(',')) {
        columns = headers[0].split(',').map(header => header.trim());
      } else {
        columns = headers.map(header => String(header).trim());
      }

      const rawRows = rawData.slice(1);
      console.log('Raw data rows:', rawRows);

      results = rawRows.map(row => {
        const rowValues = splitRowData(row);
        console.log('Split row values:', rowValues);
        const rowData = {};
        columns.forEach((col, idx) => {
          rowData[col] = rowValues[idx] || '';
        });
        return rowData;
      });
    } else {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Type de fichier non supporté. Utilisez CSV ou XLSX.' });
    }

    console.log('Final columns before normalization:', columns);
    console.log('Processed results:', results);

    // Normalize all columns in one batch using Sentence-BERT
    const normalizedColumns = await normalizeColumnNames(columns);
    console.log('Normalized columns:', normalizedColumns);

    const unrecognizedColumns = normalizedColumns.filter(col => !standardColumnsRef.includes(col));
    if (unrecognizedColumns.length > 0) {
      console.warn(`Unrecognized columns: ${unrecognizedColumns.join(', ')}`);
    }

    const finalColumns = normalizedColumns;
    const normalizedData = results.map(entry => {
      const normalizedEntry = {};
      columns.forEach((col, idx) => {
        const normCol = normalizedColumns[idx];
        if (['price', 'quantity', 'year', 'surface', 'yield', 'production'].includes(normCol)) {
          normalizedEntry[normCol] = Number(entry[col] || 0);
        } else {
          normalizedEntry[normCol] = String(entry[col] || '');
        }
      });
      return normalizedEntry;
    });

    const trade = new Trade({
      userId,
      filename: file.originalname,
      dataType,
      data: normalizedData,
      columns: finalColumns,
      rowCount: normalizedData.length,
      uploadedAt: new Date(),
    });

    await trade.save();

    await UploadLog.create({
      userId,
      fileId: trade._id,
      filename: file.originalname,
      dataType,
      status: 'success',
      errorMessage: unrecognizedColumns.length > 0
        ? `Colonnes non normalisées : ${unrecognizedColumns.join(', ')}`
        : undefined,
    });

    fs.unlinkSync(file.path);
    res.json({ message: 'Fichier uploadé avec succès', trade });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error.message);
    if (fs.existsSync(req.file?.path)) fs.unlinkSync(req.file.path);

    await UploadLog.create({
      userId: req.body.userId || 'unknown',
      filename: req.file?.originalname || 'unknown',
      dataType: req.body.dataType || 'unknown',
      status: 'failed',
      errorMessage: error.message,
      fileId: undefined,
    });

    res.status(500).json({ message: 'Erreur serveur lors de l\'upload' });
  }
};

// Get list of uploaded files
export const getTradeFiles = async (req, res) => {
  try {
    const userId = req.params.userId;
    const files = await Trade.find({ userId }).select('filename dataType rowCount columns uploadedAt _id');
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Aucun fichier trouvé pour cet utilisateur.' });
    }
    res.json({ files });
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des fichiers' });
  }
};

// Get data for a specific file
export const getTradeData = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }
    res.json({ data: trade.data, columns: trade.columns });
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données' });
  }
};

// Update a specific row in a file
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

    const validKeys = trade.columns;
    for (const key of Object.keys(updatedData)) {
      if (!validKeys.includes(key)) {
        return res.status(400).json({ message: `Clé invalide : ${key}` });
      }
    }

    trade.data[rowIndex] = { ...trade.data[rowIndex], ...updatedData };
    await trade.save();

    res.json({ message: 'Donnée mise à jour', data: trade.data });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
  }
};

// Delete a specific file
export const deleteTradeFile = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const trade = await Trade.findOneAndDelete({ userId, _id: fileId });
    if (!trade) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    await UploadLog.deleteMany({ fileId });
    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
};