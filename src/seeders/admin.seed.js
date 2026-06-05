const Admin = require("../models/admin.model");
const { setAdmin } = require("./utils/logger");

const createAdmin = async (manifest) => {
    const { email, password } = manifest.admin || {
        email: "admin@dropeat.test",
        password: "Admin@12345",
    };
    const mode = manifest.mode || "skip";

    if (mode === "skip") {
        const existing = await Admin.findOne({ email });
        if (existing) {
            console.log(`🌱 Admin already exists: ${email}`);
            setAdmin(email, password);
            return existing;
        }
    } else {
        await Admin.deleteOne({ email });
    }

    const admin = await Admin.create({ email, password });
    setAdmin(email, password);
    console.log(`🌱 Admin created: ${email}`);
    return admin;
};

module.exports = { createAdmin };
