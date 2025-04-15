import { MongoClient, GridFSBucket } from 'mongodb';
import { PythonShell } from 'python-shell';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Déduire __dirname dans un environnement ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connexion à MongoDB
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'harvestflow';

// Fonction pour uploader le fichier dans GridFS
async function uploadToGridFS() {
    const client = new MongoClient(mongoUrl);
    try {
        await client.connect();
        const db = client.db(dbName);
        const gridFSBucket = new GridFSBucket(db, { bucketName: 'wheat_files' });

        const filePath = 'C:/Users/DHIA/Desktop/PFE HARVEST8FLOW/HARVESTFLOW-BACKEND/wheat_data.csv';
        const fileStream = fs.createReadStream(filePath);

        const uploadStream = gridFSBucket.openUploadStream('wheat_data.csv');
        fileStream.pipe(uploadStream);

        const result = await new Promise((resolve, reject) => {
            uploadStream.on('finish', () => resolve('Upload terminé'));
            uploadStream.on('error', (err) => reject(err));
        });

        return result;
    } catch (err) {
        throw err;
    } finally {
        await client.close();
    }
}

// Route pour uploader le fichier
export const uploadWheatData = async (req, res) => {
    try {
        const result = await uploadToGridFS();
        res.status(200).json({ message: result });
    } catch (err) {
        console.error('Erreur lors de l\'upload dans GridFS:', err);
        res.status(500).json({ error: 'Erreur lors de l\'upload dans GridFS', details: err.message });
    }
};

// Route pour prédire le rendement du blé (sans rainfall)
export const predictWheatYield = async (req, res) => {
    const { pesticides, temp, country } = req.body;

    // Validation des champs (sans rainfall)
    if (!pesticides || !temp || !country) {
        return res.status(400).json({ error: 'Tous les champs (pesticides, temp, country) sont requis.' });
    }

    let options = {
        mode: 'text',
        pythonOptions: ['-u'],
        scriptPath: './models',
        args: [pesticides, temp, country] // Suppression de rainfall
    };

    try {
        const results = await PythonShell.run('wheatModel.py', options);
        const data = JSON.parse(results[0]);
        res.status(200).json(data);
    } catch (err) {
        console.error('Erreur PythonShell:', err);
        res.status(500).json({ error: 'Erreur lors de la prédiction', details: err.message });
    }
};

// Route pour obtenir les statistiques par pays (inchangée)
export const getCountryStats = async (req, res) => {
    const countryName = req.params.countryName;

    let options = {
        mode: 'text',
        pythonPath: 'python',
        pythonOptions: ['-u'],
        scriptPath: './models',
        args: [countryName],
        timeout: 30000,
    };

    try {
        console.log('Exécution de PythonShell avec options:', options);
        const results = await PythonShell.run('wheatStats.py', options);
        console.log('Résultats Python:', results);
        const result = JSON.parse(results[0]);
        if (result.error) {
            return res.status(404).json({ message: result.error });
        }
        res.json(result);
    } catch (err) {
        console.error('Erreur PythonShell:', err);
        res.status(500).json({ message: 'Erreur lors de l\'exécution du script Python', error: err.message });
    }
};