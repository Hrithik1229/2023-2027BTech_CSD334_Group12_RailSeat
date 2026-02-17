/**
 * Coach Management Utility
 * 
 * This script helps you:
 * 1. View all coaches for a train
 * 2. Delete coaches by ID or coach number
 * 3. Clear all coaches for a train
 */

import { Coach, Seat, sequelize, Train } from '../models/index.js';

async function listCoaches(trainId) {
    console.log('\n🚂 Coaches for Train ID:', trainId);
    console.log('='.repeat(80));

    const train = await Train.findByPk(trainId);
    if (!train) {
        console.log('❌ Train not found!');
        return;
    }

    console.log(`Train: ${train.train_name} (${train.train_number})\n`);

    const coaches = await Coach.findAll({
        where: { train_id: trainId },
        include: [{
            model: Seat,
            as: 'seats',
            attributes: ['seat_id', 'status']
        }],
        order: [['sequence_order', 'ASC']]
    });

    if (coaches.length === 0) {
        console.log('No coaches found for this train.\n');
        return;
    }

    console.log(`Found ${coaches.length} coach(es):\n`);

    coaches.forEach((coach, index) => {
        const availableSeats = coach.seats?.filter(s => s.status === 'available').length || 0;
        const bookedSeats = coach.seats?.filter(s => s.status === 'booked').length || 0;

        console.log(`${(index + 1).toString().padStart(2)}. Coach ID: ${coach.coach_id.toString().padStart(4)} | ` +
            `Number: ${coach.coach_number.padEnd(6)} | ` +
            `Type: ${coach.coach_type.padEnd(4)} | ` +
            `Seq: ${coach.sequence_order.toString().padStart(2)} | ` +
            `Capacity: ${coach.capacity.toString().padStart(3)} | ` +
            `Seats: ${availableSeats} available, ${bookedSeats} booked`);
    });

    console.log('\n' + '='.repeat(80));
}

async function deleteCoach(coachId) {
    console.log(`\n🗑️  Deleting coach ID: ${coachId}`);
    console.log('='.repeat(80));

    const coach = await Coach.findByPk(coachId, {
        include: [{
            model: Seat,
            as: 'seats'
        }]
    });

    if (!coach) {
        console.log('❌ Coach not found!');
        return;
    }

    console.log(`Coach: ${coach.coach_number} (${coach.coach_type})`);
    console.log(`Seats to delete: ${coach.seats?.length || 0}`);

    // Delete seats first
    const deletedSeats = await Seat.destroy({
        where: { coach_id: coachId }
    });

    console.log(`✅ Deleted ${deletedSeats} seats`);

    // Delete coach
    await coach.destroy();
    console.log(`✅ Deleted coach ${coach.coach_number}`);
    console.log('='.repeat(80) + '\n');
}

async function deleteCoachByNumber(trainId, coachNumber) {
    console.log(`\n🗑️  Deleting coach "${coachNumber}" from train ${trainId}`);
    console.log('='.repeat(80));

    const coach = await Coach.findOne({
        where: {
            train_id: trainId,
            coach_number: coachNumber
        },
        include: [{
            model: Seat,
            as: 'seats'
        }]
    });

    if (!coach) {
        console.log(`❌ Coach "${coachNumber}" not found for this train!`);
        return;
    }

    await deleteCoach(coach.coach_id);
}

async function clearAllCoaches(trainId) {
    console.log(`\n🗑️  Clearing ALL coaches for train ${trainId}`);
    console.log('='.repeat(80));

    const coaches = await Coach.findAll({
        where: { train_id: trainId }
    });

    if (coaches.length === 0) {
        console.log('No coaches to delete.');
        return;
    }

    console.log(`Found ${coaches.length} coaches to delete...`);

    for (const coach of coaches) {
        await deleteCoach(coach.coach_id);
    }

    console.log(`✅ Cleared all coaches for train ${trainId}\n`);
}

// Main execution
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

(async () => {
    try {
        if (!command) {
            console.log('\n📋 Coach Management Utility\n');
            console.log('Usage:');
            console.log('  node src/scripts/manageCoaches.js list <trainId>');
            console.log('  node src/scripts/manageCoaches.js delete <coachId>');
            console.log('  node src/scripts/manageCoaches.js delete-by-number <trainId> <coachNumber>');
            console.log('  node src/scripts/manageCoaches.js clear <trainId>');
            console.log('\nExamples:');
            console.log('  node src/scripts/manageCoaches.js list 1');
            console.log('  node src/scripts/manageCoaches.js delete 5');
            console.log('  node src/scripts/manageCoaches.js delete-by-number 1 S1');
            console.log('  node src/scripts/manageCoaches.js clear 1\n');
            return;
        }

        switch (command.toLowerCase()) {
            case 'list':
                if (!arg1) {
                    console.log('❌ Please provide a train ID');
                    console.log('Usage: node src/scripts/manageCoaches.js list <trainId>');
                    return;
                }
                await listCoaches(parseInt(arg1));
                break;

            case 'delete':
                if (!arg1) {
                    console.log('❌ Please provide a coach ID');
                    console.log('Usage: node src/scripts/manageCoaches.js delete <coachId>');
                    return;
                }
                await deleteCoach(parseInt(arg1));
                break;

            case 'delete-by-number':
                if (!arg1 || !arg2) {
                    console.log('❌ Please provide train ID and coach number');
                    console.log('Usage: node src/scripts/manageCoaches.js delete-by-number <trainId> <coachNumber>');
                    return;
                }
                await deleteCoachByNumber(parseInt(arg1), arg2);
                break;

            case 'clear':
                if (!arg1) {
                    console.log('❌ Please provide a train ID');
                    console.log('Usage: node src/scripts/manageCoaches.js clear <trainId>');
                    return;
                }
                await clearAllCoaches(parseInt(arg1));
                break;

            default:
                console.log(`❌ Unknown command: ${command}`);
                console.log('Valid commands: list, delete, delete-by-number, clear');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
})();
