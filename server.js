import express from 'express';
import mongoose from 'mongoose';
import userRoute from './routes/user.js';
import parcelleRoute from './routes/parcelle.js';
import stockRoute from './routes/stock.js';
import wheatRoute from './routes/wheatRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js'; // Notification routes

import dailyreommendationRoutes from './routes/dailyrecommendation.js'
import http from 'http';
import { Server } from 'socket.io'; // Use Socket.IO instead of ws
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();
const server = http.createServer(app); // Create HTTP server for Socket.IO
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Match frontend origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Define variables directly
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017/harvestflow';

// Middleware - Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Middleware - CORS should be before routes
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from the frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // Enable cookies with requests
}));

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

// Serve static files (uploads)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define routes
app.use('/user', userRoute);
app.use('/parcelle', parcelleRoute);
app.use('/api/wheat', wheatRoute);
app.use('/stock', stockRoute);
app.use('/api/trade', tradeRoutes);
app.use('/api/notifications', notificationRoutes(io)); // Pass io to notification routes
app.use('/model', dailyreommendationRoutes);



// WebSocket setup with Socket.IO
io.on('connection', (socket) => {

  // Join a room based on userId
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté:', socket.id);
  });
});

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
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));