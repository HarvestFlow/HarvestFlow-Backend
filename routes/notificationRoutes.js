import express from 'express';
import { handleDailyTemperature } from '../controllers/notificationController.js';

const router = express.Router();

export default (io) => {
  // Route to receive daily temperature data
  router.post('/daily-temperature', (req, res) => handleDailyTemperature(req, res, io));

  return router;
};