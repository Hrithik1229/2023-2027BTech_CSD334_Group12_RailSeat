/**
 * Migration: Add 'tc' to users.role ENUM and 'occupied' to seats.status ENUM
 *
 * Run with:  node --experimental-modules backend/src/migrations/add_tc_role_and_occupied_status.js
 *
 * This script alters the MySQL/PostgreSQL ENUM columns to include the new values.
 * For MySQL (which this project uses), we use ALTER TABLE ... MODIFY COLUMN.
 */
import sequelize from "../config/db.js";

async function migrate() {
  try {
    console.log("🔄 Starting migration: add 'tc' role + 'occupied' seat status...");

    // 1. Add 'tc' to users.role ENUM
    console.log("  → Adding 'tc' to users.role ENUM...");
    await sequelize.query(
      `ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'tc') DEFAULT 'user'`
    );
    console.log("  ✅ users.role updated.");

    // 2. Add 'occupied' to seats.status ENUM
    console.log("  → Adding 'occupied' to seats.status ENUM...");
    await sequelize.query(
      `ALTER TABLE seats MODIFY COLUMN status ENUM('available', 'selected', 'booked', 'locked', 'occupied') DEFAULT 'available' NOT NULL`
    );
    console.log("  ✅ seats.status updated.");

    console.log("✅ Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
