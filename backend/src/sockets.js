import { Server } from 'socket.io';

let io;

// In-memory locks: key: seatId_date, value: { socketId, expiresAt, source, destination, trainId }
export const activeLocks = new Map();

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
            const { seatIds, date, trainId, source, destination } = data;
            if (!seatIds || seatIds.length === 0 || !date || !trainId) {
                if (callback) callback({ success: false, message: "Missing required lock data." });
                return;
            }

            try {
                // Add to lock map directly (we trust frontend availability constraints)
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
                for (const seatId of seatIds) {
                    const key = `${seatId}_${date}_${socket.id}`;
                    activeLocks.set(key, {
                        seatId,
                        socketId: socket.id,
                        expiresAt,
                        date,
                        trainId,
                        source,
                        destination
                    });
                }

                if (callback) callback({ success: true, message: "Seats locked successfully." });

                // Broadcast
                io.emit("seats-locked", { seatIds, date, trainId, source, destination });

            } catch (error) {
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

    // Background auto-unlock interval
    setInterval(() => {
        try {
            const now = new Date();
            const expiredSeatIds = [];
            let expiredInfo = null;

            for (const [key, lock] of activeLocks.entries()) {
                if (lock.expiresAt < now) {
                    expiredSeatIds.push(lock.seatId);
                    expiredInfo = lock;
                    activeLocks.delete(key);
                }
            }

            if (expiredSeatIds.length > 0 && expiredInfo) {
                io.emit("seats-unlocked", {
                    seatIds: expiredSeatIds,
                    date: expiredInfo.date,
                    trainId: expiredInfo.trainId
                });
            }
        } catch (error) {
            console.error("Error in auto-unlock interval:", error);
        }
    }, 30 * 1000);
};

async function releaseSeatsBySocket(socketId) {
    try {
        const releasedSeatIds = [];
        let releaseInfo = null;

        for (const [key, lock] of activeLocks.entries()) {
            if (lock.socketId === socketId) {
                releasedSeatIds.push(lock.seatId);
                releaseInfo = lock;
                activeLocks.delete(key);
            }
        }

        if (releasedSeatIds.length > 0 && releaseInfo && io) {
            io.emit("seats-unlocked", {
                seatIds: releasedSeatIds,
                date: releaseInfo.date,
                trainId: releaseInfo.trainId
            });
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
