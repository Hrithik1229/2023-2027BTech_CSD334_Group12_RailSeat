/**
 * migrate_booking_columns.js
 *
 * Safely adds new columns to the `bookings` table using raw SQL
 * so it works regardless of whether the columns already exist.
 *
 * Run once: node src/scripts/migrate_booking_columns.js
 */

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const migrate = async () => {
    try {
        await sequelize.authenticate();
        console.log("DB connected.");

        const qi = sequelize.getQueryInterface();
        const describe = await qi.describeTable("bookings");

        const columns = [
            { name: "gen_ticket",          type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            { name: "gen_validity_start",  type: DataTypes.DATE,    allowNull: true                       },
            { name: "gen_validity_end",    type: DataTypes.DATE,    allowNull: true                       },
            { name: "is_downloadable",     type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  },
        ];

        for (const col of columns) {
            if (describe[col.name]) {
                console.log(`  ✓ '${col.name}' already exists — skipping.`);
            } else {
                await qi.addColumn("bookings", col.name, {
                    type: col.type,
                    allowNull: col.allowNull,
                    defaultValue: col.defaultValue ?? null,
                });
                console.log(`  + Added '${col.name}'.`);
            }
        }

        console.log("\nMigration complete ✔");
        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err.message);
        process.exit(1);
    }
};

migrate();
