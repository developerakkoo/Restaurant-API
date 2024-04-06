const mongoose = require('mongoose');
const {DB_NAME} = require('../constant');
const {ApiError} = require('../utils/ApiErrorHandler');

const connectDB = async () =>{
    try {
        const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB connected !! DB HOST:${connectionInstance.connection.host}`);
    } catch (error) {
        // console.log('MONGODB connection failed',error);
        throw new ApiError(500,`MongoDB connection failed ${error.message}`);
        process.exit(1);
    }
}

module.exports = {
    connectDB
}