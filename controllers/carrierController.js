import asyncHandler from 'express-async-handler';
import Carrier from '../models/Carrier.js';
import mongoose from 'mongoose';

// Validation de l'userId
const validateUserId = (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('userId invalide');
  }
};

// Obtenir tous les transporteurs
export const getCarriers = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  validateUserId(userId);
  const carriers = await Carrier.find({ userId });
  res.json(carriers);
});

// Ajouter un transporteur
export const createCarrier = asyncHandler(async (req, res) => {
  const { userId, name, contact, address, companyName, vehicleType, capacity } = req.body;
  validateUserId(userId);

  const carrier = new Carrier({
    userId,
    name,
    contact,
    address,
    companyName,
    vehicleType,
    capacity,
  });

  await carrier.save();
  res.status(201).json(carrier);
});

// Mettre à jour un transporteur
export const updateCarrier = asyncHandler(async (req, res) => {
  const { userId, ...updateData } = req.body;
  validateUserId(userId);

  const carrier = await Carrier.findOneAndUpdate(
    { _id: req.params.id, userId },
    updateData,
    { new: true }
  );

  if (!carrier) {
    res.status(404);
    throw new Error('Transporteur non trouvé');
  }

  res.json(carrier);
});

// Supprimer un transporteur
export const deleteCarrier = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  validateUserId(userId);

  const carrier = await Carrier.findOneAndDelete({ _id: req.params.id, userId });

  if (!carrier) {
    res.status(404);
    throw new Error('Transporteur non trouvé');
  }

  res.json({ message: 'Transporteur supprimé' });
});