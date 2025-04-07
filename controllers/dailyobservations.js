// controllers/dailyObservationController.js
import DailyObservation from "../models/dailyobservations.js";
import Parcelle from "../models/parcelle.js";
import Recommendation from "../models/recommendation.js";
import { runModel } from "./dailyrecommendation.js";

export const createObservation = async (req, res) => {
  try {
    const { parcelleId, shapeId } = req.params;
    const observationData = req.body;

    const newObservation = new DailyObservation({
      parcelleId,
      shapeId,
      ...observationData,
    });

    const savedObservation = await newObservation.save();

    // Mettre à jour le shape dans la parcelle avec la nouvelle observation
    await Parcelle.updateOne(
      { _id: parcelleId, "shapes._id": shapeId },
      { $push: { "shapes.$.dailyObservations": savedObservation._id } }
    );

    // Répondre immédiatement avec l'observation créée
    res.status(201).json(savedObservation);

    // Déclencher la génération de la recommandation en arrière-plan
    generateAndSaveRecommendation(parcelleId, shapeId, savedObservation);
  } catch (error) {
    console.error("Erreur lors de la création de l'observation :", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

const generateAndSaveRecommendation = async (parcelleId, shapeId, observation) => {
  try {
    const userContent =
      JSON.stringify({
        weather: observation.weather,
        soil: observation.soil,
        cropHealth: observation.cropHealth,
      }) +
      " Act as a wheat harvest expert. Respond in 200 tokens max: 'Soil pH [value]: [action]. Soil moisture [value]: [action]. Weeds [status]: [action]. Pests [status]: [action]. Weather [key factor]: [action]. Focus on germination, concise, actionable steps.' Ensure clear, structured guidance.";

    const recommendationResponse = await runModel(userContent);
    const recommendationText = recommendationResponse.message;

    const newRecommendation = new Recommendation({
      parcelleId,
      shapeId,
      observationId: observation._id,
      recommendation: recommendationText,
    });

    await newRecommendation.save();
  } catch (error) {
    console.error("Erreur lors de la génération de la recommandation :", error);
  }
};

export const getObservationsByShape = async (req, res) => {
  try {
    const { parcelleId, shapeId } = req.params;
    const observations = await DailyObservation.find({ parcelleId, shapeId }).sort({ date: -1 });
    res.status(200).json(observations);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des observations", error });
  }
};

export const updateObservation = async (req, res) => {
  try {
    const { observationId } = req.params;
    const updatedData = req.body;

    const observation = await DailyObservation.findByIdAndUpdate(observationId, updatedData, {
      new: true,
    });
    if (!observation) return res.status(404).json({ message: "Observation non trouvée" });

    res.status(200).json(observation);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'observation", error });
  }
};