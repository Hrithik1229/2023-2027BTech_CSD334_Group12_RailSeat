import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Coach from "./coach.model.js";

const Seat = sequelize.define("Seat", {
    seat_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    seat_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Updated ENUM to match the sitting coach layout in the image
    seat_type: {
        type: DataTypes.ENUM('window', 'middle', 'aisle', 'lower', 'upper', 'side-lower', 'side-upper'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('available', 'selected', 'booked', 'locked'),
        defaultValue: 'available'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    coach_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Coach,
            key: 'coach_id'
        }
    },
    // Used to group seats into horizontal lines
    row_number: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // NEW: Distinguishes between the "3-seat" side and "2-seat" side
    side: {
        type: DataTypes.ENUM('left', 'right'),
        allowNull: false,
        defaultValue: 'left'
    },
    // NEW: Horizontal order (e.g., Left side: 0=Window, 1=Middle, 2=Aisle)
    position_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: "seats",
    timestamps: true
});

Coach.hasMany(Seat, { foreignKey: 'coach_id', as: 'seats' });
Seat.belongsTo(Coach, { foreignKey: 'coach_id', as: 'coach' });

export default Seat;