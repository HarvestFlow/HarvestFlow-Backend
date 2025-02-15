// user.js
import express from "express";
import { auth } from "../middlewares/auth.js";
import {
 
  createUser,
  login,
  logout,
 
} from "../controllers/user.js";

const router = express.Router();
router.route("/").post(createUser);

router.route("/login").post(login);
router.route("/logout").post(logout);

// New route for fetching teams associated with a user

export default router;
