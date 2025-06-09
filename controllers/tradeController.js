import fs from 'fs';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import { Trade, UploadLog } from '../models/Trade.js';
import { spawn } from 'child_process';
import { franc } from 'franc';

// Expanded dictionary for column reference (financial terms included)
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
    'total_price', 'total_cost', 'price', 'prix', 'cost', 'coût', 'value', 'valeur',
    'montant_total', 'total_amount', 'montantTTC', 'montant_ttc', 'ttc', 'total_incl_tax',
    'سعر', 'السعر', 'تكلفة', 'إجمالي_السعر',
    'precio', 'costo', 'precio_total', 'costo_total', 'importe_con_impuestos', 'monto_total'
  ],
  net_amount: [
    'net_amount', 'montantHT', 'montant_ht', 'amount_excl_tax', 'ht', 'base_amount',
    'montant_hors_taxes', 'montant_hors_taxe',
    'importe_sin_impuestos', 'monto_sin_impuestos'
  ],
  vat_amount: [
    'vat_amount', 'montantTVA', 'montant_tva', 'tax_amount', 'tva', 'vat',
    'montant_de_la_tva', 'taxe_sur_la_valeur_ajoutée',
    'importe_iva', 'monto_iva'
  ],
  year: [
    'year', 'année', 'yr', 'annee', 'y', 'season', 'harvest_year',
    'سنة', 'السنة', 'عام',
    'año', 'ano'
  ],
  surface: [
    'surface', 'superficie', 'superficie_récoltée_(ha)', 'acreage', 'hectares', 'ha', 'land_area', 'surface_area', 'superfice',
    'مساحة', 'السطح', 'هكتار',
    'superficie', 'hectáreas', 'area'
  ],
  yield: [
    'yield', 'rendement', 'productivity', 'rendement_(kg/ha)', 'output_per_ha', 'yield_per_ha', 'productivity_rate', 'rendement_kg_ha',
    'إنتاجية', 'المحصول', 'الغلة',
    'rendimiento', 'productividad'
  ],
  production: [
    'production', 'output', 'production_(t)', 'total_production', 'harvest', 'total_output', 'prod', 'tonnage', 'tons', 'tonnes',
    'إنتاج', 'الإنتاج', 'محصول',
    'producción', 'cosecha', 'produccion'
  ],
  crop: [
    'crop', 'culture', 'produce', 'commodity', 'item', 'product', 'grain', 'commodities', 'crops', 'cultivar', 'variety', 'cosecha', 'produit',
    'محصول', 'زراعة', 'منتج', 'اسم_المنتج',
    'cultivo', 'producto', 'nombre_del_producto'
  ],
  date: [
    'date', 'day', 'jour', 'harvestdate', 'harvest_date', 'datetime', 'harvest_day', 'date_harvest', 'time', 'dateFacture', 'date_facture',
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
    'transaction_id', 'transaction_number', 'deal_id', 'order_id', 'numeroFacture', 'numerofacture',
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
  ],
  supplier: [
    'supplier', 'fournisseur', 'vendor', 'provider', 'seller',
    'مزود', 'مورد',
    'proveedor', 'vendedor'
  ]
};

// Flatten synonyms to reference terms for NLP (ensure unique mappings)
const referenceTerms = {};
for (const [standard, synonyms] of Object.entries(columnSynonyms)) {
  synonyms.forEach(syn => {
    const lowerSyn = syn.toLowerCase();
    if (referenceTerms[lowerSyn] && referenceTerms[lowerSyn] !== standard) {
      console.warn(`Duplicate synonym "${lowerSyn}" mapped to "${referenceTerms[lowerSyn]}" and "${standard}". Keeping "${referenceTerms[lowerSyn]}".`);
    } else {
      referenceTerms[lowerSyn] = standard;
    }
  });
}

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

// Validate columns based on data type (relaxed to allow unrecognized columns)
const validateColumnsForDataType = (normalizedColumns, dataType) => {
  const expectedColumns = {
    offres: ['quantity', 'unit_price', 'total_price', 'net_amount', 'vat_amount', 'crop', 'buyer', 'transaction_id'],
    production: ['crop', 'quantity', 'surface', 'yield', 'production'],
    stocks: ['crop', 'quantity', 'location']
  };
  const required = expectedColumns[dataType] || [];
  const missing = required.filter(col => !normalizedColumns.includes(col));
  // Allow unrecognized columns and only flag incompatible columns (e.g., agricultural in offres)
  const unexpected = normalizedColumns.filter(col => {
    if (dataType === 'production') {
      return ['net_amount', 'vat_amount', 'total_price'].includes(col);
    }
    if (dataType === 'offres') {
      return ['yield', 'surface', 'production'].includes(col);
    }
    if (dataType === 'stocks') {
      return ['net_amount', 'vat_amount', 'total_price', 'yield', 'surface', 'production'].includes(col);
    }
    return false; // Allow unrecognized columns
  });
  return { missing, unexpected };
};

// Suggest data type based on columns
const suggestDataType = (columns) => {
  const financialColumns = ['net_amount', 'vat_amount', 'total_price', 'montantHT', 'montantTVA', 'montantTTC', 'unit_price', 'transaction_id', 'buyer'];
  const productionColumns = ['surface', 'yield', 'production'];
  const stockColumns = ['location'];
  
  const hasFinancial = columns.some(col => financialColumns.includes(col.toLowerCase()));
  const hasProduction = columns.some(col => productionColumns.includes(col.toLowerCase()));
  const hasStock = columns.some(col => stockColumns.includes(col.toLowerCase()));

  if (hasFinancial && !hasProduction && !hasStock) return 'offres';
  if (hasProduction) return 'production';
  if (hasStock) return 'stocks';
  return 'offres'; // Default to offres for mixed or ambiguous cases
};

// Normalize column names using direct matching or Sentence-BERT
const normalizeColumnNames = async (columnNames, detectedLang, dataType, sampleData) => {
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
  console.log('Columns before normalization:', validColumns, 'Data type:', dataType);

  // Enhanced direct matching with exact and partial matching
  const normalizedCols = validColumns.map((col, idx) => {
    const lowerCol = col.toLowerCase();
    if (referenceTerms[lowerCol]) {
      console.log(`Direct match: "${col}" -> "${referenceTerms[lowerCol]}"`);
      return referenceTerms[lowerCol];
    }
    // Partial matching
    for (const [synonym, standard] of Object.entries(referenceTerms)) {
      if (lowerCol.includes(synonym)) {
        console.log(`Partial match: "${col}" -> "${standard}"`);
        return standard;
      }
    }
    // Heuristic for financial columns in 'offres' only for columns with partial synonym match
    if (dataType === 'offres' && sampleData[idx]) {
      const sample = String(sampleData[idx]).trim();
      if (/^\d+(\.\d{1,2})?$/.test(sample)) {
        const financialSynonyms = [
          ...columnSynonyms.net_amount,
          ...columnSynonyms.vat_amount,
          ...columnSynonyms.total_price
        ].map(s => s.toLowerCase());
        if (financialSynonyms.some(syn => lowerCol.includes(syn))) {
          if (lowerCol.includes('ht') || lowerCol.includes('hors_taxe')) {
            console.log(`Heuristic match: "${col}" -> "net_amount" (financial data)`);
            return 'net_amount';
          }
          if (lowerCol.includes('tva') || lowerCol.includes('tax')) {
            console.log(`Heuristic match: "${col}" -> "vat_amount" (financial data)`);
            return 'vat_amount';
          }
          if (lowerCol.includes('ttc') || lowerCol.includes('total')) {
            console.log(`Heuristic match: "${col}" -> "total_price" (financial data)`);
            return 'total_price';
          }
        }
      }
    }
    // Keep unmatched columns as-is
    console.log(`No match for "${col}", retaining as-is`);
    return col;
  });

  // Skip Sentence-BERT if all columns are matched or intentionally retained as-is
  const unmatchedColumns = normalizedCols.filter((col, idx) => col === validColumns[idx] && !referenceTerms[col.toLowerCase()]);
  if (unmatchedColumns.length === 0) {
    console.log('All columns matched or retained as-is, skipping Sentence-BERT:', normalizedCols);
    return normalizedCols;
  }

  // Try translation and similarity-based normalization for unmatched columns
  let translatedColumns;
  try {
    translatedColumns = await translateText(unmatchedColumns, detectedLang, 'en');
    console.log('Translated unmatched columns:', translatedColumns);
  } catch (err) {
    console.error(`Translation failed: ${err.message}`);
    return normalizedCols; // Return current normalized columns if translation fails
  }

  const lowerCols = translatedColumns.map(col => String(col || '').toLowerCase().trim());
  const inputData = { column_names: lowerCols, reference_terms: referenceTerms, data_type: dataType };

  const pythonProcess = spawn('python', ['./compute_similarity.py']);
  // Set timeout for Python process (10 seconds)
  const timeout = setTimeout(() => {
    pythonProcess.kill();
    console.error('Python script timed out after 10 seconds');
    console.log(`Python script error: Input columns: ${JSON.stringify(inputData.column_names)}, Data type: ${dataType}`);
  }, 10000);

  return new Promise((resolve, reject) => {
    pythonProcess.stdin.write(JSON.stringify(inputData, null, 2), 'utf8');
    pythonProcess.stdin.end();

    let output = '';
    let errorOutput = '';
    pythonProcess.stdout.on('data', (data) => (output += data.toString('utf8')));
    pythonProcess.stderr.on('data', (data) => (errorOutput += data.toString('utf8')));

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout); // Clear timeout on completion
      if (code !== 0) {
        console.error(`Python script error: ${errorOutput || 'No error output, likely timed out'}`);
        return resolve(normalizedCols); // Return current normalized columns if Python fails
      }
      try {
        const results = JSON.parse(output);
        const bertNormalizedCols = results.map(result => {
          console.log(`Column "${result.column}" -> "${result.standard}" (score: ${result.score})`);
          if (result.score < 0.85) {
            console.warn(`Low confidence for "${result.column}", keeping original name`);
            return result.column;
          }
          return result.standard;
        });
        // Merge Sentence-BERT results with normalizedCols, only updating unmatched columns
        let bertIndex = 0;
        const finalCols = normalizedCols.map((col, idx) => {
          if (col === validColumns[idx] && !referenceTerms[col.toLowerCase()]) {
            return bertNormalizedCols[bertIndex++] || col;
          }
          return col;
        });
        console.log('Final normalized columns:', finalCols);
        resolve(finalCols);
      } catch (err) {
        console.error(`Failed to parse Python output: ${output}, Error: ${err.message}`);
        resolve(normalizedCols); // Return current normalized columns if parsing fails
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
      'deu': 'de' // German
    };
    return langMap[langCode] || 'en';
  } catch (err) {
    console.error('Language detection failed:', err.message);
    return 'en';
  }
};

// Log unrecognized columns for future synonym expansion
const logUnrecognizedColumns = async (unrecognizedColumns, detectedLang, dataType, userId, sampleData) => {
  if (unrecognizedColumns.length === 0) return;
  console.log(`Logging unrecognized columns for review: ${unrecognizedColumns.join(', ')}`);
  const logEntries = unrecognizedColumns.map(col => {
    const colIndex = unrecognizedColumns.indexOf(col);
    const sample = sampleData[colIndex] || 'N/A';
    let dataTypeHint = 'string';
    if (/^\d+(\.\d{1,2})?$/.test(sample)) {
      dataTypeHint = 'number';
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) {
      dataTypeHint = 'date';
    }
    return {
      column: col,
      sampleData: sample,
      dataTypeHint,
      suggestedStandard: dataType === 'offres' && dataTypeHint === 'number' ? 'net_amount' : 'unknown'
    };
  });
  try {
    await UploadLog.create({
      userId,
      filename: 'synonym_suggestion',
      dataType,
      status: 'success',
      detectedLanguage: detectedLang,
      errorMessage: `Unrecognized columns: ${JSON.stringify(logEntries)}`
    });
  } catch (err) {
    console.error(`Failed to log unrecognized columns: ${err.message}`);
    // Continue upload even if logging fails
  }
};

// Upload and normalize trade data
export const uploadTradeData = async (req, res) => {
  try {
    const file = req.file;
    let { userId, dataType } = req.body;

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
      console.warn(`Invalid data type provided: "${dataType}". Will determine automatically.`);
      dataType = null; // Trigger auto-detection
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

    // Extract sample data for heuristic matching
    const sampleData = results.length > 0 ? columns.map(col => String(results[0][col] || '')) : [];

    // Detect language of column names
    const detectedLang = detectColumnLanguage(columns);

    // Suggest data type and override if mismatch
    const suggestedDataType = suggestDataType(columns);
    let warnings = [];
    if (dataType && dataType !== suggestedDataType) {
      console.warn(`Data type mismatch: Provided "${dataType}", Overriding with "${suggestedDataType}" based on columns: ${columns.join(', ')}`);
      warnings.push(`Data type "${dataType}" was overridden to "${suggestedDataType}" based on columns (e.g., ${columns.join(', ')}).`);
      dataType = suggestedDataType;
    } else if (!dataType) {
      console.log(`No data type provided, using suggested type: "${suggestedDataType}"`);
      dataType = suggestedDataType;
    }

    // Store original columns for traceability
    const originalColumns = [...columns];

    // Normalize column names
    const normalizedColumns = await normalizeColumnNames(columns, detectedLang, dataType, sampleData);

    // Validate normalized columns (relaxed validation)
    const { missing, unexpected } = validateColumnsForDataType(normalizedColumns, dataType);
    if (unexpected.length > 0) {
      fs.unlinkSync(file.path);
      const message = await translateText(
        `Invalid columns for data type "${dataType}": ${unexpected.join(', ')}. These columns are not allowed.`,
        'en', userLang
      );
      return res.status(400).json({ message: message[0] });
    }
    if (missing.length > 0) {
      console.warn(`Missing required columns for "${dataType}": ${missing.join(', ')}. Proceeding with available columns.`);
      warnings.push(`Missing required columns: ${missing.join(', ')}. Data was processed with available columns.`);
    }

    // Log unrecognized columns before saving Trade (fileId will be null)
    const unrecognizedColumns = normalizedColumns.filter(col => !standardColumnsRef.includes(col));
    if (unrecognizedColumns.length > 0) {
      await logUnrecognizedColumns(unrecognizedColumns, detectedLang, dataType, userId, sampleData);
      warnings.push(`Some columns were not recognized and kept as-is: ${unrecognizedColumns.join(', ')}. These have been logged for review.`);
    }

    const finalColumns = normalizedColumns;
    const normalizedData = results.map(entry => {
      const normalizedEntry = {};
      columns.forEach((col, idx) => {
        const normCol = normalizedColumns[idx] || col;
        normalizedEntry[normCol] = ['unit_price', 'total_price', 'net_amount', 'vat_amount', 'quantity', 'year', 'surface', 'yield', 'production'].includes(normCol)
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

    // Combine warnings into errorMessage for UploadLog
    const errorMessage = warnings.length > 0
      ? await translateText(warnings.join(' '), 'en', userLang)
      : undefined;

    await UploadLog.create({
      userId,
      fileId: trade._id,
      filename: file.originalname,
      dataType,
      status: 'success',
      detectedLanguage: detectedLang,
      errorMessage: errorMessage ? errorMessage[0] : undefined
    });

    fs.unlinkSync(file.path);
    const successMessage = await translateText(
      `File uploaded successfully. ${warnings.length > 0 ? warnings.join(' ') : ''}`,
      'en', userLang
    );
    res.json({ message: successMessage[0], trade, warnings });
  } catch (error) {
    console.error('Upload error:', error.message, error.stack);
    if (fs.existsSync(req.file?.path)) fs.unlinkSync(req.file.path);

    const userLang = req.headers['accept-language']?.split(',')[0] || 'en';
    const errorMessage = await translateText(`Server error during upload: ${error.message}`, 'en', userLang);

    // Only create UploadLog if userId is available
    if (req.body.userId) {
      await UploadLog.create({
        userId: req.body.userId,
        filename: req.file?.originalname || 'unknown',
        dataType: req.body.dataType || 'unknown',
        status: 'failed',
        detectedLanguage: 'unknown',
        errorMessage: error.message
      });
    }

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
      acc[col] = ['unit_price', 'total_price', 'net_amount', 'vat_amount', 'quantity', 'year', 'surface', 'yield', 'production'].includes(col) ? 0 : '';
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
      return res.status(400).json({ message: message[0] });
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