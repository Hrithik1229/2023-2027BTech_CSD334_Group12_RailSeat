import sequelize from "../config/db.js";
import Booking from "./booking.model.js";
import Coach from "./coach.model.js";
import Passenger from "./passenger.model.js";
import Seat from "./seat.model.js";
import Station from "./station.model.js";
import Train from "./train.model.js";
import TrainStop from "./trainStop.model.js";
import User from "./user.model.js";

// Define User ↔ Booking association here to avoid circular import
User.hasMany(Booking, { foreignKey: "user_id", as: "bookings" });
Booking.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Export all models
export {
    Booking, Coach, Passenger, Seat, Station, Train, TrainStop, User, sequelize
};

