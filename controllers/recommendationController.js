// controllers/recommendationController.js
import Recommendation from "../models/recommendation.js";

export const getRecommendationsByShape = async (req, res) => {
  try {
    const { parcelleId, shapeId } = req.params;
    const recommendations = await Recommendation.find({ parcelleId, shapeId })
      .populate("observationId", "date")
      .sort({ createdAt: -1 });
    res.status(200).json(recommendations);
  } catch (error) {
    console.error("Erreur lors de la récupération des recommandations :", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};