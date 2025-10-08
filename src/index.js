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
