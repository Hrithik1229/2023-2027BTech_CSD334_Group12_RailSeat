/**
 * Debug Script: Check Route Data in Database
 * 
 * This script helps debug route data storage by querying the database
 * and showing what's actually stored for a specific run.
 */

import { sequelize, Station, TrainRun, TrainStop } from '../models/index.js';

async function checkRouteData(runId) {
    try {
        console.log('🔍 Checking Route Data in Database\n');
        console.log('='.repeat(70));

        // Fetch the train run
        const run = await TrainRun.findByPk(runId, {
            include: [
                {
                    model: TrainStop,
                    as: 'stops',
                    include: [
                        {
                            model: Station,
                            as: 'station',
                            attributes: ['id', 'name', 'code']
                        }
                    ],
                    order: [['stop_order', 'ASC']]
                }
            ]
        });

        if (!run) {
            console.log(`❌ Train run with ID ${runId} not found`);
            return;
        }

        console.log(`\n📋 Train Run Details (ID: ${runId})`);
        console.log('-'.repeat(70));
        console.log(`Train ID: ${run.train_id}`);
        console.log(`Direction: ${run.direction}`);
        console.log(`Source Station ID: ${run.source_station_id}`);
        console.log(`Destination Station ID: ${run.destination_station_id}`);
        console.log(`Departure Time: ${run.departure_time || 'NOT SET'}`);
        console.log(`Arrival Time: ${run.arrival_time || 'NOT SET'}`);
        console.log(`Duration: ${run.duration || 'NOT SET'}`);
        console.log(`Days of Run: ${run.days_of_run || 'NOT SET'}`);
        console.log(`Status: ${run.status || 'NOT SET'}`);

        console.log(`\n🛤️  Route Stops (${run.stops?.length || 0} stops)`);
        console.log('='.repeat(70));

        if (!run.stops || run.stops.length === 0) {
            console.log('⚠️  No stops found for this run');
        } else {
            run.stops.forEach((stop, index) => {
                console.log(`\nStop ${index + 1} (Order: ${stop.stop_order})`);
                console.log('-'.repeat(70));
                console.log(`  Station: ${stop.station?.name || 'Unknown'} (${stop.station?.code || 'N/A'})`);
                console.log(`  Station ID: ${stop.station_id}`);
                console.log(`  Arrival Time: ${stop.arrival_time || 'NOT SET'}`);
                console.log(`  Departure Time: ${stop.departure_time || 'NOT SET'}`);
                console.log(`  Halt Duration: ${stop.halt_duration} minutes`);
                console.log(`  Distance from Source: ${stop.distance_from_source} km`);
            });
        }

        console.log('\n' + '='.repeat(70));

        // Check for common issues
        console.log('\n⚠️  Potential Issues:');
        let issuesFound = false;

        if (!run.departure_time) {
            console.log('  ❌ TrainRun.departure_time is not set');
            issuesFound = true;
        }

        if (!run.arrival_time) {
            console.log('  ❌ TrainRun.arrival_time is not set');
            issuesFound = true;
        }

        if (!run.duration) {
            console.log('  ❌ TrainRun.duration is not set');
            issuesFound = true;
        }

        if (run.stops && run.stops.length > 0) {
            run.stops.forEach((stop, index) => {
                if (!stop.arrival_time && index > 0) {
                    console.log(`  ⚠️  Stop ${index + 1}: Missing arrival_time (not first stop)`);
                    issuesFound = true;
                }
                if (!stop.departure_time && index < run.stops.length - 1) {
                    console.log(`  ⚠️  Stop ${index + 1}: Missing departure_time (not last stop)`);
                    issuesFound = true;
                }
            });
        }

        if (!issuesFound) {
            console.log('  ✅ No issues found - all data looks good!');
        }

        console.log('\n');

    } catch (error) {
        console.error('❌ Error checking route data:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

// Get run ID from command line or use default
const runId = process.argv[2] || 1;

console.log(`Checking run_id: ${runId}\n`);

checkRouteData(runId);
