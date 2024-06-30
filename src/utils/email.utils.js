require("dotenv").config();
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

const createGmailClient = () => {
    if (!process.env.EMAIL || !process.env.PASS_KEY) {
        throw new Error(
            "Email or password is not defined in environment variables.",
        );
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASS_KEY,
        },
    });
};

const sendEmail = async (mailId, subject, url) => {
    if (!mailId || !subject || !url) {
        throw new Error(
            "Invalid input parameters. 'mailId', 'subject', and 'url' are required.",
        );
    }

    const gmailClient = createGmailClient();

    try {
        const data = await ejs.renderFile(
            path.join(__dirname, '../views/templates/forgotPasswordEmailTemplate.ejs'),
            { email: mailId, url }
        );

        const mailOptions = {
            from: process.env.EMAIL,
            to: mailId,
            subject: subject,
            html: data,
        };

        const info = await gmailClient.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.response}`);
        return info;
    } catch (error) {
        console.error(`Error sending email: ${error.message}`);
        throw error;
    }
};

module.exports = sendEmail;

// // Example usage
// sendEmail("sakibde01@gmail.com", "test", "https://api.dropeat.in") // email, subject, message
//     .then((data) => console.log(data.response))
//     .catch((error) => console.error(error.message));
