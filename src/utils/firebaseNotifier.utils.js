const admin = require("firebase-admin");
const User = require("../models/user.model");
const serviceAccount = require("../../firebase.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const INVALID_TOKEN_CODES = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
]);

const MULTICAST_BATCH_SIZE = 500;

/**
 * @param {Record<string, string>} data - FCM data payload (all values must be strings)
 */
function buildMulticastMessage(tokens, title, body, data = {}) {
    const stringData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value ?? "")]),
    );

    return {
        tokens,
        notification: {
            title,
            body,
        },
        data: {
            title,
            body,
            ...stringData,
        },
        android: {
            priority: "high",
            notification: {
                channelId: "dropeat_orders",
                sound: "default",
            },
        },
    };
}

async function clearInvalidTokens(tokens) {
    if (!tokens.length) {
        return;
    }

    await User.updateMany(
        { firebaseToken: { $in: tokens } },
        { $unset: { firebaseToken: "" } },
    );
}

/**
 * Sends FCM notifications to registration tokens using sendEachForMulticast.
 *
 * @param {string[]} tokens
 * @param {string} title
 * @param {string} body
 * @param {Record<string, string>} [data]
 * @returns {Promise<{ successCount: number, failureCount: number, invalidTokens: string[] }>}
 */
exports.sendFirebaseNotification = async (
    tokens,
    title = "DropEat",
    body = "",
    data = {},
) => {
    const validTokens = (tokens || []).filter(
        (token) => typeof token === "string" && token.trim().length > 0,
    );

    if (validTokens.length === 0) {
        return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];

    try {
        for (let i = 0; i < validTokens.length; i += MULTICAST_BATCH_SIZE) {
            const batch = validTokens.slice(i, i + MULTICAST_BATCH_SIZE);
            const message = buildMulticastMessage(batch, title, body, data);
            const response = await admin.messaging().sendEachForMulticast(message);

            successCount += response.successCount;
            failureCount += response.failureCount;

            response.responses.forEach((result, index) => {
                if (result.success) {
                    return;
                }

                const errorCode = result.error?.code;
                if (errorCode && INVALID_TOKEN_CODES.has(errorCode)) {
                    invalidTokens.push(batch[index]);
                }
            });
        }

        if (invalidTokens.length > 0) {
            await clearInvalidTokens(invalidTokens);
        }

        return { successCount, failureCount, invalidTokens };
    } catch (error) {
        console.error("Error sending notification:", error);
        return {
            successCount,
            failureCount: failureCount + validTokens.length - successCount,
            invalidTokens,
            error: error.message,
        };
    }
};
