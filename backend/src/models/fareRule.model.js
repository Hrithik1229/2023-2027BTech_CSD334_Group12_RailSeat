import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const FareRule = sequelize.define(
  "FareRule",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    train_type: {
      type: DataTypes.STRING,
      defaultValue: "EXPRESS", // EXPRESS, SUPERFAST, LOCAL
    },
    coach_type: {
      type: DataTypes.ENUM("1A", "2A", "3A", "SL", "CC", "2S"),
      allowNull: false,
    },
    base_fare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    per_km_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    reservation_charge: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
  },
  {
    tableName: "fare_rules",
    timestamps: true,
  }
);

export default FareRule;
