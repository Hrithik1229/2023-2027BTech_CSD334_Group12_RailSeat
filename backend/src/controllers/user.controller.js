import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { Booking, Passenger, Seat, Train } from "../models/index.js";
import User from "../models/user.model.js";

export const getAllUsers = async (req, res) => {
    res.status(403).json({ error: "Forbidden" });
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: ["user_id", "username", "email"]
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("getUserById error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (username !== undefined) {
            const existing = await User.findOne({
                where: { username, user_id: { [Op.ne]: id } }
            });
            if (existing) {
                return res.status(409).json({ error: "Username already in use" });
            }
            user.username = username;
        }
        if (email !== undefined) {
            const existing = await User.findOne({
                where: { email, user_id: { [Op.ne]: id } }
            });
            if (existing) {
                return res.status(409).json({ error: "Email already in use" });
            }
            user.email = email;
        }
        if (password !== undefined && password.trim() !== "") {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        res.json({
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("updateUser error:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
};

export const deleteUser = async (req, res) => {
    res.status(403).json({ error: "Forbidden" });
};

/** GET /api/users/:id/bookings - list bookings for user (by user_id) */
export const getBookingsByUserId = async (req, res) => {
    try {
        const userId = req.params.id;
        const bookings = await Booking.findAll({
            where: { user_id: userId },
            include: [
                { model: Train, as: "train" },
                {
                    model: Passenger,
                    as: "passengers",
                    include: [{ model: Seat, as: "seat" }]
                }
            ],
            order: [["createdAt", "DESC"]]
        });
        res.json(bookings);
    } catch (error) {
        console.error("getBookingsByUserId error:", error);
        res.status(500).json({ error: "Failed to get bookings" });
    }
};
