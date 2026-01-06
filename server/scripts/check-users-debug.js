const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clearboard';

mongoose.connect(MONGO_URI).then(async () => {
    console.log('Connected to DB');
    const hash = await bcrypt.hash('password123', 10);
    const u = await User.findOneAndUpdate({ userId: 'demo_globalcorp_000' }, { password: hash }, { new: true });
    console.log('Updated user:', u ? u.userId : 'Not Found');
    if (u) console.log('Role:', u.role);
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
