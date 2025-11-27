require("dotenv").config();
const { app } = require("./app");
const { connectDB } = require("./db/index.db");
const User = require("./models/user.model");
const Chat = require("./models/message.model");
const Notification = require("./models/notification.model");
const jwt = require("jsonwebtoken");
const {
    createUser,
    createPartner,
    createDeliveryBoy,
} = require("./seeders/index");
const PORT = process.env.PORT || 8000;
const chatController = require("./controller/message.controller");
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
                  

                    // Yes, this is correct. The code listens for a "partnerJoin" event, logs the data, 
                    // creates a room name using the userId, joins the socket to that room, and logs the action.
                    socket.on("partnerJoin", async (data) => {
                        console.log("Joining partner room:", data["userId"]);
                        const roomId = `${data["userId"]}`;
                        socket.join(`partner_${data["userId"]}`);
                        console.log(`Partner joined room: partner_${roomId}`);
                    });

                    // Delivery boy room joining handler
                    socket.on("deliveryBoyJoin", async (data) => {
                        const { deliveryBoyId } = data;
                        if (!deliveryBoyId) {
                            console.error("deliveryBoyJoin: deliveryBoyId is required");
                            return;
                        }
                        
                        // Convert to string to ensure consistent room naming
                        const deliveryBoyIdStr = deliveryBoyId.toString();
                        const roomName = `deliveryBoy_${deliveryBoyIdStr}`;
                        
                        console.log("📡 Joining delivery boy room:", deliveryBoyIdStr);
                        socket.join(roomName);
                        // Also join the all_delivery_boys room for new order notifications
                        socket.join("all_delivery_boys");
                        console.log(`✅ Delivery boy ${deliveryBoyIdStr} joined room: ${roomName} and all_delivery_boys`);
                        
                        // Verify room was joined
                        const room = io.sockets.adapter.rooms.get(roomName);
                        const roomSize = room ? room.size : 0;
                        console.log(`   Room verification: ${roomName} has ${roomSize} socket(s)`);
                        
                        // Send confirmation back to client
                        socket.emit("deliveryBoyJoined", {
                            deliveryBoyId: deliveryBoyIdStr,
                            room: roomName,
                            timestamp: new Date()
                        });
                    });

                    // Admin dashboard room joining handler
                    socket.on("adminJoin", async (data) => {
                        console.log("Admin joining dashboard");
                        socket.join("admin_dashboard");
                        console.log("Admin joined admin_dashboard room");
                    });

                    // Customer/User room joining handler
                    socket.on("userJoin", async (data) => {
                        const { userId } = data;
                        if (!userId) {
                            console.error("userJoin: userId is required");
                            return;
                        }
                        
                        // Convert to string to ensure consistent room naming
                        const userIdStr = userId.toString();
                        const roomName = `user_${userIdStr}`;
                        
                        console.log("👤 Joining user room:", userIdStr);
                        socket.join(roomName);
                        console.log(`✅ User ${userIdStr} joined room: ${roomName}`);
                        
                        // Verify room was joined
                        const room = io.sockets.adapter.rooms.get(roomName);
                        const roomSize = room ? room.size : 0;
                        console.log(`   Room verification: ${roomName} has ${roomSize} socket(s)`);
                        
                        // Send confirmation back to client
                        socket.emit("userJoined", {
                            userId: userIdStr,
                            room: roomName,
                            timestamp: new Date()
                        });
                    });

                    socket.on("joinChatRoom", async (data) => {
                        console.log("Joining chat room:", data);
                        const roomId = `${data.userId}`;
                        socket.join(roomId);
                        console.log(`${data.isAdmin ? 'Admin' : 'User'} joined room: ${roomId}`);
                       
                    
                    });

                    // Send Message to Chat
                    socket.on('sendMessage',async (data) => {
                        const roomId = `${data.userId}`;
                        const message = {
                            userId: data.userId,
                            adminId: data.adminId,
                            text: data.text,
                            isUser: data.isUser,
                            isRead: false,
                            time: new Date(),
                            orderId: data.orderId || null,
                          };
                      console.log(`Messge :- ${message}`);
                      
                          try {
                            const saved = await Chat.create(message);
                            console.log(`Message Saved`);
                            console.log(saved);
                            
                            
                            io.to(roomId).emit('chatMessage', saved);
                          } catch (err) {
                            console.error('Chat DB save error:', err);
                          }
                    })
                    // Handle disconnection
                    socket.on("disconnect", async () => {
                      
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
