const { body, param, query, validationResult } = require("express-validator");
const { validationMessage } = require("../constant");

exports.validateAdminRegister = [
    body("email").notEmpty().withMessage(validationMessage.require),
    body("email")
        .isEmail()
        .withMessage(
            validationMessage.userRegistration.userEmailValidationMessage,
        ),
    body("password").notEmpty().withMessage(validationMessage.require),
    body("password")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
            returnScore: false,
            pointsPerUnique: 1,
            pointsPerRepeat: 0.5,
            pointsForContainingLower: 10,
            pointsForContainingUpper: 10,
            pointsForContainingNumber: 10,
            pointsForContainingSymbol: 10,
        })
        .withMessage(
            validationMessage.userRegistration.userPasswordValidationMessage,
        ),
];

exports.validateAdminLogin = [
    body("email").notEmpty().withMessage(validationMessage.require),
    body("email")
        .isEmail()
        .withMessage(
            validationMessage.userRegistration.userEmailValidationMessage,
        ),
];
