import express from "express";
import helpController from "../controllers/helpController.js";

const router = express.Router();

router.get("/", helpController.getHelpDocs);

export default router;
