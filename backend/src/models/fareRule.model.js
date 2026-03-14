import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const FareRule = sequelize.define("FareRule", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  train_type: {
    type: DataTypes.ENUM("EXPRESS", "SUPERFAST", "LOCAL"),
    allowNull: false,
  },

  coach_type: {
    type: DataTypes.ENUM("1A", "2A", "3A", "SL", "CC", "2S", "AC", "GEN", "UR"),
    allowNull: false,
  },

  min_distance: {
    type: DataTypes.INTEGER,
    defaultValue: 300,   // 300 for AC, 200 for SL, 0 for local
  },

  base_fare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  per_km_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  reservation_charge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  superfast_charge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  superfast_charge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },

  gst_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 5.00, // AC = 5%, Non AC = 0%
  }

}, {
  tableName: "fare_rules",
  timestamps: true,
});

export default FareRule;
