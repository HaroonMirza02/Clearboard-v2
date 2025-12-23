const mongoose = require('mongoose');

const metadataSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
});

module.exports = mongoose.model('Metadata', metadataSchema);
