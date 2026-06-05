const Data = require("../models/data.model");
const DeliveryCharges = require("../models/deliveryCharges.model");
const PinCode = require("../models/pincode.model");

const createPlatform = async (manifest) => {
    const platform = manifest.platform || {};
    const mode = manifest.mode || "skip";

    if (mode === "replace") {
        await Data.deleteMany({});
        await DeliveryCharges.deleteMany({});
        await PinCode.deleteMany({});
    }

    let dataDoc = await Data.findOne({});
    if (!dataDoc || mode === "replace") {
        if (dataDoc && mode === "replace") {
            await Data.deleteMany({});
        }
        if (!dataDoc || mode === "replace") {
            dataDoc = await Data.create({
                gstPercentage: platform.gstPercentage ?? 5,
                gstIsActive: platform.gstIsActive ?? true,
                platformFee: platform.platformFee ?? 10,
                deliveryBoyAllowance: platform.deliveryBoyAllowance ?? 50,
                deliveryBoyIncentiveFor16delivery:
                    platform.deliveryBoyIncentiveFor16delivery ?? 100,
                deliveryBoyIncentiveFor21delivery:
                    platform.deliveryBoyIncentiveFor21delivery ?? 200,
            });
        }
    }

    let chargesDoc = await DeliveryCharges.findOne({});
    const dc = platform.deliveryCharges || {};
    if (!chargesDoc || mode === "replace") {
        if (chargesDoc && mode === "replace") {
            await DeliveryCharges.deleteMany({});
        }
        if (!chargesDoc || mode === "replace") {
            chargesDoc = await DeliveryCharges.create({
                range1Price: dc.range1Price ?? 30,
                range1MinKm: dc.range1MinKm ?? 0,
                range1MaxKm: dc.range1MaxKm ?? 3,
                range2Price: dc.range2Price ?? 50,
                range2MinKm: dc.range2MinKm ?? 3,
                range2MaxKm: dc.range2MaxKm ?? 6,
                range3Price: dc.range3Price ?? 80,
                range3MinKm: dc.range3MinKm ?? 6,
                range3MaxKm: dc.range3MaxKm ?? 10,
            });
        }
    }

    const pincodes = manifest.pincodes || [];
    const pinDocs = [];
    for (const pin of pincodes) {
        if (mode === "skip") {
            const existing = await PinCode.findOne({ pincode: pin.pincode });
            if (existing) {
                pinDocs.push(existing);
                continue;
            }
        }
        const doc = await PinCode.create({
            pincode: pin.pincode,
            address: pin.address,
            lat: pin.lat,
            lng: pin.lng,
        });
        pinDocs.push(doc);
    }

    console.log(`🌱 Platform config ready (${pinDocs.length} pincode(s))`);
    return { data: dataDoc, deliveryCharges: chargesDoc, pincodes: pinDocs };
};

module.exports = { createPlatform };
