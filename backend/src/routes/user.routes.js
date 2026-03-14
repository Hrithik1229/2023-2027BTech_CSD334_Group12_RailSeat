import express from "express";
import {
    deleteUser,
    getAllUsers,
    getBookingsByUserId,
    getUserById,
    updateUser
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id/bookings", getBookingsByUserId);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
