/**
 * Debug Script: Test Train Search
 * 
 * This script helps debug the train search functionality by:
 * 1. Listing all stations in the database
 * 2. Showing all train stops for each station
 * 3. Testing search between two stations
 */

import { sequelize, Station, Train, TrainRun, TrainStop } from '../models/index.js';

async function debugTrainSearch(sourceStationName, destStationName) {
    try {
        console.log('🔍 Train Search Debug Tool\n');
        console.log('='.repeat(70));

        // 1. List all stations
        console.log('\n📍 All Stations in Database:');
        console.log('-'.repeat(70));
        const allStations = await Station.findAll({
            order: [['name', 'ASC']]
        });

        if (allStations.length === 0) {
            console.log('❌ No stations found in database!');
            console.log('   You need to add stations first.');
            return;
        }

        allStations.forEach((station, index) => {
            console.log(`${(index + 1).toString().padStart(3)}. ${station.name.padEnd(30)} (Code: ${station.code || 'N/A'}, ID: ${station.id})`);
        });

        if (!sourceStationName || !destStationName) {
            console.log('\n💡 Usage: node src/scripts/debugTrainSearch.js "Station1" "Station2"');
            console.log('   Example: node src/scripts/debugTrainSearch.js "Mumbai" "Delhi"');
            return;
        }

        // 2. Find the specified stations
        console.log(`\n\n🔎 Searching for route: "${sourceStationName}" → "${destStationName}"`);
        console.log('='.repeat(70));

        const sourceStation = await Station.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                sequelize.fn('LOWER', sourceStationName)
            )
        });

        const destStation = await Station.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                sequelize.fn('LOWER', destStationName)
            )
        });

        if (!sourceStation) {
            console.log(`\n❌ Source station "${sourceStationName}" not found!`);
            console.log('   Available stations are listed above.');
            return;
        }

        if (!destStation) {
            console.log(`\n❌ Destination station "${destStationName}" not found!`);
            console.log('   Available stations are listed above.');
            return;
        }

        console.log(`\n✅ Source: ${sourceStation.name} (ID: ${sourceStation.id})`);
        console.log(`✅ Destination: ${destStation.name} (ID: ${destStation.id})`);

        // 3. Find all stops at source station
        console.log(`\n\n🚉 Trains stopping at ${sourceStation.name}:`);
        console.log('-'.repeat(70));

        const sourceStops = await TrainStop.findAll({
            where: { station_id: sourceStation.id },
            include: [
                {
                    model: TrainRun,
                    as: 'run',
                    include: [{
                        model: Train,
                        as: 'train'
                    }]
                }
            ],
            order: [['stop_order', 'ASC']]
        });

        if (sourceStops.length === 0) {
            console.log(`❌ No trains stop at ${sourceStation.name}`);
            return;
        }

        sourceStops.forEach((stop, index) => {
            console.log(`${(index + 1).toString().padStart(3)}. Run ID: ${stop.run_id.toString().padStart(4)} | ` +
                `Train: ${stop.run?.train?.train_name || 'Unknown'} | ` +
                `Stop Order: ${stop.stop_order} | ` +
                `Departure: ${stop.departure_time || 'N/A'}`);
        });

        // 4. Find all stops at destination station
        console.log(`\n\n🚉 Trains stopping at ${destStation.name}:`);
        console.log('-'.repeat(70));

        const destStops = await TrainStop.findAll({
            where: { station_id: destStation.id },
            include: [
                {
                    model: TrainRun,
                    as: 'run',
                    include: [{
                        model: Train,
                        as: 'train'
                    }]
                }
            ],
            order: [['stop_order', 'ASC']]
        });

        if (destStops.length === 0) {
            console.log(`❌ No trains stop at ${destStation.name}`);
            return;
        }

        destStops.forEach((stop, index) => {
            console.log(`${(index + 1).toString().padStart(3)}. Run ID: ${stop.run_id.toString().padStart(4)} | ` +
                `Train: ${stop.run?.train?.train_name || 'Unknown'} | ` +
                `Stop Order: ${stop.stop_order} | ` +
                `Arrival: ${stop.arrival_time || 'N/A'}`);
        });

        // 5. Find matching runs
        console.log(`\n\n🔗 Matching Train Runs:`);
        console.log('-'.repeat(70));

        const validRuns = [];
        sourceStops.forEach(sStop => {
            const dStop = destStops.find(ds => ds.run_id === sStop.run_id);
            if (dStop && sStop.stop_order < dStop.stop_order) {
                validRuns.push({
                    run_id: sStop.run_id,
                    train_name: sStop.run?.train?.train_name,
                    source_stop_order: sStop.stop_order,
                    dest_stop_order: dStop.stop_order,
                    departure_time: sStop.departure_time,
                    arrival_time: dStop.arrival_time
                });
            }
        });

        if (validRuns.length === 0) {
            console.log(`❌ No trains run from ${sourceStation.name} to ${destStation.name}`);
            console.log('\n💡 Possible reasons:');
            console.log('   1. No train has stops at both stations');
            console.log('   2. The destination comes before the source in the route');
            console.log('   3. The route data is not set up correctly');

            // Check if any runs have both stations
            const commonRuns = sourceStops.filter(sStop =>
                destStops.some(dStop => dStop.run_id === sStop.run_id)
            );

            if (commonRuns.length > 0) {
                console.log('\n⚠️  Found trains that stop at both stations but in wrong order:');
                commonRuns.forEach(sStop => {
                    const dStop = destStops.find(ds => ds.run_id === sStop.run_id);
                    console.log(`   Run ${sStop.run_id}: Source stop ${sStop.stop_order}, Dest stop ${dStop.stop_order}`);
                    if (sStop.stop_order >= dStop.stop_order) {
                        console.log(`   ❌ Source comes AFTER destination (wrong direction)`);
                    }
                });
            }
        } else {
            console.log(`✅ Found ${validRuns.length} valid train(s):\n`);
            validRuns.forEach((run, index) => {
                console.log(`${(index + 1).toString().padStart(3)}. ${run.train_name || 'Unknown Train'}`);
                console.log(`     Run ID: ${run.run_id}`);
                console.log(`     Route: Stop ${run.source_stop_order} → Stop ${run.dest_stop_order}`);
                console.log(`     Time: ${run.departure_time || 'N/A'} → ${run.arrival_time || 'N/A'}`);
                console.log('');
            });
        }

        console.log('='.repeat(70));
        console.log('✅ Debug complete!\n');

    } catch (error) {
        console.error('❌ Error during debug:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

// Get station names from command line arguments
const sourceStation = process.argv[2];
const destStation = process.argv[3];

debugTrainSearch(sourceStation, destStation);
