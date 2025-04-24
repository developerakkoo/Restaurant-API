require("dotenv").config();
const { app } = require("./app");
const { connectDB } = require("./db/index.db");
const User = require("./models/user.model");
const jwt = require("jsonwebtoken");
const {
    createUser,
    createPartner,
    createDeliveryBoy,
} = require("./seeders/index");
const PORT = process.env.PORT || 8000;
const { generateSeed } = require("./constant");
let server;
connectDB()
    .then(() => {
        server = app.listen(PORT, () => {
            // /*Seeders to create dummy data*/
            // if (generateSeed === true) {
            //     createUser(10);
            //     createPartner(10);
            //     createDeliveryBoy(10);
            // }
            console.log(
                `Server is running at port : ${PORT} in ${process.env.NODE_ENV} environment`,
            );

            console.log(process.env.KEY_ID);
            console.log(process.env.KEY_SECRET);
            console.log(process.env.SESSION_SECRET);

            
            const io = require("./utils/socket").init(server);
            io.on("connection", async (socket) => {
                console.log("User Connected");
                
                try {
                    // Verify the JWT token from the socket handshake
                    const { userId, userType } = await jwt.verify(
                        socket.handshake.auth.token,
                        process.env.JWT_ACCESS_SECRET_KEY
                    );

                    // Update user status to online based on userType
                    let userModel;
                    switch (userType) {
                        case 1: // Admin
                            userModel = require("./models/admin.model");
                            break;
                        case 2: // User
                            userModel = require("./models/user.model");
                            break;
                        case 3: // Delivery Boy
                            userModel = require("./models/deliveryBoy.model");
                            break;
                        case 4: // Partner
                            userModel = require("./models/partner.model");
                            break;
                    }

                    if (userModel) {
                        await userModel.findByIdAndUpdate(
                            userId,
                            { $set: { isOnline: true } },
                            { new: true }
                        );
                        
                        // Broadcast online status to all connected clients
                        socket.broadcast.emit("userStatusChanged", {
                            userId,
                            userType,
                            isOnline: true
                        });
                    }

                    // Handle disconnection
                    socket.on("disconnect", async () => {
                        try {
                            if (userModel) {
                                await userModel.findByIdAndUpdate(
                                    userId,
                                    { $set: { isOnline: false } }
                                );
                                
                                // Broadcast offline status
                                socket.broadcast.emit("userStatusChanged", {
                                    userId,
                                    userType,
                                    isOnline: false
                                });
                            }
                        } catch (error) {
                            console.error("Error updating offline status:", error);
                        }
                        console.log("User Disconnected");
                    });

                } catch (error) {
                    console.error("Socket authentication error:", error);
                    socket.disconnect();
                }
            });
        });
    })
    .catch((err) => {
        console.log("MONGODB connection error", err);
    });
