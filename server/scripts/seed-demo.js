const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Company = require('../models/Company');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clearboard';

async function seed() {
    try {
        console.log(`Connecting to MongoDB at ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}...`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const companies = [
            {
                name: 'GlobalCorp Solutions',
                slug: 'globalcorp',
                tenantId: 'GC-001',
                settings: { maxFileSize: 200 * 1024 * 1024 } // 200MB
            },
            {
                name: 'TechStart Innovations',
                slug: 'techstart',
                tenantId: 'TS-001',
                settings: { maxFileSize: 50 * 1024 * 1024 } // 50MB
            }
        ];

        for (const compData of companies) {
            let company = await Company.findOne({ tenantId: compData.tenantId });
            if (!company) {
                company = await Company.create(compData);
                console.log(`Created company: ${company.name}`);
            } else {
                console.log(`Company already exists: ${company.name}`);
            }

            const departments = ['Software Development', 'Business Development', 'Human Resources', 'Operations', 'Finance'];

            const userCount = 30; // Fixed for demo predictability
            console.log(`Ensuring users for ${company.name}...`);

            const passwordHash = await bcrypt.hash('password123', 10);

            for (let i = 0; i < userCount; i++) {
                const role = i === 0 ? 'admin' : (i < 5 ? 'manager' : (i < 20 ? 'contributor' : 'read-only'));
                const dept = departments[Math.floor(Math.random() * departments.length)];
                const userId = `demo_${compData.slug}_${i.toString().padStart(3, '0')}`;

                const existingUser = await User.findOne({ userId });
                if (!existingUser) {
                    await User.create({
                        userId,
                        email: `${userId}@${compData.slug}.io`,
                        password: passwordHash,
                        role,
                        companyId: company._id,
                        department: dept,
                        team: `Team ${String.fromCharCode(65 + Math.floor(i / 5))}`
                    });
                }
            }
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error detail:', err);
        process.exit(1);
    }
}

seed();
