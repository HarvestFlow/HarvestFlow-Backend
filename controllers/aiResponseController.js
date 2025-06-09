import { AIResponseModel } from '../models/AIResponse.js';
import { Trade } from '../models/Trade.js';
import User from '../models/user.js';

export const saveAIResponse = async (userId, fileId, response) => {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('Utilisateur non trouvé');
  
      const tradeFile = await Trade.findOne({ _id: fileId, userId });
      if (!tradeFile) throw new Error('Fichier non trouvé');
  
      // Basic validation of response format
      try {
        // Check if response contains expected JSON blocks
        const jsonSections = ['roiByProduct', 'roiByCountry', 'unitPricesByMonth', 'shortTermPredictions', 'longTermPredictions', 'scenarios', 'recommendations', 'visualizations', 'innovations'];
        let isValid = true;
        for (const section of jsonSections) {
          const regex = /```json\n({[^`]+})\n```/g;
          const match = response.match(regex);
          if (match) {
            match.forEach(jsonBlock => {
              try {
                const jsonString = jsonBlock.replace('```json\n', '').replace('\n```', '');
                JSON.parse(jsonString);
              } catch (e) {
                isValid = false;
                console.error(`Invalid JSON in section ${section}: ${e.message}`);
              }
            });
          }
        }
        if (!isValid) throw new Error('Réponse IA contient des JSON invalides');
      } catch (error) {
        throw new Error(`Validation de la réponse IA échouée : ${error.message}`);
      }
  
      const aiResponse = new AIResponseModel({
        userId,
        fileId,
        response,
      });
      await aiResponse.save();
  
      return aiResponse;
    } catch (error) {
      throw new Error(`Erreur lors de l'enregistrement de la réponse IA : ${error.message}`);
    }
  };

export const getAIResponsesByFile = async (userId, fileId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const tradeFile = await Trade.findOne({ _id: fileId, userId });
    if (!tradeFile) {
      throw new Error('Fichier non trouvé');
    }

    const responses = await AIResponseModel.find({ userId, fileId })
      .sort({ createdAt: -1 })
      .lean();

    return responses;
  } catch (error) {
    throw new Error(`Erreur lors de la récupération des réponses IA : ${error.message}`);
  }
};