import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Coach = sequelize.define("Coach", {
    coach_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    coach_number: {
        type: DataTypes.STRING,
        allowNull: false // e.g., 'S1', 'B1', 'A1', 'C1', 'E1'
    },
    coach_type: {
        type: DataTypes.ENUM(
            '1A', '2A', '3A', '3E', 'SL',
            'CC', 'EC', 'EA', '2S', 'EV'
        ),
        allowNull: false
    },
    // The position in the train rake
    sequence_order: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Stores how many seats this specific coach has (e.g., 72 for SL, 54 for 2A)
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 72
    },
    train_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'trains',
            key: 'train_id'
        }
    }
}, {
    tableName: "coaches",
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['train_id', 'coach_number']
        }
    ]
});

export default Coach;