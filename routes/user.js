// user.js
import express from "express";
import { auth } from "../middlewares/auth.js";

import {
 
  createUser,
  login,
  logout,
  getAllAdmins,
  getProfile,
  updateUser,
  deleteUser,
  addAdmin,
  updateProfile,
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
VerifyAndSendCode,
VerifyAnswersAndSendCode,
} from "../controllers/userVerif.js";
import multer from "multer";



import {
  updateFarmerProfile
  } from "../controllers/farmer.js";




const router = express.Router();

//////////////// USER ACCES TO PLATFORM
router.route("/").post(createUser);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.put('/update/:userId', auth, updateUserActivation); // :userId dans l'URL


////////////////////////////////ADMIN ROUTES
router.get('/getalladmin', auth,getAllAdmins);
router.post("/addAdmin", auth, addAdmin);
router.get("/getAllUsers", getAllUsers);


///////////////////////////////USER ROUTES
router.put('/:userId',auth, updateUser);
router.delete('/:userId',auth, deleteUser);
router.route ("/getProfile").get(auth,getProfile);

router.put('/update-profile/:id', updateFarmerProfile);
router.put('/update-activation', auth,updateUserActivation); // Nouvelle route sans :userId


////////////////// RESET PASSWORD 
router.route("/forget").post(SendCodeForgot);
router.route("/reset").post(VerifCodeForgot);
router.route("/change").post(ChangePasswordForgot);
router.route("/Answers").post(VerifyAnswers);


///////////////////////// new user verification
router.route("/CodeVerif").post(SendCodeVerif);
router.route("/VerifNewUser").post(VerifNewUser);
router.route("/VerifyAndSendCode").post(VerifyAnswersAndSendCode);


// New route for fetching teams associated with a user

export default router;
