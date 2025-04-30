
import fs from 'fs';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import { Trade, UploadLog } from '../models/Trade.js';
import { spawn } from 'child_process';
import { franc } from 'franc';

// Dictionary for column reference (expanded with Spanish synonyms)
const columnSynonyms = {
  quantity: [
    'quantity', 'quantité', 'qté', 'volume', 'amount', 'qty',
    'number', 'num', 'count', 'total_quantity', 'quantite', 'qte', 'amt',
    'الكمية', 'كمية', 'عدد', 'مجموع_الكمية',
    'cantidad', 'volumen', 'total_cantidad'
  ],
  unit_price: [
    'unit_price', 'unit price', 'price per unit', 'unit_cost', 'cost_per_unit', 'price_unit', 'rate',
    'سعر_الوحدة', 'تكلفة_الوحدة',
    'precio_por_unidad', 'precio_unitario', 'costo_por_unidad'
  ],
  total_price: [
    'total_price', 'total_cost', 'price', 'prix', 'cost', 'coût', 'value', 'valeur', 'montant',
    'سعر', 'السعر', 'تكلفة', 'إجمالي_السعر',
    'precio', 'costo', 'precio_total', 'costo_total'
  ],
  year: [
    'year', 'année', 'yr', 'annee', 'y', 'season', 'harvest_year',
    'سنة', 'السنة', 'عام',
    'año', 'ano'
  ],
  surface: [
    'surface', 'superficie', 'superficie récoltée (ha)', 'acreage', 'hectares', 'ha', 'land_area', 'surface_area', 'superfice',
    'مساحة', 'السطح', 'هكتار',
    'superficie', 'hectáreas', 'area'
  ],
  yield: [
    'yield', 'rendement', 'productivity', 'rendement (kg/ha)', 'output_per_ha', 'yield_per_ha', 'productivity_rate', 'rendement_kg_ha',
    'إنتاجية', 'المحصول', 'الغلة',
    'rendimiento', 'productividad'
  ],
  production: [
    'production', 'output', 'production (t)', 'total_production', 'harvest', 'total_output', 'prod', 'tonnage', 'tons', 'tonnes',
    'إنتاج', 'الإنتاج', 'محصول',
    'producción', 'cosecha', 'produccion'
  ],
  crop: [
    'crop', 'culture', 'produce', 'commodity', 'item', 'product', 'grain', 'commodities', 'crops', 'cultivar', 'variety', 'cosecha', 'produit',
    'محصول', 'زراعة', 'منتج', 'اسم_المنتج',
    'cultivo', 'producto', 'nombre_del_producto'
  ],
  date: [
    'date', 'day', 'jour', 'harvestdate', 'harvest date', 'datetime', 'harvest_date', 'harvest_day', 'date_harvest', 'time',
    'تاريخ', 'التاريخ', 'تاريخ_المعاملة',
    'fecha', 'fecha_de_transacción', 'fecha_transaccion'
  ],
  location: [
    'location', 'pays', 'country', 'lieu', 'region', 'area', 'place', 'site', 'zone', 'territory', 'region_name', 'geo', 'loc', 'pays_name',
    'موقع', 'بلد', 'دولة', 'الدولة_المستوردة',
    'país', 'pais', 'país_importador', 'pais_importador', 'ubicación', 'ubicacion'
  ],
  quality: [
    'quality', 'qualité', 'grade', 'standard', 'level', 'rating', 'qualite', 'qual',
    'جودة', 'الجودة', 'درجة',
    'calidad', 'nivel'
  ],
  buyer: [
    'buyer', 'acheteur', 'purchaser', 'client', 'customer', 'consumer', 'purchaser_name', 'buyer_name', 'acheteur_name',
    'مشتري', 'المشتري', 'عميل', 'العميل',
    'comprador', 'cliente'
  ],
  transaction_id: [
    'transaction_id', 'transaction_number', 'deal_id', 'order_id',
    'رقم_المعاملة', 'معرف_المعاملة',
    'número_de_transacción', 'numero_de_transaccion', 'id_transacción', 'id_transaccion'
  ],
  payment_method: [
    'payment_method', 'payment_type', 'method_of_payment',
    'طريقة_الدفع', 'طريقة_الدفع',
    'método_de_pago', 'metodo_de_pago', 'forma_de_pago'
  ],
  notes: [
    'notes', 'remarks', 'comments', 'observations',
    'ملاحظات', 'تعليقات',
    'notas', 'observaciones', 'comentarios'
  ],
  unit: [
    'unit', 'unité', 'measure', 'measurement',
    'وحدة', 'الوحدة',
    'unidad', 'medida'
  ],
  currency: [
    'currency', 'monnaie', 'money',
    'عملة', 'العملة',
    'moneda', 'divisa'
  ]
};

// Flatten synonyms to get all reference terms for NLP
const referenceTerms = Object.entries(columnSynonyms).reduce((acc, [standard, synonyms]) => {
  synonyms.forEach(syn => acc[syn.toLowerCase()] = standard);
  return acc;
}, {});

// Standard column names for validation
const standardColumnsRef = Object.keys(columnSynonyms);

// Translate text (column names or messages) to target language
const translateText = async (text, sourceLang, targetLang) => {
  if (sourceLang === targetLang) return Array.isArray(text) ? text : [text];
  const pythonProcess = spawn('python', ['./translate_columns.py']);
  return new Promise((resolve, reject) => {
    pythonProcess.stdin.write(JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }, null, 2), 'utf8');
    pythonProcess.stdin.end();

    let output = '';
    let errorOutput = '';
    pythonProcess.stdout.on('data', (data) => (output += data.toString('utf8')));
    pythonProcess.stderr.on('data', (data) => (errorOutput += data.toString('utf8')));

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Translation script error: ${errorOutput}`);
        return reject(new Error(`Translation script failed: ${errorOutput}`));
      }
      try {
        const results = JSON.parse(output);
        resolve(results.translated_text);
      } catch (err) {
        console.error(`Failed to parse translation output: ${output}`);
        reject(err);
      }
    });
  });
};

// Normalize column names using direct matching or Sentence-BERT
const normalizeColumnNames = async (columnNames, detectedLang) => {
  if (!columnNames || columnNames.length === 0) {
    console.warn('No column names provided for normalization');
    return columnNames || [];
  }

  // Validate and clean column names
  const validColumns = columnNames
    .map(col => String(col || '').trim())
    .filter(col => col !== '');
  if (validColumns.length === 0) {
    console.warn('No valid column names after cleaning');
    return columnNames;
  }

  // Debug: Log columns before normalization
  console.log('Columns before normalization:', validColumns);

  // Direct matching for non-English languages
  const normalizedCols = validColumns.map(col => {
    const lowerCol = col.toLowerCase();
    return referenceTerms[lowerCol] || col;
  });

  // If any columns were normalized via direct matching, return them
  if (normalizedCols.some((col, idx) => col !== validColumns[idx])) {
    console.log('Normalized using reference terms:', normalizedCols);
    return normalizedCols;
  }

  // Try translation and similarity-based normalization
  let translatedColumns;
  try {
    translatedColumns = await translateText(validColumns, detectedLang, 'en');
    console.log('Translated columns:', translatedColumns);
  } catch (err) {
    console.error(`Translation failed: ${err.message}`);
    return normalizedCols; // Fallback to direct matching
  }

  const lowerCols = translatedColumns.map(col => String(col || '').toLowerCase().trim());
  const inputData = { column_names: lowerCols, reference_terms: referenceTerms };

  const pythonProcess = spawn('python', ['./compute_similarity.py']);
  return new Promise((resolve, reject) => {
    pythonProcess.stdin.write(JSON.stringify(inputData, null, 2), 'utf8');
    pythonProcess.stdin.end();

    let output = '';
    let errorOutput = '';
    pythonProcess.stdout.on('data', (data) => (output += data.toString('utf8')));
    pythonProcess.stderr.on('data', (data) => (errorOutput += data.toString('utf8')));

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script error: ${errorOutput}`);
        return reject(new Error(`Python script failed: ${errorOutput}`));
      }
      try {
        const results = JSON.parse(output);
        const normalizedCols = results.map(result => {
          console.log(`Column "${result.column}" -> "${result.standard}" (score: ${result.score})`);
          return result.score > 0.6 ? result.standard : result.column; // Lowered threshold
        });
        // Ensure output length matches input
        const finalCols = columnNames.map((col, idx) =>
          validColumns.includes(col) ? normalizedCols[validColumns.indexOf(col)] : col
        );
        resolve(finalCols);
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
  return Array.isArray(row) ? row.map(item => String(item || '').trim()) : [];
};

// Detect language of column names
const detectColumnLanguage = (columnNames) => {
  try {
    const validText = columnNames
      .map(col => String(col || '').trim())
      .filter(col => col !== '')
      .join(' ');
    if (!validText) return 'en';
    const langCode = franc(validText, { minLength: 3 });
    const langMap = {
      'ara': 'ar', // Arabic
      'eng': 'en', // English
      'fra': 'fr', // French
      'spa': 'es', // Spanish
      'deu': 'de', // German

    };
    return langMap[langCode] || 'en';
  } catch (err) {
    console.error('Language detection failed:', err.message);
    return 'en';
  }
};

// Upload and normalize trade data
export const uploadTradeData = async (req, res) => {
  try {
    const file = req.file;
    const { userId, dataType } = req.body;

    // Get user language from Accept-Language header
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';

    if (!file) {
      const message = await translateText('No file uploaded', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }
    if (!userId) {
      const message = await translateText('User ID required', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }
    if (!dataType || !['production', 'stocks', 'offres'].includes(dataType)) {
      fs.unlinkSync(file.path);
      const message = await translateText('Invalid data type. Choose between production, stocks, or offers.', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    let results = [];
    let columns = [];

    if (file.mimetype === 'text/csv') {
      results = await new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(file.path)
          .pipe(parse({ columns: true, trim: true, encoding: 'utf8' }))
          .on('data', (row) => data.push(row))
          .on('end', () => resolve(data))
          .on('error', reject);
      });
      columns = results.length > 0 ? Object.keys(results[0]).map(col => String(col || '').trim()) : [];
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = XLSX.readFile(file.path, { codepage: 65001 });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rawData.length === 0) {
        fs.unlinkSync(file.path);
        const message = await translateText('XLSX file is empty', 'en', userLang);
        return res.status(400).json({ message: message[0] });
      }

      const headers = rawData[0];
      columns = headers.length === 1 && typeof headers[0] === 'string' && headers[0].includes(',')
        ? headers[0].split(',').map(header => header.trim())
        : headers.map(header => String(header || '').trim());

      const rawRows = rawData.slice(1);
      results = rawRows.map(row => {
        const rowValues = splitRowData(row);
        const rowData = {};
        columns.forEach((col, idx) => {
          rowData[col] = rowValues[idx] || '';
        });
        return rowData;
      });
    } else {
      fs.unlinkSync(file.path);
      const message = await translateText('Unsupported file type. Use CSV or XLSX.', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    // Validate columns
    if (columns.length === 0 || columns.every(col => col === '')) {
      fs.unlinkSync(file.path);
      const message = await translateText('No valid columns found in file', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    // Debug: Log raw columns
    console.log('Raw columns:', columns);

    // Detect language of column names
    const detectedLang = detectColumnLanguage(columns);

    // Store original columns for traceability
    const originalColumns = [...columns];

    // Normalize column names
    const normalizedColumns = await normalizeColumnNames(columns, detectedLang);
    const unrecognizedColumns = normalizedColumns.filter(col => !standardColumnsRef.includes(col));
    if (unrecognizedColumns.length > 0) {
      console.warn(`Unrecognized columns: ${unrecognizedColumns.join(', ')}`);
    }

    const finalColumns = normalizedColumns;
    const normalizedData = results.map(entry => {
      const normalizedEntry = {};
      columns.forEach((col, idx) => {
        const normCol = normalizedColumns[idx] || col;
        normalizedEntry[normCol] = ['price', 'quantity', 'year', 'surface', 'yield', 'production'].includes(normCol)
          ? Number(entry[col] || 0)
          : String(entry[col] || '');
      });
      return normalizedEntry;
    });

    const trade = new Trade({
      userId,
      filename: file.originalname,
      dataType,
      data: normalizedData,
      columns: finalColumns,
      originalColumns,
      rowCount: normalizedData.length,
      uploadedAt: new Date(),
      detectedLanguage: detectedLang
    });

    await trade.save();

    const errorMessage = unrecognizedColumns.length > 0
      ? await translateText(`Unrecognized columns: ${unrecognizedColumns.join(', ')}`, 'en', userLang)
      : undefined;

    await UploadLog.create({
      userId,
      fileId: trade._id,
      filename: file.originalname,
      dataType,
      status: 'success',
      detectedLanguage: detectedLang,
      errorMessage: errorMessage ? errorMessage[0] : undefined,
    });

    fs.unlinkSync(file.path);
    const successMessage = await translateText('File uploaded successfully', 'en', userLang);
    res.json({ message: successMessage[0], trade });
  } catch (error) {
    console.error('Upload error:', error.message);
    if (fs.existsSync(req.file?.path)) fs.unlinkSync(req.file.path);

    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const errorMessage = await translateText(`Server error during upload: ${error.message}`, 'en', userLang);

    await UploadLog.create({
      userId: req.body.userId || 'unknown',
      filename: req.file?.originalname || 'unknown',
      dataType: req.body.dataType || 'unknown',
      status: 'failed',
      errorMessage: error.message,
    });

    res.status(500).json({ message: errorMessage[0] });
  }
};

// Get list of uploaded files
export const getTradeFiles = async (req, res) => {
  try {
    const userId = req.params.userId;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const files = await Trade.find({ userId }).select('filename dataType rowCount columns originalColumns uploadedAt _id');
    if (!files || files.length === 0) {
      const message = await translateText('No files found for this user', 'en', userLang);
      return res.status(404).json({ message: message[0] });
    }
    res.json({ files });
  } catch (error) {
    console.error('Error retrieving files:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error retrieving files', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};

// Get data for a specific file
export const getTradeData = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      const message = await translateText('File not found', 'en', userLang);
      return res.status(404).json({ message: message[0] });
    }
    res.json({ data: trade.data, columns: trade.columns, originalColumns: trade.originalColumns });
  } catch (error) {
    console.error('Error retrieving data:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error retrieving data', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};

// Update a specific row in a file
export const updateTradeData = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const { rowIndex, updatedData } = req.body;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';

    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      const message = await translateText('File not found', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    if (rowIndex < 0 || rowIndex >= trade.data.length) {
      const message = await translateText('Invalid row index', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    const validKeys = trade.columns || [];
    for (const key of Object.keys(updatedData)) {
      if (!validKeys.includes(key)) {
        const message = await translateText(`Invalid key: ${key}`, 'en', userLang);
        return res.status(400).json({ message: message[0] });
      }
    }

    trade.data[rowIndex] = { ...trade.data[rowIndex], ...updatedData };
    await trade.save();

    const message = await translateText('Data updated successfully', 'en', userLang);
    res.json({ message: message[0], data: trade.data });
  } catch (error) {
    console.error('Error updating data:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error during update', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};

// Delete a specific file
export const deleteTradeFile = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const trade = await Trade.findOneAndDelete({ userId, _id: fileId });
    if (!trade) {
      const message = await translateText('File not found', 'en', userLang);
      return res.status(404).json({ message: message[0] });
    }

    await UploadLog.deleteMany({ fileId });
    const message = await translateText('File deleted successfully', 'en', userLang);
    res.json({ message: message[0] });
  } catch (error) {
    console.error('Error deleting file:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error during deletion', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};

// Add a new column
export const addTradeColumn = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const { columnName } = req.body;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';

    if (!columnName) {
      const message = await translateText('Column name required', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      const message = await translateText('File not found', 'en', userLang);
      return res.status(404).json({ message: message[0] });
    }

    if (!trade.columns) trade.columns = [];
    if (!trade.originalColumns) trade.originalColumns = [];

    if (trade.columns.includes(columnName)) {
      const message = await translateText('Column already exists', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    trade.columns.push(columnName);
    trade.originalColumns.push(columnName);
    trade.data = trade.data.map(row => ({ ...row, [columnName]: '' }));
    await trade.save();

    const message = await translateText('Column added successfully', 'en', userLang);
    res.json({ message: message[0], columns: trade.columns, data: trade.data });
  } catch (error) {
    console.error('Error adding column:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};

// Delete a column
export const deleteTradeColumn = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const { columnName } = req.body;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';

    if (!columnName) {
      const message = await translateText('Column name required', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      const message = await translateText('File not found', 'en', userLang);
      return res.status(404).json({ message: message[0] });
    }

    if (!trade.columns) trade.columns = [];
    if (!trade.originalColumns) trade.originalColumns = [];

    if (!trade.columns.includes(columnName)) {
      const message = await translateText('Column not found', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    trade.columns = trade.columns.filter(col => col !== columnName);
    trade.originalColumns = trade.originalColumns.filter(col => col !== columnName);
    trade.data = trade.data.map(row => {
      const { [columnName]: _, ...rest } = row;
      return rest;
    });
    await trade.save();

    const message = await translateText('Column deleted successfully', 'en', userLang);
    res.json({ message: message[0], columns: trade.columns, data: trade.data });
  } catch (error) {
    console.error('Error deleting column:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};

// Add a new row
export const addTradeRow = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';

    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      const message = await translateText('File not found', 'en', userLang);
      return res.status(404).json({ message: message[0] });
    }

    const newRow = (trade.columns || []).reduce((acc, col) => {
      acc[col] = ['price', 'quantity', 'year', 'surface', 'yield', 'production'].includes(col) ? 0 : '';
      return acc;
    }, {});

    trade.data.push(newRow);
    trade.rowCount = trade.data.length;
    await trade.save();

    const message = await translateText('Row added successfully', 'en', userLang);
    res.json({ message: message[0], data: trade.data });
  } catch (error) {
    console.error('Error adding row:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};

// Delete a row
export const deleteTradeRow = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const { rowIndex } = req.body;
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';

    const trade = await Trade.findOne({ userId, _id: fileId });
    if (!trade) {
      const message = await translateText('File not found', 'en', userLang);
      return res.status(404).json({ message: message[0] });
    }

    if (rowIndex < 0 || rowIndex >= trade.data.length) {
      const message = await translateText('Invalid row index', 'en', userLang);
      return res.status(400).json({ message: message[0] });
    }

    trade.data.splice(rowIndex, 1);
    trade.rowCount = trade.data.length;
    await trade.save();

    const message = await translateText('Row deleted successfully', 'en', userLang);
    res.json({ message: message[0], data: trade.data });
  } catch (error) {
    console.error('Error deleting row:', error.message);
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const message = await translateText('Server error', 'en', userLang);
    res.status(500).json({ message: message[0] });
  }
};
