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
                console.log("user Connected");
                // console.log(socket.Headers);
                // console.log('====================================');
                // let { userId } = await jwt.verify(
                //     socket.handshake.auth.token,
                //     process.env.JWT_ACCESS_SECRET_KEY,
                // );
                // console.log("User connected", userId);

                // await User.findByIdAndUpdate(
                //     userId,
                //     { $set: { isOnline: true } },
                //     { new: true },
                // ); //update user status to online
                // socket.broadcast.emit("onlineUsers", { user: userId });
                socket.on("disconnect", async () => {
                    // const userId = socket.handshake.auth.token;
                    // await User.findByIdAndUpdate(userId, {
                    //     $set: { isOnline: false },
                    // }); //update user status to offline
                    // socket.broadcast.emit("offlineUsers", { user: userId });
                    console.log('User Disconnected');
                });
            });
        });
    })
    .catch((err) => {
        console.log("MONGODB contention error", err);
    });
