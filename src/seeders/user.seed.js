const User = require('../models/user.model');
const {faker} = require('@faker-js/faker');


const createUser = async(numUser) => {
    try {
        const userPromise = []
        for (let i = 0; i < numUser; i++) {
            const tempUser = User.create({
                name:faker.person.fullName(),
                email:faker.internet.email(),
                phoneNumber:faker.string.numeric({ length: 10, exclude: ['0'] }),
                password:faker.internet.password(),
            });
            userPromise.push(tempUser);
        }
        await Promise.all(userPromise);
        console.log(`🌱 users seed created `);

    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

module.exports = {
    createUser
}