import asyncHandler from 'express-async-handler';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

// Validation de l'userId
const validateUserId = (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('userId invalide');
  }
};

// Ajouter une nouvelle transaction
export const addTransaction = asyncHandler(async (req, res) => {
  const { date, description, account, type, amount, currency, reference, userId, carrierId } = req.body;

  // Validation des champs
  if (!description || !account || !type || !amount || !reference || !userId) {
    res.status(400);
    throw new Error('Veuillez remplir tous les champs obligatoires, y compris userId');
  }

  validateUserId(userId);

  // Vérifier que carrierId est valide si fourni
  if (carrierId && !mongoose.Types.ObjectId.isValid(carrierId)) {
    res.status(400);
    throw new Error('carrierId invalide');
  }

  // Créer la transaction
  const transaction = await Transaction.create({
    date: date || Date.now(),
    description,
    account,
    type,
    amount,
    currency: currency || 'EUR',
    reference,
    userId,
    carrierId: carrierId || undefined,
  });

  res.status(201).json(transaction);
});

// Récupérer le journal général
export const getJournal = asyncHandler(async (req, res) => {
  const { userId, startDate, endDate, account } = req.query;
  let query = { userId };

  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (account) {
    query.account = account;
  }

  const transactions = await Transaction.find(query).sort({ date: -1 }).populate('carrierId');
  const totalCredits = transactions
    .filter((t) => t.type === 'Recette')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter((t) => t.type === 'Dépense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalCredits - totalDebits;

  res.json({
    transactions,
    summary: { totalCredits, totalDebits, balance },
  });
});

// Supprimer une transaction
export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction non trouvée');
  }

  await transaction.deleteOne();
  res.json({ message: 'Transaction supprimée' });
});

// Obtenir les analyses financières
export const getFinancialAnalytics = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  // Agrégation pour l'évolution des revenus et bénéfices sur 6 mois
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyData = await Transaction.aggregate([
    { $match: { userId, date: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { $month: '$date' },
        totalCredits: { $sum: { $cond: [{ $eq: ['$type', 'Recette'] }, '$amount', 0] } },
        totalDebits: { $sum: { $cond: [{ $eq: ['$type', 'Dépense'] }, '$amount', 0] } },
      },
    },
    { $sort: { '_id': 1 } },
  ]);

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
  const revenueData = Array(6).fill(0);
  const profitData = Array(6).fill(0);
  monthlyData.forEach((data) => {
    const monthIndex = data._id - 1; // Mois de 1 à 12
    if (monthIndex >= 6) return; // Limiter aux 6 derniers mois
    revenueData[monthIndex] = data.totalCredits;
    profitData[monthIndex] = data.totalCredits - data.totalDebits;
  });

  // Agrégation pour la répartition des dépenses
  const expenseData = await Transaction.aggregate([
    { $match: { userId, type: 'Dépense' } },
    {
      $group: {
        _id: '$account',
        total: { $sum: '$amount' },
      },
    },
  ]);

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.total, 0);
  const expenseDistribution = expenseData.map((item) => ({
    account: item._id,
    percentage: ((item.total / totalExpenses) * 100).toFixed(2),
  }));

  res.json({
    revenueEvolution: {
      labels: months,
      revenues: revenueData,
      profits: profitData,
    },
    expenseDistribution,
  });
});

