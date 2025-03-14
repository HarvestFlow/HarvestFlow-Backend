import express from 'express';
import mongoose from 'mongoose';
import userRoute from './routes/user.js';  // Ensure the '.js' extension is used for imports
import parcelleRoute from './routes/parcelle.js';  // Ensure the '.js' extension is used for imports
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();
app.use(express.json()); // Middleware to parse JSON

// Define variables directly
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017/harvestflow';

// Middleware - CORS should be before routes
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from the front-end
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow these HTTP methods
  credentials: true, // If you need to send cookies with requests
}));

// Middleware - Parse cookies
app.use(cookieParser()); // Active la gestion des cookies

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Test route
app.get('/', (req, res) => {
  res.send('API Running...');
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Define routes
app.use('/user', userRoute);
app.use('/parcelle', parcelleRoute);

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
