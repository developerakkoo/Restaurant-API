require("dotenv").config();
const nodemailer = require("nodemailer");
let gmailClient = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS_KEY,
    },
});

const sendEmail = async (mailId, subject, message) => {
    try {
        let mailOptions = {
            from: process.env.EMAIL,
            to: mailId,
            subject: subject,
            text: message,
        };
        const info = await gmailClient.sendMail(mailOptions);
        return info;
    } catch (error) {
        throw error;
    }
};

sendEmail("sakibde01@gmail.com", "test", "1234") // email, subject, message
    .then((data) => console.log(data.response))
    .catch((error) => console.error(error));
