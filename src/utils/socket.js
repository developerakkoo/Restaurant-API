let io;

module.exports = {
    init: (httpServer) => {
        io = require("socket.io")(httpServer, {
            cors: {
                origins: [
                   
                    "*"
                ],
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                credentials: false,
            },
            transports: ['websocket', 'polling'],
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
