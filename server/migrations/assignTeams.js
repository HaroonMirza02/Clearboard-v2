const mongoose = require('mongoose');
const User = require('../models/User');
const File = require('../models/File');
require('dotenv').config();

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all files and group by owner
    const files = await File.find();
    const userFileMap = new Map();

    files.forEach(file => {
      if (!file.ownerId) return;
      
      if (!userFileMap.has(file.ownerId.toString())) {
        userFileMap.set(file.ownerId.toString(), new Set());
      }
      userFileMap.get(file.ownerId.toString()).add(file.category);
    });

    // Update users based on their file categories
    for (const [userId, categories] of userFileMap.entries()) {
      let team = 'softdev'; // default

      if (categories.has('BusResearch')) {
        team = 'busdev';
      } else if (categories.has('TechResearch')) {
        team = 'softdev';
      }

      await User.findByIdAndUpdate(userId, { team });
    }

    // Ensure AliZakaria is admin
    await User.findOneAndUpdate(
      { email: 'AliZakaria' },
      { 
        team: 'admin',
        role: 'admin'
      },
      { upsert: true }
    );

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateUsers();