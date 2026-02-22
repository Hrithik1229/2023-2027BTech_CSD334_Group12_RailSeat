import { Op } from 'sequelize';
import { Server } from 'socket.io';
import sequelize from './config/db.js';
import Seat from './models/seat.model.js';

let io;

export const initSockets = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Or replace with specific frontend URL
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("lock-seats", async (data, callback) => {
            console.log(`Received lock-seats from ${socket.id} with data:`, data);
            const { seatIds } = data;
            if (!seatIds || seatIds.length === 0) {
                if (callback) callback({ success: false, message: "No seat IDs provided." });
                return;
            }

            const transaction = await sequelize.transaction();
            try {
                // Find seats and verify ALL are available
                const seats = await Seat.findAll({
                    where: {
                        seat_id: { [Op.in]: seatIds },
                    },
                    lock: true, // Prevents reading these rows until transaction completes
                    transaction
                });

                const allAvailable = seats.every(s => s.status === 'available');

                if (!allAvailable) {
                    await transaction.rollback();
                    if (callback) callback({ success: false, message: "One or more seats are no longer available." });
                    socket.emit("lock-failed", { message: "One or more seats are no longer available." });
                    return;
                }

                // Update seats
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

                await Seat.update({
                    status: 'locked',
                    locked_by: socket.id,
                    lock_expires_at: expiresAt
                }, {
                    where: {
                        seat_id: { [Op.in]: seatIds },
                        status: 'available' // Double check condition
                    },
                    transaction
                });

                await transaction.commit();

                if (callback) callback({ success: true, message: "Seats locked successfully." });

                // Broadcast
                io.emit("seats-locked", { seatIds });

            } catch (error) {
                await transaction.rollback();
                console.error("Error locking seats:", error);
                if (callback) callback({ success: false, message: "Internal server error." });
            }
        });

        // Release on disconnect
        socket.on("disconnect", async () => {
            console.log(`Socket disconnected: ${socket.id}, Releasing seats...`);
            await releaseSeatsBySocket(socket.id);
        });

        socket.on("cancel-booking", async () => {
            // Explicit release if they cancel but don't disconnect
            await releaseSeatsBySocket(socket.id);
        });
    });

    // Background auto-unlock interval (30 seconds)
    setInterval(async () => {
        try {
            const now = new Date();
            // Find expired locks
            const expiredSeats = await Seat.findAll({
                where: {
                    status: 'locked',
                    lock_expires_at: { [Op.lt]: now }
                },
                attributes: ['seat_id']
            });

            if (expiredSeats.length > 0) {
                const seatIds = expiredSeats.map(s => s.seat_id);
                // Update
                await Seat.update({
                    status: 'available',
                    locked_by: null,
                    lock_expires_at: null
                }, {
                    where: {
                        seat_id: { [Op.in]: seatIds }
                    }
                });

                // Emit
                io.emit("seats-unlocked", { seatIds });
            }
        } catch (error) {
            console.error("Error in auto-unlock interval:", error);
        }
    }, 30 * 1000);
};

async function releaseSeatsBySocket(socketId) {
    try {
        const lockedSeats = await Seat.findAll({
            where: {
                status: 'locked',
                locked_by: socketId
            },
            attributes: ['seat_id']
        });

        if (lockedSeats.length > 0) {
            const seatIds = lockedSeats.map(s => s.seat_id);
            await Seat.update({
                status: 'available',
                locked_by: null,
                lock_expires_at: null
            }, {
                where: {
                    seat_id: { [Op.in]: seatIds }
                }
            });

            if (io) {
                io.emit("seats-unlocked", { seatIds });
            }
        }
    } catch (error) {
        console.error("Error releasing disconnected socket seats:", error);
    }
}

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};
