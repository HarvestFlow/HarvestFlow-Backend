import Stock from "../models/Stock.js";
import InputUsage from "../models/InputUsage.js";

// Récupérer les récoltes
export const getHarvests = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const harvests = await Stock.find({
      userId,
      category: "harvest",
    });
    res.json(harvests);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des récoltes", error: err.message });
  }
};

// Récupérer les intrants (pesticides, engrais, semences)
export const getInputs = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const inputs = await Stock.find({
      userId,
      category: "input",
    });
    res.json(inputs);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des intrants", error: err.message });
  }
};

// Ajouter un nouvel item au stock
export const createStockItem = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { category, type, name, quantity, unit } = req.body;

    if (!category || !type || !name || quantity === undefined || !unit) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    const newItem = new Stock({
      userId,
      category,
      type,
      name,
      quantity,
      unit,
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de l'ajout", error: err.message });
  }
};

// Mettre à jour la quantité d'un item
export const updateStockQuantity = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { quantity } = req.body;
    const { id } = req.params;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ message: "Quantité invalide" });
    }

    const updatedItem = await Stock.findOneAndUpdate(
      { _id: id, userId },
      { quantity },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Item non trouvé ou non autorisé" });
    }

    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la mise à jour", error: err.message });
  }
};

// Récupérer les utilisations d'intrants pour un shape
export const getInputUsages = async (req, res) => {
  try {
    const { shapeId } = req.params;
    const usages = await InputUsage.find({ shapeId }).populate("inputId", "category type name unit");

    // Débogage : Vérifiez les données avant de les renvoyer

    // Vérifiez si la population a fonctionné
    const populatedUsages = usages.map((usage) => ({
      ...usage._doc,
      input: usage.inputId ? usage.inputId : { category: "N/A", type: "N/A", name: "Intrant inconnu", unit: "N/A" },
    }));

    res.json(populatedUsages);
  } catch (err) {
    console.error("Erreur dans getInputUsages :", err);
    res.status(500).json({ message: "Erreur lors de la récupération des utilisations", error: err.message });
  }
};

// Ajouter une utilisation d'intrant
export const createInputUsage = async (req, res) => {
  try {
    const { shapeId, inputId, quantity, date } = req.body;

    if (!shapeId || !inputId || !quantity || !date) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    const newUsage = new InputUsage({ shapeId, inputId, quantity, date });
    const savedUsage = await newUsage.save();
    const populatedUsage = await InputUsage.findById(savedUsage._id).populate("inputId", "category type name unit");
    res.status(201).json(populatedUsage);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de l'ajout de l'utilisation", error: err.message });
  }
};