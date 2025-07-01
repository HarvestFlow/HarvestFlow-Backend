import mongoose from 'mongoose';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';

// Validation de l'userId
const validateUserId = (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('userId invalide');
  }
};

// Obtenir tous les produits
export const getProducts = async (req, res) => {
  try {
    const { userId } = req.query;
    validateUserId(userId);
    const products = await Product.find({ userId }).populate('supplierId');
    res.json(products);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Ajouter un produit
export const createProduct = async (req, res) => {
  try {
    const { userId, ...productData } = req.body;
    validateUserId(userId);
    const product = new Product({ ...productData, userId });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de l’ajout du produit' });
  }
};

// Mettre à jour un produit
export const updateProduct = async (req, res) => {
  try {
    const { userId, ...updateData } = req.body;
    validateUserId(userId);
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId },
      updateData,
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un produit
export const deleteProduct = async (req, res) => {
  try {
    const { userId } = req.body;
    validateUserId(userId);
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId });
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtenir les mouvements de stock
export const getMovements = async (req, res) => {
  try {
    const { userId } = req.query;
    validateUserId(userId);
    const movements = await StockMovement.find({ userId }).populate('productId');
    res.json(movements);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Ajouter un mouvement de stock
export const createMovement = async (req, res) => {
  try {
    const { userId, productId, type, quantity, ...movementData } = req.body;
    validateUserId(userId);
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    if (type === 'Sortie' || type === 'Transfert') {
      if (product.quantity < quantity) {
        return res.status(400).json({ message: 'Stock insuffisant' });
      }
      product.quantity -= quantity;
    } else if (type === 'Entrée') {
      product.quantity += quantity;
    }
    await product.save();

    const movement = new StockMovement({ userId, productId, type, quantity, ...movementData });
    await movement.save();
    res.status(201).json(movement);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de l’enregistrement du mouvement' });
  }
};

// Obtenir les alertes de stock
export const getAlerts = async (req, res) => {
  try {
    const { userId } = req.query;
    validateUserId(userId);
    const products = await Product.find({
      userId,
      $or: [
        { quantity: { $lte: 10 } }, // Seuil minimum
        { expirationDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }, // Expire dans 30 jours
      ],
    });
    res.json(products);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Ajouter un fournisseur
