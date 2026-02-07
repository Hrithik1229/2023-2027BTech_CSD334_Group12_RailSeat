import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Booking from "./booking.model.js";

const User = sequelize.define("User", {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: "users",
    timestamps: true
});

// Define relationships

Booking.hasMany(User, { foreignKey: 'booking_id', as: 'users' });

export default User;