import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import User from "../models/user.model.js";

/**
 * Sign up - create new user with hashed password
 * POST /api/auth/signup
 * Body: { username, email, password }
 */
export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                error: "Username, email and password are required"
            });
        }

        const existingUser = await User.findOne({
            where: { [Op.or]: [{ email }, { username }] }
        });

        if (existingUser) {
            const field = existingUser.email === email ? "Email" : "Username";
            return res.status(409).json({
                error: `${field} already in use`
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Failed to create account" });
    }
};

/**
 * Login - verify credentials and return user
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req, res) => {
    try {
        const { email, username, identifier, password } = req.body;

        const loginId = identifier || email || username;

        if (!loginId || !password) {
            return res.status(400).json({
                error: "Username/Email and password are required"
            });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: loginId },
                    { username: loginId }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        res.json({
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
};
