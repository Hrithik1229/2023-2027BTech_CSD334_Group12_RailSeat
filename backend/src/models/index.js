import sequelize from "../config/db.js";
import Booking from "./booking.model.js";
import Coach from "./coach.model.js";
import FareRule from "./fareRule.model.js";
import Passenger from "./passenger.model.js";
import Seat from "./seat.model.js";
import SeatTypePricing from "./seatPreferenceMultiplier.model.js";
import Station from "./station.model.js";
import Train from "./train.model.js";
import TrainRun from "./trainRun.model.js";
import TrainStop from "./trainStop.model.js";
import User from "./user.model.js";

// Define User ↔ Booking association here to avoid circular import
User.hasMany(Booking, { foreignKey: "user_id", as: "bookings" });
Booking.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Define Train ↔ Coach associations
// A train can have many coaches, each coach belongs to a single train
Train.hasMany(Coach, { foreignKey: "train_id", as: "coaches" });
Coach.belongsTo(Train, { foreignKey: "train_id", as: "train" });

// Define Coach ↔ Seat associations
// A coach can have many seats, each seat belongs to a single coach
Coach.hasMany(Seat, { foreignKey: "coach_id", as: "seats" });
Seat.belongsTo(Coach, { foreignKey: "coach_id", as: "coach" });

// Export all models
export {
    Booking, Coach, FareRule, Passenger, Seat, SeatTypePricing, Station, Train, TrainRun, TrainStop, User, sequelize
};

