import express from 'express';
import axios from 'axios';
import { Trade } from '../models/Trade.js';
import User from '../models/user.js';
import { saveAIResponse, getAIResponsesByFile } from '../controllers/aiResponseController.js';

const router = express.Router();

export const analyzeTradeData = async (req, res) => {
  const { userId, fileId } = req.params;
  const { tradeData, messages } = req.body;

  try {
    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      console.error('Validation échouée: Utilisateur non trouvé', { userId });
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Validate file
    const tradeFile = await Trade.findOne({ _id: fileId, userId });
    if (!tradeFile) {
      console.error('Validation échouée: Fichier non trouvé', { fileId, userId });
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Validate tradeData
    if (!tradeData || !Array.isArray(tradeData)) {
      console.error('Validation échouée: Données de trading invalides', { tradeData });
      return res.status(400).json({ error: 'Données de trading invalides' });
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Validation échouée: Messages invalides', { messages });
      return res.status(400).json({ error: 'Messages invalides' });
    }

    // Configure Axios with maximized timeout
    const axiosInstance = axios.create({
      timeout: 1800000, // 30 minutes
      headers: {
        Authorization: 'Bearer QaocsC8cU8Rm3wbH4JLQWviFOrNWwW3P',
        'Content-Type': 'application/json',
      },
    });

    // Single API call
    console.log('Appel à l\'API AI', { userId, fileId });
    let iaResponse;
    try {
      iaResponse = await axiosInstance.post(
        'https://agent-c3e00297dd87c5c5860f-thwxf.ondigitalocean.app/api/v1/chat/completions',
        {
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }
      );
      console.log('Réponse API reçue', { status: iaResponse.status, data: iaResponse.data });
    } catch (error) {
      console.error('Échec de l\'API AI', {
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      throw new Error(`Échec de l'appel à l'API AI : ${error.message}`);
    }

    // Validate AI response
    if (!iaResponse.data.choices || !iaResponse.data.choices[0]?.message?.content) {
      console.error('Réponse API invalide', { response: iaResponse.data });
      throw new Error('Réponse de l\'API AI invalide : structure inattendue');
    }

    // Extract AI response
    const aiContent = iaResponse.data.choices[0].message.content;

    // Save AI response
    let savedResponse;
    try {
      savedResponse = await saveAIResponse(userId, fileId, aiContent);
    } catch (error) {
      console.error('Échec de l\'enregistrement de la réponse IA', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Échec de l'enregistrement de la réponse IA : ${error.message}`);
    }

    res.status(200).json(savedResponse);
  } catch (error) {
    console.error('Erreur lors de l\'analyse IA:', {
      message: error.message,
      stack: error.stack,
      userId,
      fileId,
      requestBody: { tradeData, messages },
    });
    res.status(500).json({
      error: 'Erreur lors de l\'analyse IA',
      details: error.response ? error.response.data : error.message,
      userId,
      fileId,
    });
  }
};

export const getAIResponses = async (req, res) => {
  const { userId, fileId } = req.params;

  try {
    const responses = await getAIResponsesByFile(userId, fileId);
    res.status(200).json(responses);
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses:', {
      message: error.message,
      stack: error.stack,
      userId,
      fileId,
    });
    res.status(500).json({
      error: 'Erreur lors de la récupération des réponses IA',
      details: error.message,
    });
  }
};

router.post('/:userId/:fileId/analyze', analyzeTradeData);
router.get('/:userId/:fileId/responses', getAIResponses);

export default router;