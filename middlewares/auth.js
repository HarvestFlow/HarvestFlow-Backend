//auth.js

import jwt from "jsonwebtoken";
import createError from "http-errors";
import User from '../models/user.js';
import cookieParser from 'cookie-parser'; // Ajoute le support des cookies

export function signAccessToken(userId) {
  return new Promise((resolve, reject) => {
    const payload = { _id: userId };
    const secret = "verySecretValue";
    const options = {
      audience: userId,
      expiresIn: '1d', // Le token expirera dans 1 heure

    };
    jwt.sign(payload, secret, options, (err, token) => {
      if (err) {
        console.log(err.message);
        reject(createError.InternalServerError());
        return;
      }
      resolve(token); 
    });
  });
}


export async function auth(req, res, next) {
  try {
    // Récupérer le token depuis le cookie
    const token = req.cookies.accessToken; 

    if (!token) {
      console.log("Token manquant");
      throw createError.Unauthorized('Token missing');
    }

    // Vérifier et décoder le token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "verySecretValue");

    const userId = decodedToken._id || decodedToken.id;
    console.log("User ID:", userId);

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      console.log("Utilisateur non trouvé");
      throw createError.Unauthorized('User not found');
    }

    // Ajouter l'authentification à req.auth
    req.auth = {
      userId: userId,
      role: user.role
    };

    console.log("Utilisateur authentifié:", user.role);
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    res.status(401).json({ error: error.message });
  }
}









export function verifyAccessToken(req, res, next) {
  if (!req.headers["authorization"]) return next(createError.Unauthorized());
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader.split(" ");
  const token = bearerToken[1];
  jwt.verify(token, "verySecretValue", (err, payload) => {
    if (err) {
      const message =
        err.name === "JsonWebTokenError" ? "Unauthorized" : err.message;
      return next(createError.Unauthorized(message));
    }
    req.payload = payload;
    next();
  });
}

export async function signRefreshToken(userId) {
  try {
    const payload = {};
    const secret = "verySecretValue";
    const options = {
      expiresIn: "1y",
      audience: userId,
    };
    const token = await jwt.sign(payload, secret, options);
    return token;
  } catch (error) {
    console.error(error.message);
    throw createError.InternalServerError();
  }
}

export function verifyRefreshToken(refreshToken) {
  try {
    const decodedToken = jwt.verify(refreshToken, "verySecretValue");
    const userId = decodedToken.aud;
    return userId;
  } catch (error) {
    console.error(error.message);
    throw createError.Unauthorized();
  }
}

export async function invalidateRefreshToken(userId) {
  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      // Handle the case where the user is not found
      console.error('User not found');
      return;
    }

    // Invalidate or blacklist the refresh token
    // For simplicity, you can add a field (e.g., refreshTokenValid) to the user document
    // Set this field to false to indicate that the refresh token is no longer valid

    user.refreshTokenValid = false;

    // Save the updated user document
    await user.save();

    console.log('Refresh token invalidated for user:', userId);
  } catch (error) {
    console.error('Error invalidating refresh token:', error);
    throw error; // Handle the error as needed
  }
}
