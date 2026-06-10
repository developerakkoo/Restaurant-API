let io;
const { corsOrigin } = require("../config/cors.config");

module.exports = {
    init: (httpServer) => {
        io = require("socket.io")(httpServer, {
            cors: {
                origin: corsOrigin,
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                credentials: true,
                allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "x-access-token",
                    "x-refresh-token",
                ],
            },
            transports: ["websocket", "polling"],
            allowEIO3: true,
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        return io;
    },

    getIO: () => {
        if (!io) {
            throw new Error("Socket not Initialized");
        }

        return io;
    },
};
