/**
 * Shared CORS allowlist for Express and Socket.IO.
 *
 * Set ALLOWED_ORIGINS in .env as comma-separated URLs, e.g.:
 * ALLOWED_ORIGINS=https://dropeatadmin.techlapse.co.in,https://dropeat.techlapse.co.in
 */

const DEFAULT_ALLOWED_ORIGINS = [
    "https://dropeatadmin.techlapse.co.in",
    "https://dropeat.techlapse.co.in",
    "http://localhost:8100",
    "http://localhost:4200",
    "http://localhost:8000",
    "http://127.0.0.1:8100",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
];

function getAllowedOrigins() {
    const fromEnv = process.env.ALLOWED_ORIGINS;

    if (fromEnv && fromEnv.trim()) {
        return fromEnv
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
    }

    return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * @param {string | undefined} origin
 * @returns {boolean}
 */
function isOriginAllowed(origin) {
    if (!origin) {
        return true;
    }

    const allowed = getAllowedOrigins();

    if (allowed.includes("*")) {
        return true;
    }

    return allowed.includes(origin);
}

/**
 * Express/socket.io origin callback — reflects allowed origins (required for credentials).
 */
function corsOrigin(origin, callback) {
    if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS blocked origin: ${origin}`));
}

const corsOptions = {
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-access-token",
        "x-refresh-token",
    ],
    optionsSuccessStatus: 204,
};

module.exports = {
    getAllowedOrigins,
    isOriginAllowed,
    corsOrigin,
    corsOptions,
};
