const mongoose = require('mongoose');
const {DB_NAME} = require('../constant');
const {ApiError} = require('../utils/ApiErrorHandler');

const connectDB = async () =>{
    try {
        const connectionInstance =  await mongoose.connect(`mongodb+srv://dropeat:8XJHQEW0wm0zhdh9@dropeat-db.ghguqnt.mongodb.net/dropeatTest`);
        console.log(`MongoDB connected !! DB HOST:${connectionInstance.connection.host}`);
        console.log(connectionInstance.connection.db.databaseName);
        
    } catch (error) {
        // console.log('MONGODB connection failed',error);
        throw new ApiError(500,`MongoDB connection failed ${error.message}`);
        process.exit(1);
    }
}

module.exports = {
    connectDB
}