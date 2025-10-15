const { getGCSDownloadStream, uploadToGCS } = require('../services/gcs');
const USERS_KEY = 'metadata/users.json';
const META_KEY = 'metadata/filemeta.json';

async function readJsonFromGCS(key) {
  try {
    const stream = getGCSDownloadStream(key);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const data = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 404 || err.message.includes('not found') || err.message.includes('No such object')) {
      return null;
    }
    throw err;
  }
}

async function run() {
  try {
    const meta = await readJsonFromGCS(META_KEY);
    if (!meta) {
      console.log('No filemeta.json found in GCS. Exiting.');
      return;
    }
    const users = (await readJsonFromGCS(USERS_KEY)) || [];

    // Map ownerUserId -> set of categories
    const ownerMap = new Map();
    Object.values(meta).forEach(entry => {
      // filemeta.json may have nested entries; normalize
      const items = Array.isArray(entry) ? entry : [entry];
      items.forEach(f => {
        const owner = f.ownerUserId || f.ownerId || 'unknown';
        const category = f.category || 'Others';
        if (!ownerMap.has(owner)) ownerMap.set(owner, new Set());
        ownerMap.get(owner).add(category);
      });
    });

    // Assign teams based on categories
    const updatedUsers = users.map(u => {
      // do not change hardcoded admin
      if (u.userId === 'AliZakaria') {
        u.team = 'admin';
        u.role = 'admin';
        return u;
      }
      const cats = ownerMap.get(u.userId) || ownerMap.get(u.id) || new Set();
      if (cats.has('BusResearch')) {
        u.team = 'busdev';
      } else if (cats.has('TechResearch')) {
        u.team = 'softdev';
      } else {
        // default to softdev to preserve previous behavior
        u.team = u.team || 'softdev';
      }
      return u;
    });

    // For any owners present in meta but not in users list, create a lightweight user entry
    for (const [owner, cats] of ownerMap.entries()) {
      const exists = updatedUsers.some(u => u.userId === owner || u.id === owner);
      if (!exists) {
        let team = 'softdev';
        if (cats.has('BusResearch')) team = 'busdev';
        const newUser = { userId: owner, id: 'legacy-' + owner, password: '', email: null, role: 'user', team, createdAt: new Date().toISOString() };
        updatedUsers.push(newUser);
      }
    }

    // Upload updated users.json back to GCS
    const jsonString = JSON.stringify(updatedUsers, null, 2);
    await uploadToGCS(USERS_KEY, Buffer.from(jsonString, 'utf8'), 'application/json');
    console.log('Updated users.json uploaded to GCS');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
