// controllers/dailyrecommendation.js
import axios from "axios";

export async function runModel(userContent) {
  const url = "http://localhost:11434/api/chat";
  const data = {
    model: "mistral",
    messages: [{ role: "user", content: userContent }],
  };

  try {
    const response = await axios.post(url, data, {
      headers: { "Content-Type": "application/json" },
    });

    const responseBody = response.data;
    const messagesArray = responseBody
      .split("\n")
      .map((line) => {
        if (line.trim() !== "") {
          return JSON.parse(line.trim()).message.content;
        }
        return "";
      })
      .join("");

    return { message: messagesArray };
  } catch (error) {
    console.error("Erreur lors de l'exécution du modèle :", error);
    throw new Error(error.message);
  }
}

import express from "express";
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const userContent =
      req.body.userContent +
      " Act as a wheat harvest expert. Respond in 200 tokens max: 'Soil pH [value]: [action]. Soil moisture [value]: [action]. Weeds [status]: [action]. Pests [status]: [action]. Weather [key factor]: [action]. Focus on germination, concise, actionable steps.' Ensure clear, structured guidance.";
    const result = await runModel(userContent);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur lors de l'exécution du modèle :", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;