// const admin = require("firebase-admin");
// const serviceAccount = require("./stonks-b66d4-be8791d7d5c7.json");

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
// });

// /**
//  * Sends a notification to a list of registration tokens.
//  *
//  * @param {Array<string>} tokens - The list of device registration tokens.
//  * @param {Object} message - The message payload.
//  * @param {Object} options - The notification options.
//  */
// exports.sendNotification = async (tokens) => {
//     if (!tokens || tokens.length === 0) {
//         console.log("No tokens provided for notification.");
//         return;
//     }

//     try {
//         const options = {
//             priority: "high",
//             timeToLive: 60 * 60 * 24,
//         };
//         const message = {
//             notification: {
//                 title: `🛒 Don't Forget Your Items!`,
//                 body: "You have some great items waiting in your cart. Complete your purchase now and enjoy! 🎉",
//                 sound: "default",
//                 image: "https://api.dropeat.in/upload/dropit-logo.jpeg",
//             },
//             data: { key1: "value1", key2: "value2" },
//         };
//         const response = await admin
//             .messaging()
//             .sendToDevice(tokens, message, options);
//         return { msg: "Notification sent successfully", response };
//     } catch (error) {
//         console.error("Error sending notification:", error);
//     }
// };