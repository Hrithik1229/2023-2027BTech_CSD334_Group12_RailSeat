import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SeatTypePricing = sequelize.define("SeatTypePricing", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },

    coach_type: {
        type: DataTypes.ENUM("1A", "2A", "3A", "SL", "CC"),
    },

    seat_type: {
        type: DataTypes.ENUM(
            "LOWER",
            "MIDDLE",
            "UPPER",
            "SIDE_LOWER",
            "SIDE_UPPER",
            "WINDOW",
            "AISLE"
        ),
    },

    price_multiplier: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 1.00,   // 1 = normal price
    }

}, {
    tableName: "seat_type_pricing",
    timestamps: false,
});

export default SeatTypePricing;
