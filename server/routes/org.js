const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

/**
 * GET /api/org/users
 * Get all users belonging to the same company as the requester.
 * Only Admins can see the list.
 */
router.get('/users', [auth, tenant], async (req, res, next) => {
    try {
        console.log(`[ORG] Fetching users for requester: ${req.user._id} (${req.user.role})`);
        console.log(`[ORG] Company ID: ${req.user.companyId}`);

        if (req.user.role !== 'admin') {
            console.log(`[ORG] Access denied. User is not admin.`);
            return res.status(403).json({ message: 'Only admins can view organization users' });
        }

        if (!req.user.companyId) {
            console.log(`[ORG] Company ID missing for admin.`);
            return res.status(400).json({ message: 'Company context missing' });
        }

        const users = await User.find({ companyId: req.user.companyId })
            .select('-password')
            .sort({ createdAt: -1 });

        console.log(`[ORG] Found ${users.length} users for company ${req.user.companyId}`);

        res.json(users);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/org/update-role
 * Update the role of a user within the same company.
 * Only Admins can update roles.
 */
router.post('/update-role', [auth, tenant], async (req, res, next) => {
    try {
        const { targetUserId, role } = req.body;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can update roles' });
        }

        if (!['admin', 'manager', 'contributor', 'read-only'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findOne({ _id: targetUserId, companyId: req.user.companyId });
        if (!user) {
            return res.status(404).json({ message: 'User not found in your organization' });
        }

        // Prevent removing the last admin? (Optional safety)

        user.role = role;
        await user.save();

        const { logAction } = require('../middleware/audit');
        logAction(req, 'ROLE_UPDATE', 'USER', targetUserId, { newRole: role });

        res.json({ message: 'User role updated successfully', role: user.role });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
