import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the CSV file in the root directory
const csvFilePath = path.join(__dirname, '..', '..', 'HARVESTFLOW-BACKEND', 'alibaba_wheat_no_login.csv');

// @desc    Get paginated Alibaba wheat offers from CSV
// @route   GET /farmerform/getAlibabaWheatOffers?page=<page>&limit=<limit>
// @access  Public
export const getAlibabaWheatOffers = async (req, res) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offers = [];

    // Read and parse the CSV file
    fs.createReadStream(csvFilePath)
      .pipe(
        parse({
          columns: true, // Treat first row as headers
          trim: true, // Trim whitespace
          skip_empty_lines: true, // Skip empty lines
        })
      )
      .on('data', (row) => {
        // Normalize row data
        offers.push({
          Title: row.Title || 'N/A',
          Price: row.Price || 'N/A',
          Supplier: row.Supplier || 'N/A',
          'Supplier Info (Years & Location)': row['Supplier Info (Years & Location)'] || 'N/A',
          'Contact Name': row['Contact Name'] || 'N/A',
          Email: row.Email || 'N/A',
          Phone: row.Phone || 'N/A',
          'Image URL': row['Image URL'] || 'N/A',
        });
      })
      .on('end', () => {
        // Pagination logic
        const totalOffers = offers.length;
        const totalPages = Math.ceil(totalOffers / limit);
        const startIndex = (page - 1) * limit;
        const paginatedOffers = offers.slice(startIndex, startIndex + limit);

        // Validate page
        if (page < 1 || page > totalPages) {
          return res.status(400).json({ error: 'Invalid page number' });
        }

        // Send paginated response
        res.status(200).json({
          offers: paginatedOffers,
          totalOffers,
          totalPages,
          currentPage: page,
        });
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        res.status(500).json({ error: 'Failed to parse CSV file.' });
      });
  } catch (error) {
    console.error('Error fetching Alibaba wheat offers:', error);
    res.status(500).json({ error: 'Server error while fetching offers.' });
  }
};