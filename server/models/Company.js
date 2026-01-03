const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true }, // For URL safety or easy identification
    tenantId: { type: String, required: true, unique: true }, // UUID or short code
    settings: {
        maxUsers: { type: Number, default: 100 },
        allowedFileTypes: [{ type: String }],
        maxFileSize: { type: Number, default: 104857600 }, // 100MB
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema);
