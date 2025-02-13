const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json()); // Middleware pour parser le JSON

// Définir les variables directement
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017/harvestflow';

// Connexion à MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Route de test
app.get('/', (req, res) => {
  res.send('API Running...');
});

// Démarrer le serveur
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
