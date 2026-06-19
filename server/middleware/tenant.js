const User = require('../models/User');

const tenantMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Ensure user has a companyId
        if (!req.user.companyId) {
            // For legacy users or system admins, check if they are in the database
            // Only search if it looks like a valid ObjectId to avoid CastError
            const isValidObjectId = mongoose.Types.ObjectId.isValid(req.user.id || req.user._id);

            if (isValidObjectId) {
                const user = await User.findById(req.user.id || req.user._id).populate('companyId');
                if (user && user.companyId) {
                    req.user.companyId = user.companyId._id;
                    req.tenant = user.companyId;
                } else {
                    return res.status(403).json({ message: 'User does not belong to any company/tenant' });
                }
            } else {
                // If it's a hardcoded user without an ObjectId, we still need a tenant for strict mode.
                // Since the user wants strict mode, we return 403 for them too unless we assign them one.
                return res.status(403).json({ message: 'User does not belong to any company/tenant' });
            }
        }

        next();
    } catch (err) {
        console.error('!!! TENANT MIDDLEWARE ERROR !!!', err);
        res.status(500).json({ message: 'Internal server error during tenant verification', error: err.message, stack: err.stack });
    }
};

module.exports = tenantMiddleware;
