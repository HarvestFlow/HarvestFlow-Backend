import DailyObservation from "../models/dailyobservations.js";
import Parcelle from "../models/parcelle.js";

// Récupérer toutes les observations d'un shape
export const getObservationsByShape = async (req, res) => {
  try {
    const { parcelleId, shapeId } = req.params;
    const observations = await DailyObservation.find({ parcelleId, shapeId }).sort({ date: -1 });
    res.status(200).json(observations);
  } catch (error) {
    res.status(500).json({ message: "Error fetching observations", error });
  }
};

// Ajouter une nouvelle observation
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

    res.status(201).json(savedObservation);
  } catch (error) {
    res.status(500).json({ message: "Error creating observation", error });
  }
};

// Mettre à jour une observation existante
export const updateObservation = async (req, res) => {
  try {
    const { observationId } = req.params;
    const updatedData = req.body;

    const observation = await DailyObservation.findByIdAndUpdate(
      observationId,
      updatedData,
      { new: true }
    );
    if (!observation) return res.status(404).json({ message: "Observation not found" });

    res.status(200).json(observation);
  } catch (error) {
    res.status(500).json({ message: "Error updating observation", error });
  }
};