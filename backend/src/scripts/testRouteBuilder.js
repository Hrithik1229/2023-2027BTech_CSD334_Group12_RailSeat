/**
 * Test Script: Route Builder Data Validation
 * 
 * This script tests the route builder endpoint to ensure data is correctly
 * validated and stored in the database.
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

// Test data
const testRoute = {
    stops: [
        {
            station_id: 1,
            arrival_time: null,
            departure_time: '06:00',
            halt_duration: 0,
            distance_from_source: 0
        },
        {
            station_id: 2,
            arrival_time: '07:30',
            departure_time: '07:35',
            halt_duration: 5,
            distance_from_source: 150
        },
        {
            station_id: 3,
            arrival_time: '09:00',
            departure_time: null,
            halt_duration: 0,
            distance_from_source: 300
        }
    ]
};

async function testRouteBuilder(runId) {
    console.log('🧪 Testing Route Builder Data Validation\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Valid route data
        console.log('\n✅ Test 1: Sending valid route data...');
        const response = await fetch(`${API_BASE}/admin/runs/${runId}/route`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testRoute)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✓ Route saved successfully!');
            console.log('Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('✗ Failed to save route');
            console.log('Error:', result.error);
        }

        // Test 2: Verify data in database
        console.log('\n✅ Test 2: Verifying data in database...');
        const verifyResponse = await fetch(`${API_BASE}/trains/runs/${runId}`);
        const runData = await verifyResponse.json();

        if (verifyResponse.ok && runData.stops) {
            console.log('✓ Retrieved route from database');
            console.log(`Found ${runData.stops.length} stops:`);

            runData.stops.forEach((stop, index) => {
                console.log(`\nStop ${index + 1}:`);
                console.log(`  Station: ${stop.station?.name || 'N/A'} (ID: ${stop.station_id})`);
                console.log(`  Arrival: ${stop.arrival_time || 'N/A'}`);
                console.log(`  Departure: ${stop.departure_time || 'N/A'}`);
                console.log(`  Halt Duration: ${stop.halt_duration} minutes`);
                console.log(`  Distance: ${stop.distance_from_source} km`);
                console.log(`  Stop Order: ${stop.stop_order}`);
            });

            // Validate data integrity
            console.log('\n✅ Test 3: Validating data integrity...');
            let allValid = true;

            runData.stops.forEach((stop, index) => {
                const expectedStop = testRoute.stops[index];

                if (stop.station_id !== expectedStop.station_id) {
                    console.log(`✗ Station ID mismatch at stop ${index + 1}`);
                    allValid = false;
                }

                if (stop.halt_duration !== expectedStop.halt_duration) {
                    console.log(`✗ Halt duration mismatch at stop ${index + 1}`);
                    allValid = false;
                }

                if (Math.abs(stop.distance_from_source - expectedStop.distance_from_source) > 0.01) {
                    console.log(`✗ Distance mismatch at stop ${index + 1}`);
                    allValid = false;
                }
            });

            if (allValid) {
                console.log('✓ All data validated successfully!');
            }
        } else {
            console.log('✗ Failed to retrieve route from database');
        }

        // Test 4: Invalid data (less than 2 stops)
        console.log('\n✅ Test 4: Testing validation (less than 2 stops)...');
        const invalidResponse = await fetch(`${API_BASE}/admin/runs/${runId}/route`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stops: [testRoute.stops[0]] })
        });

        const invalidResult = await invalidResponse.json();

        if (!invalidResponse.ok && invalidResult.error) {
            console.log('✓ Validation working correctly');
            console.log('Expected error:', invalidResult.error);
        } else {
            console.log('✗ Validation failed - should have rejected single stop');
        }

        // Test 5: Invalid station ID
        console.log('\n✅ Test 5: Testing validation (invalid station ID)...');
        const invalidStationResponse = await fetch(`${API_BASE}/admin/runs/${runId}/route`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stops: [
                    { ...testRoute.stops[0], station_id: 99999 },
                    testRoute.stops[1]
                ]
            })
        });

        const invalidStationResult = await invalidStationResponse.json();

        if (!invalidStationResponse.ok && invalidStationResult.error) {
            console.log('✓ Station validation working correctly');
            console.log('Expected error:', invalidStationResult.error);
        } else {
            console.log('✗ Station validation failed - should have rejected invalid station');
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 All tests completed!\n');

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error(error.stack);
    }
}

// Get run ID from command line or use default
const runId = process.argv[2] || 1;

console.log(`Testing with run_id: ${runId}`);
console.log(`API Base: ${API_BASE}\n`);

testRouteBuilder(runId);
