import Notification from '../models/Notification.js';
import Parcelle from '../models/parcelle.js';
import mongoose from 'mongoose';

const DEFAULT_CONDITIONS = {
  highTemperatureCurrent: { maxTemp: 10, message: 'Température actuelle élevée détectée !' }, // Ajusté à 30°C
  lowTemperatureCurrent: { minTemp: 20, message: 'Température actuelle basse détectée !' },   // Ajusté à 10°C
  highTemperatureForecast: { maxTemp: 38, message: 'Prévision de température élevée détectée !' },
  lowTemperatureForecast: { minTemp: 0, message: 'Prévision de température basse détectée !' },
};

const checkAndTriggerNotification = async (io, userId, shapeId, parcelleId, currentTemp, forecastTemp) => {
  const notifications = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 heures avant

  // Valider que parcelleId est un ObjectId valide
  if (!mongoose.Types.ObjectId.isValid(parcelleId)) {
    console.error(`parcelleId invalide: ${parcelleId}`);
    return;
  }

  // Récupérer la parcelle
  const parcelle = await Parcelle.findById(parcelleId);
  if (!parcelle) {
    console.error(`Parcelle avec ID ${parcelleId} non trouvée`);
    return;
  }

  // Récupérer le shape spécifique et son commentaire
  const shape = parcelle.shapes.find(s => s._id.toString() === shapeId.toString());
  if (!shape) {
    console.error(`Shape avec ID ${shapeId} non trouvé dans la parcelle ${parcelleId}`);
    return;
  }

  // Prioriser le commentaire du shape, puis celui de la parcelle
  const comment = shape.properties?.comment || parcelle.comment || "Aucun commentaire";
  console.log(`Commentaire récupéré pour shape ${shapeId}: ${comment}`);

  // Helper function pour vérifier les notifications récentes
  const hasRecentNotification = async (condition) => {
    const recent = await Notification.findOne({
      userId,
      shapeId,
      condition,
      triggeredAt: { $gte: oneDayAgo },
    });
    return !!recent;
  };

  // Vérifier la température actuelle
  if (currentTemp.max >= DEFAULT_CONDITIONS.highTemperatureCurrent.maxTemp) {
    if (!(await hasRecentNotification('high_temperature_current'))) {
      notifications.push({
        userId,
        shapeId,
        parcelleId,
        message: `${DEFAULT_CONDITIONS.highTemperatureCurrent.message} Température max: ${currentTemp.max}°C. Commentaire: ${comment}`,
        condition: 'high_temperature_current',
        triggeredAt: new Date(),
      });
    }
  }
  if (currentTemp.min <= DEFAULT_CONDITIONS.lowTemperatureCurrent.minTemp) {
    if (!(await hasRecentNotification('low_temperature_current'))) {
      notifications.push({
        userId,
        shapeId,
        parcelleId,
        message: `${DEFAULT_CONDITIONS.lowTemperatureCurrent.message} Température min: ${currentTemp.min}°C. Commentaire: ${comment}`,
        condition: 'low_temperature_current',
        triggeredAt: new Date(),
      });
    }
  }

  // Vérifier la température prévue
  if (forecastTemp.max >= DEFAULT_CONDITIONS.highTemperatureForecast.maxTemp) {
    if (!(await hasRecentNotification('high_temperature_forecast'))) {
      notifications.push({
        userId,
        shapeId,
        parcelleId,
        message: `${DEFAULT_CONDITIONS.highTemperatureForecast.message} Température max prévue: ${forecastTemp.max}°C. Commentaire: ${comment}`,
        condition: 'high_temperature_forecast',
        triggeredAt: new Date(),
      });
    }
  }
  if (forecastTemp.min <= DEFAULT_CONDITIONS.lowTemperatureForecast.minTemp) {
    if (!(await hasRecentNotification('low_temperature_forecast'))) {
      notifications.push({
        userId,
        shapeId,
        parcelleId,
        message: `${DEFAULT_CONDITIONS.lowTemperatureForecast.message} Température min prévue: ${forecastTemp.min}°C. Commentaire: ${comment}`,
        condition: 'low_temperature_forecast',
        triggeredAt: new Date(),
      });
    }
  }

  // Enregistrer et émettre les notifications
  for (const notif of notifications) {
    const savedNotif = await Notification.create(notif);
    io.to(userId.toString()).emit('notification', savedNotif);
    console.log(`Notification émise: ${notif.message}`);
  }
};

export const handleDailyTemperature = async (req, res, io) => {
  try {
    const { userId, shapeId, parcelleId, currentTemperature, forecastTemperature } = req.body;

    if (!userId || !shapeId || !parcelleId || !currentTemperature || !forecastTemperature) {
      return res.status(400).json({ error: 'Données invalides' });
    }

    // Corriger l'appel avec les bons paramètres
    await checkAndTriggerNotification(io, userId, shapeId, parcelleId, currentTemperature, forecastTemperature);

    res.status(200).json({ message: 'Température vérifiée et notifications envoyées si nécessaire' });
  } catch (error) {
    console.error('Erreur dans handleDailyTemperature:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Fonctions existantes inchangées
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId est requis' });
    }

    const notifications = await Notification.find({ userId }).sort({ triggeredAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Erreur dans getUserNotifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error('Erreur dans markNotificationAsRead:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};