const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userDocumentSchema = new Schema(
    {
        userId:{
            type: Schema.Types.ObjectId,
            ref: "deliveryBoy",
            required: true,
        },
        documentType: {
            type: Number,
            required: true,
            enum:[11,22,33,44] //"ADHAR","PAN","LC","Passbook"
        },
        documentNumber: {
            type: String,
            // required: true,
            // default: "_",
        },
        document_url: {
            type: String,
            required: true,
        },
        local_filePath: {
            type: String,
            required: true,
        },
        documentStatus: {
            type: Number,
            required: true,
            default: 0,
            enum:[0,1,2] // pending, approved, rejected
        }
    },
    { timestamps: true },
);


userDocumentSchema.index({ documentNumber: "text" });
module.exports = mongoose.model("userDocument", userDocumentSchema);
