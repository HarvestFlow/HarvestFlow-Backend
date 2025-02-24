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

const router = express.Router();

//////////////// USER ACCES TO PLATFORM
router.route("/").post(createUser);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/profile").put(auth,multer,updateProfile);



////////////////////////////////ADMIN ROUTES
router.get('/getalladmin', auth,getAllAdmins);
router.post("/addAdmin", auth, addAdmin);


///////////////////////////////USER ROUTES
router.put('/:userId',auth, updateUser);
router.delete('/:userId',auth, deleteUser);
router.route ("/getProfile").get(auth,getProfile);





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
