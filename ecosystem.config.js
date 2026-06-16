module.exports = {
    apps: [
        {
            name: "dropeat-api",
            script: "src/index.js",
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            env: {
                NODE_ENV: "production",
                PORT: "8000",
                // Set GOOGLE_MAPS_API_KEY in server .env — see deploy/GOOGLE_MAPS_SETUP.md
            },
        },
    ],
};
