/**
 * Migration: Add status column to train_runs table
 * 
 * This migration adds a status column to track whether a train run is active or inactive.
 * Run this script to update your existing database schema.
 */

import sequelize from '../config/db.js';

async function addStatusColumn() {
    const queryInterface = sequelize.getQueryInterface();

    try {
        console.log('Starting migration: Adding status column to train_runs table...');

        // Check if the column already exists
        const tableDescription = await queryInterface.describeTable('train_runs');

        if (tableDescription.status) {
            console.log('Status column already exists. Skipping migration.');
            return;
        }

        // Add the status column
        await queryInterface.addColumn('train_runs', 'status', {
            type: sequelize.Sequelize.ENUM('active', 'inactive'),
            defaultValue: 'active',
            allowNull: false,
        });

        console.log('✓ Successfully added status column to train_runs table');

        // Update all existing rows to have 'active' status
        await sequelize.query(
            "UPDATE train_runs SET status = 'active' WHERE status IS NULL"
        );

        console.log('✓ Updated all existing train runs to active status');
        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error('Full error:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run the migration
addStatusColumn()
    .then(() => {
        console.log('Migration script finished');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
