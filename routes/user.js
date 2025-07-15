import express from "express";
import { auth } from "../middlewares/auth.js";
import { sendContactOffer, getAllContactRequests, getContactAttempts } from '../controllers/contactOffer.js';import {
  createUser,
  login,
  logout,
  getAllAdmins,
  getProfile,
  updateUser,
  deleteUser,
  addAdmin,
  updateUserActivation,
  getAllUsers,
} from "../controllers/user.js";
import {
  SendCodeForgot,
  VerifCodeForgot,
  ChangePasswordForgot,
  VerifyAnswers,
  SendCodeVerif,
  VerifNewUser,
  VerifyAnswersAndSendCode,
} from "../controllers/userVerif.js";
import { updateFarmerProfile } from "../controllers/farmer.js";
import multer from "multer";

const router = express.Router();

// User access to platform
router.route("/").post(createUser);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.put("/update/:userId", auth, updateUserActivation);

// Admin routes
router.get("/getalladmin", auth, getAllAdmins);
router.post("/addAdmin", auth, addAdmin);
router.get("/getAllUsers", getAllUsers);

// User routes
router.put("/:userId", auth, updateUser);
router.delete("/:userId", auth, deleteUser);
router.route("/getProfile").get(auth, getProfile);
router.put("/update-profile/:id", updateFarmerProfile);
router.put("/update-activation", auth, updateUserActivation);

// Reset password
router.route("/forget").post(SendCodeForgot);
router.route("/reset").post(VerifCodeForgot);
router.route("/change").post(ChangePasswordForgot);
router.route("/Answers").post(VerifyAnswers);

// New user verification
router.route("/CodeVerif").post(SendCodeVerif);
router.route("/VerifNewUser").post(VerifNewUser);
router.route("/VerifyAndSendCode").post(VerifyAnswersAndSendCode);

// Contact offer and contact attempts (no auth middleware)
router.post("/api/contact-offer", sendContactOffer);
router.get('/contact-requests', getAllContactRequests);
router.get('/contact-attempts', getContactAttempts);
export default router;