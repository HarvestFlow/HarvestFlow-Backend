import express from 'express';
import mongoose from 'mongoose';
import userRoute from './routes/user.js';  // Ensure the '.js' extension is used for imports

const app = express();
app.use(express.json()); // Middleware to parse JSON

// Define variables directly
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017/harvestflow';

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

app.use('/user', userRoute);

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
