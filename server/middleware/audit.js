const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    action: { type: String, required: true }, // 'UPLOAD', 'DOWNLOAD', 'STATUS_CHANGE', 'DELETE', 'LOGIN'
    resourceType: String, // 'FILE', 'USER', 'PROJECT'
    resourceId: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

const logAction = async (req, action, resourceType, resourceId, details = {}) => {
    try {
        await AuditLog.create({
            userId: req.user?._id || req.user?.id,
            username: req.user?.userId || req.user?.username,
            companyId: req.user?.companyId,
            action,
            resourceType,
            resourceId,
            details,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent']
        });
    } catch (err) {
        console.error('Failed to log audit action:', err);
    }
};

module.exports = { AuditLog, logAction };
