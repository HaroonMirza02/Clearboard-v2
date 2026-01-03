const User = require('../models/User');

const tenantMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Ensure user has a companyId
        if (!req.user.companyId) {
            // For legacy users or system admins, we might need a default tenant or strict rejection
            const user = await User.findById(req.user.id || req.user._id).populate('companyId');
            if (!user || !user.companyId) {
                return res.status(403).json({ message: 'User does not belong to any company/tenant' });
            }
            req.user.companyId = user.companyId._id;
            req.tenant = user.companyId;
        }

        next();
    } catch (err) {
        console.error('Tenant middleware error:', err);
        res.status(500).json({ message: 'Internal server error during tenant verification' });
    }
};

module.exports = tenantMiddleware;
