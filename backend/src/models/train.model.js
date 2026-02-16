import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Train = sequelize.define("Train", {
    train_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    train_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    train_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Comma-separated days the train is scheduled to operate (e.g. "Mon,Tue,Wed" or "Daily")
    active_days: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    tableName: "trains",
    timestamps: true
});

export default Train;
