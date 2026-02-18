import { FareRule, SeatTypePricing, sequelize } from "../models/index.js";

const seedFares = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected.");

        // Ensure tables exist
        await FareRule.sync({ force: true });
        await SeatTypePricing.sync({ force: true });
        console.log("Tables synced.");

        // 1. Seed Fare Rules
        const fareRules = [
            // EXPRESS TRAINS
            { train_type: "EXPRESS", coach_type: "SL", base_fare: 150, per_km_rate: 0.60, min_distance: 200, reservation_charge: 20, gst_percent: 0 },
            { train_type: "EXPRESS", coach_type: "3A", base_fare: 500, per_km_rate: 1.80, min_distance: 300, reservation_charge: 40, gst_percent: 5 },
            { train_type: "EXPRESS", coach_type: "2A", base_fare: 800, per_km_rate: 2.50, min_distance: 300, reservation_charge: 50, gst_percent: 5 },
            { train_type: "EXPRESS", coach_type: "1A", base_fare: 1200, per_km_rate: 3.50, min_distance: 300, reservation_charge: 60, gst_percent: 5 },
            { train_type: "EXPRESS", coach_type: "CC", base_fare: 300, per_km_rate: 1.20, min_distance: 100, reservation_charge: 40, gst_percent: 5 },
            { train_type: "EXPRESS", coach_type: "2S", base_fare: 100, per_km_rate: 0.45, min_distance: 100, reservation_charge: 15, gst_percent: 0 },
            // Generic AC Fallback
            { train_type: "EXPRESS", coach_type: "AC", base_fare: 600, per_km_rate: 2.00, min_distance: 300, reservation_charge: 45, gst_percent: 5 },

            // SUPERFAST TRAINS (+surcharge)
            { train_type: "SUPERFAST", coach_type: "SL", base_fare: 180, per_km_rate: 0.65, min_distance: 200, reservation_charge: 20, superfast_charge: 30, gst_percent: 0 },
            { train_type: "SUPERFAST", coach_type: "3A", base_fare: 550, per_km_rate: 1.90, min_distance: 300, reservation_charge: 40, superfast_charge: 45, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "2A", base_fare: 900, per_km_rate: 2.70, min_distance: 300, reservation_charge: 50, superfast_charge: 45, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "1A", base_fare: 1400, per_km_rate: 3.80, min_distance: 300, reservation_charge: 60, superfast_charge: 75, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "CC", base_fare: 350, per_km_rate: 1.30, min_distance: 100, reservation_charge: 40, superfast_charge: 45, gst_percent: 5 },
            { train_type: "SUPERFAST", coach_type: "AC", base_fare: 700, per_km_rate: 2.20, min_distance: 300, reservation_charge: 50, superfast_charge: 55, gst_percent: 5 },

            // LOCAL TRAINS (cheaper)
            { train_type: "LOCAL", coach_type: "2S", base_fare: 10, per_km_rate: 0.30, min_distance: 0, reservation_charge: 0, gst_percent: 0 },
        ];

        await FareRule.bulkCreate(fareRules);
        console.log(`Seeded ${fareRules.length} fare rules.`);

        // 2. Seed Seat Multipliers
        const seatMultipliers = [
            // Sleeper / 3A / 2A (Berths)
            { coach_type: "SL", seat_type: "LOWER", price_multiplier: 1.10 }, // Preferred
            { coach_type: "SL", seat_type: "SIDE_LOWER", price_multiplier: 1.15 }, // Highly preferred
            { coach_type: "SL", seat_type: "MIDDLE", price_multiplier: 0.95 },
            { coach_type: "SL", seat_type: "UPPER", price_multiplier: 0.90 }, // Less preferred
            { coach_type: "SL", seat_type: "SIDE_UPPER", price_multiplier: 0.90 },

            { coach_type: "3A", seat_type: "LOWER", price_multiplier: 1.10 },
            { coach_type: "3A", seat_type: "SIDE_LOWER", price_multiplier: 1.15 },
            { coach_type: "3A", seat_type: "MIDDLE", price_multiplier: 0.95 },
            { coach_type: "3A", seat_type: "UPPER", price_multiplier: 0.90 },
            { coach_type: "3A", seat_type: "SIDE_UPPER", price_multiplier: 0.90 },

            // Chair Car (Seats)
            { coach_type: "CC", seat_type: "WINDOW", price_multiplier: 1.10 },
            { coach_type: "CC", seat_type: "AISLE", price_multiplier: 1.00 },
            { coach_type: "CC", seat_type: "MIDDLE", price_multiplier: 0.90 }, // Middle seat in 3+2 row

            // Generic AC Pricing
            { coach_type: "AC", seat_type: "LOWER", price_multiplier: 1.10 },
            { coach_type: "AC", seat_type: "SIDE_LOWER", price_multiplier: 1.15 },
            { coach_type: "AC", seat_type: "MIDDLE", price_multiplier: 0.95 },
            { coach_type: "AC", seat_type: "UPPER", price_multiplier: 0.90 },
            { coach_type: "AC", seat_type: "SIDE_UPPER", price_multiplier: 0.90 },
        ];

        await SeatTypePricing.bulkCreate(seatMultipliers);
        console.log(`Seeded ${seatMultipliers.length} seat multipliers.`);

        console.log("Done seeding fares.");
        const fs = await import('fs');
        fs.writeFileSync('seeded.txt', 'Seeding completed successfully at ' + new Date().toISOString());
        process.exit(0);
    } catch (err) {
        console.error("Error seeding fares:", err);
        process.exit(1);
    }
};

seedFares();
