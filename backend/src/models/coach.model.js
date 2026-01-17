import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Train from "./train.model.js";

const Coach = sequelize.define("Coach", {
    coach_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    coach_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    coach_type: {
        type: DataTypes.ENUM('sleeper', 'ac', 'chair'),
        allowNull: false
    },
    total_seats: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    train_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Train,
            key: 'train_id'
        }
    }
}, {
    tableName: "coaches",
    timestamps: true
});

// Define relationships
Train.hasMany(Coach, { foreignKey: 'train_id', as: 'coaches' });
Coach.belongsTo(Train, { foreignKey: 'train_id', as: 'train' });

export default Coach;
