import { DataTypes } from "sequelize";
import { Train } from "../models/index.js";
import sequelize from "./db.js";

// ── Safe column migration ─────────────────────────────────────────────────────
// Adds new columns to existing tables WITHOUT using alter:true (which is
// destructive — it can drop columns that exist in the DB but not in the model).
// This runs every startup; addColumn is a no-op if the column already exists.
const runSafeMigrations = async () => {
    const qi = sequelize.getQueryInterface();

    // ── bookings table ───────────────────────────────────────────────────────
    let bookingDesc;
    try {
        bookingDesc = await qi.describeTable("bookings");
    } catch {
        // Table doesn't exist yet — sync will create it, skip migration
        return;
    }

    const bookingColumns = [
        {
            name: "gen_ticket",
            spec: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        },
        {
            name: "gen_validity_start",
            spec: { type: DataTypes.DATE, allowNull: true },
        },
        {
            name: "gen_validity_end",
            spec: { type: DataTypes.DATE, allowNull: true },
        },
        {
            name: "is_downloadable",
            spec: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
    ];

    for (const col of bookingColumns) {
        if (!bookingDesc[col.name]) {
            try {
                await qi.addColumn("bookings", col.name, col.spec);
                console.log(`✅ Migration: added column bookings.${col.name}`);
            } catch (err) {
                console.warn(`⚠️  Migration: could not add bookings.${col.name}:`, err.message);
            }
        }
    }

    // ── fare_rules table — restore superfast_charge if dropped ───────────────
    let fareDesc;
    try {
        fareDesc = await qi.describeTable("fare_rules");
    } catch {
        return;
    }

    if (!fareDesc["superfast_charge"]) {
        try {
            await qi.addColumn("fare_rules", "superfast_charge", {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0,
            });
            console.log("✅ Migration: added column fare_rules.superfast_charge");
            // Populate standard superfast charges for existing rows
            await sequelize.query(`
                UPDATE fare_rules SET superfast_charge = 30 WHERE train_type = 'SUPERFAST' AND coach_type = 'SL';
                UPDATE fare_rules SET superfast_charge = 45 WHERE train_type = 'SUPERFAST' AND coach_type IN ('3A','2A','CC');
                UPDATE fare_rules SET superfast_charge = 75 WHERE train_type = 'SUPERFAST' AND coach_type = '1A';
                UPDATE fare_rules SET superfast_charge = 55 WHERE train_type = 'SUPERFAST' AND coach_type = 'AC';
            `);
            console.log("✅ Migration: seeded fare_rules.superfast_charge values");
        } catch (err) {
            console.warn("⚠️  Migration: could not add fare_rules.superfast_charge:", err.message);
        }
    }

    // ── fare_rules coach_type ENUM — add new values if missing ───────────────
    // PostgreSQL supports: ALTER TYPE enum_name ADD VALUE 'new_val' IF NOT EXISTS
    // The ENUM name format Sequelize uses is: "enum_tablename_columnname"
    const newEnumValues = ["GEN", "AC", "UR"];
    for (const val of newEnumValues) {
        try {
            await sequelize.query(
                `DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'enum_fare_rules_coach_type'
                          AND e.enumlabel = '${val}'
                    ) THEN
                        ALTER TYPE "enum_fare_rules_coach_type" ADD VALUE '${val}';
                    END IF;
                END $$;`
            );
            console.log(`✅ Migration: ensured ENUM value '${val}' in fare_rules.coach_type`);
        } catch (err) {
            console.warn(`⚠️  Migration: could not add ENUM value '${val}' to fare_rules:`, err.message);
        }

        try {
            await sequelize.query(
                `DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'enum_seat_type_pricing_coach_type'
                          AND e.enumlabel = '${val}'
                    ) THEN
                        ALTER TYPE "enum_seat_type_pricing_coach_type" ADD VALUE '${val}';
                    END IF;
                END $$;`
            );
            console.log(`✅ Migration: ensured ENUM value '${val}' in seat_type_pricing.coach_type`);
        } catch (err) {
            console.warn(`⚠️  Migration: could not add ENUM value '${val}' to seat_type_pricing:`, err.message);
        }
    }

    // ── users.role ENUM — add 'tc' value ─────────────────────────────────────
    try {
        await sequelize.query(
            `DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'enum_users_role'
                      AND e.enumlabel = 'tc'
                ) THEN
                    ALTER TYPE "enum_users_role" ADD VALUE 'tc';
                END IF;
            END $$;`
        );
        console.log(`✅ Migration: ensured ENUM value 'tc' in users.role`);
    } catch (err) {
        console.warn(`⚠️  Migration: could not add ENUM value 'tc' to users.role:`, err.message);
    }

    // ── seats.status ENUM — add 'occupied' value ─────────────────────────────
    try {
        await sequelize.query(
            `DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'enum_seats_status'
                      AND e.enumlabel = 'occupied'
                ) THEN
                    ALTER TYPE "enum_seats_status" ADD VALUE 'occupied';
                END IF;
            END $$;`
        );
        console.log(`✅ Migration: ensured ENUM value 'occupied' in seats.status`);
    } catch (err) {
        console.warn(`⚠️  Migration: could not add ENUM value 'occupied' to seats.status:`, err.message);
    }
};


// ── Initialize database ───────────────────────────────────────────────────────
export const initDatabase = async () => {
    try {
        // Sync all models with database
        // alter: false — never drop or modify existing columns automatically
        await sequelize.sync({ alter: false });
        console.log("Database models synchronized successfully.");

        // Run targeted, additive-only column migrations
        await runSafeMigrations();

        // Check if we need to seed initial data
        const trainCount = await Train.count();
        if (trainCount === 0) {
            console.log("No trains found. You may want to seed initial data.");
        }
    } catch (error) {
        console.error("Error initializing database:", error);
        throw error;
    }
};

// Seed initial data (optional - for development)
export const seedDatabase = async () => {
    try {
        const sampleTrain = await Train.create({
            train_number: "12301",
            train_name: "Rajdhani Express",
            source_station: "New Delhi",
            destination_station: "Mumbai Central",
            departure_time: "16:55:00",
            arrival_time: "10:00:00",
            duration: "17h 5m",
            status: "active"
        });
        console.log("Sample train created:", sampleTrain.train_name);
    } catch (error) {
        console.error("Error seeding database:", error);
    }
};
