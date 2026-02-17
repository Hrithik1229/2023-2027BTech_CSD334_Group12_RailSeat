/**
 * Script: Verify Database Schema for Route Tables
 * 
 * This script checks if the database tables have the correct columns
 * for storing route data (times, duration, etc.)
 */

import sequelize from '../config/db.js';

async function verifySchema() {
    try {
        console.log('🔍 Verifying Database Schema\n');
        console.log('='.repeat(70));

        const queryInterface = sequelize.getQueryInterface();

        // Check train_runs table
        console.log('\n📋 Table: train_runs');
        console.log('-'.repeat(70));
        const trainRunsSchema = await queryInterface.describeTable('train_runs');

        const requiredRunFields = [
            'run_id',
            'train_id',
            'direction',
            'source_station_id',
            'destination_station_id',
            'departure_time',
            'arrival_time',
            'duration',
            'days_of_run',
            'status'
        ];

        requiredRunFields.forEach(field => {
            if (trainRunsSchema[field]) {
                console.log(`✅ ${field.padEnd(25)} - ${trainRunsSchema[field].type}`);
            } else {
                console.log(`❌ ${field.padEnd(25)} - MISSING!`);
            }
        });

        // Check train_stops table
        console.log('\n📋 Table: train_stops');
        console.log('-'.repeat(70));
        const trainStopsSchema = await queryInterface.describeTable('train_stops');

        const requiredStopFields = [
            'stop_id',
            'run_id',
            'station_id',
            'stop_order',
            'arrival_time',
            'departure_time',
            'halt_duration',
            'distance_from_source'
        ];

        requiredStopFields.forEach(field => {
            if (trainStopsSchema[field]) {
                console.log(`✅ ${field.padEnd(25)} - ${trainStopsSchema[field].type}`);
            } else {
                console.log(`❌ ${field.padEnd(25)} - MISSING!`);
            }
        });

        console.log('\n' + '='.repeat(70));
        console.log('\n✅ Schema verification complete!\n');

        // Check if we need to add any missing columns
        const missingRunFields = requiredRunFields.filter(f => !trainRunsSchema[f]);
        const missingStopFields = requiredStopFields.filter(f => !trainStopsSchema[f]);

        if (missingRunFields.length > 0 || missingStopFields.length > 0) {
            console.log('⚠️  Missing columns detected:');
            if (missingRunFields.length > 0) {
                console.log(`   train_runs: ${missingRunFields.join(', ')}`);
            }
            if (missingStopFields.length > 0) {
                console.log(`   train_stops: ${missingStopFields.join(', ')}`);
            }
            console.log('\n💡 You may need to run migrations or sync the database.');
        }

    } catch (error) {
        console.error('❌ Error verifying schema:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

verifySchema();
