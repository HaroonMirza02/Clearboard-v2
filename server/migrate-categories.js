require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage({
    keyFilename: process.env.GCS_KEY_FILE,
    projectId: process.env.GCS_PROJECT_ID
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
const META_GCS_KEY = 'metadata/filemeta.json';

// New category mappings - ONLY these categories are allowed
const NEW_CATEGORIES = {
    'Software Development': ['WebDev Assets', 'General Research', 'Project Demo', 'Source Code'],
    'Business Development': ['Websites', 'Software', 'Dashboards', 'Financial Research', 'Company Research', 'Graphic Design', 'Storage'],
    'Data and Research Analyst': ['WebDev Assets', 'General Research', 'Project Demo', 'Source Code']
};

// All allowed categories (flattened)
const ALL_NEW_CATEGORIES = [...new Set([
    ...NEW_CATEGORIES['Software Development'],
    ...NEW_CATEGORIES['Business Development'],
    ...NEW_CATEGORIES['Data and Research Analyst']
])];

// Keyword-based mapping for intelligent categorization
const KEYWORD_MAPPING = {
    'WebDev Assets': ['web', 'html', 'css', 'javascript', 'react', 'vue', 'angular', 'frontend', 'ui', 'ux', 'design', 'template', 'bootstrap', 'tailwind'],
    'General Research': ['research', 'study', 'analysis', 'report', 'documentation', 'doc', 'tech', 'cloud', 'aws', 'azure', 'gcp', 'google', 'technical'],
    'Project Demo': ['demo', 'presentation', 'showcase', 'example', 'sample', 'prototype', 'mockup', 'ppt', 'slides'],
    'Source Code': ['code', 'src', 'script', 'program', 'app', 'application', 'function', 'class', 'module', 'package', 'js', 'py', 'java'],
    'Websites': ['website', 'site', 'web', 'landing', 'page', 'portal', 'domain', 'homepage'],
    'Software': ['software', 'app', 'application', 'tool', 'program', 'system', 'platform', 'service'],
    'Dashboards': ['dashboard', 'analytics', 'metrics', 'kpi', 'chart', 'graph', 'visualization', 'bi', 'tableau', 'powerbi'],
    'Financial Research': ['financial', 'finance', 'budget', 'revenue', 'profit', 'cost', 'market', 'investment', 'roi', 'accounting', 'money'],
    'Company Research': ['company', 'business', 'competitor', 'strategy', 'plan', 'pitch', 'proposal', 'lead', 'client', 'brochure'],
    'Graphic Design': ['design', 'graphic', 'logo', 'brand', 'visual', 'image', 'illustration', 'artwork', 'creative', 'photoshop', 'illustrator'],
    'Storage': ['storage', 'backup', 'archive', 'data', 'file', 'document', 'resource', 'misc', 'other']
};

// Load metadata from GCS
async function loadMeta() {
    try {
        const [exists] = await bucket.file(META_GCS_KEY).exists();
        if (!exists) {
            console.log('No metadata file found. Creating empty metadata.');
            return {};
        }
        const [data] = await bucket.file(META_GCS_KEY).download();
        return JSON.parse(data.toString());
    } catch (err) {
        console.error('Error loading metadata:', err);
        return {};
    }
}

// Save metadata to GCS
async function saveMeta(meta) {
    try {
        await bucket.file(META_GCS_KEY).save(JSON.stringify(meta, null, 2), {
            contentType: 'application/json',
            resumable: false
        });
        console.log('Metadata saved successfully.');
    } catch (err) {
        console.error('Error saving metadata:', err);
        throw err;
    }
}

// Determine best category based on file name using keyword matching
function findBestCategory(fileName) {
    const lowerFileName = (fileName || '').toLowerCase();

    let bestMatch = null;
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(KEYWORD_MAPPING)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lowerFileName.includes(keyword)) {
                score++;
            }
        }
        if (score > maxScore) {
            maxScore = score;
            bestMatch = category;
        }
    }

    // If we found a match, return it
    if (bestMatch && maxScore > 0) {
        return bestMatch;
    }

    // Default fallback based on common patterns
    if (lowerFileName.includes('web') || lowerFileName.includes('site')) {
        return 'Websites';
    }
    if (lowerFileName.includes('code') || lowerFileName.includes('src')) {
        return 'Source Code';
    }
    if (lowerFileName.includes('research') || lowerFileName.includes('study')) {
        return 'General Research';
    }
    if (lowerFileName.includes('design') || lowerFileName.includes('logo')) {
        return 'Graphic Design';
    }

    // Ultimate fallback
    return 'Storage';
}

// Get random category from all new categories
function getRandomCategory() {
    return ALL_NEW_CATEGORIES[Math.floor(Math.random() * ALL_NEW_CATEGORIES.length)];
}

// Main migration function
async function migrateAllCategories() {
    console.log('='.repeat(70));
    console.log('COMPLETE CATEGORY CLEANUP AND MIGRATION');
    console.log('='.repeat(70));
    console.log('');
    console.log('This script will:');
    console.log('  1. Remove ALL old categories');
    console.log('  2. Migrate ALL files to new categories');
    console.log('  3. Use intelligent keyword matching');
    console.log('');

    console.log('Step 1: Loading metadata...');
    const meta = await loadMeta();
    const fileIds = Object.keys(meta);

    if (fileIds.length === 0) {
        console.log('No files found in metadata. Nothing to migrate.');
        return;
    }

    console.log(`Found ${fileIds.length} files to process.`);
    console.log('');

    // Statistics
    const stats = {
        total: fileIds.length,
        migrated: 0,
        keywordMapping: 0,
        randomMapping: 0,
        alreadyCorrect: 0,
        oldCategories: new Set(),
        byNewCategory: {}
    };

    // Initialize new category counters
    ALL_NEW_CATEGORIES.forEach(cat => {
        stats.byNewCategory[cat] = 0;
    });

    console.log('Step 2: Analyzing and migrating files...');
    console.log('');

    for (const fileId of fileIds) {
        const file = meta[fileId];
        const oldCategory = file.category || 'Unknown';
        const fileName = file.displayName || file.baseName || file.originalname || '';

        // Track old category
        if (!ALL_NEW_CATEGORIES.includes(oldCategory)) {
            stats.oldCategories.add(oldCategory);
        }

        // Check if already in a new category
        if (ALL_NEW_CATEGORIES.includes(oldCategory)) {
            stats.alreadyCorrect++;
            stats.byNewCategory[oldCategory]++;
            console.log(`  ✓ ${fileName}`);
            console.log(`    Already in correct category: ${oldCategory}`);
            continue;
        }

        // Find best new category
        let newCategory = findBestCategory(fileName);
        let mappingType = 'Keyword';

        if (!newCategory) {
            newCategory = getRandomCategory();
            mappingType = 'Random';
            stats.randomMapping++;
        } else {
            stats.keywordMapping++;
        }

        // Update the file's category
        meta[fileId].category = newCategory;
        stats.migrated++;
        stats.byNewCategory[newCategory]++;

        console.log(`  ✅ ${fileName}`);
        console.log(`     ${oldCategory} → ${newCategory} (${mappingType})`);
    }

    console.log('');
    console.log('Step 3: Saving updated metadata...');
    await saveMeta(meta);

    console.log('');
    console.log('='.repeat(70));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log('');
    console.log('📊 Statistics:');
    console.log(`  Total Files: ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated}`);
    console.log(`  Already Correct: ${stats.alreadyCorrect}`);
    console.log('');
    console.log('🔄 Mapping Methods:');
    console.log(`  Keyword Matching: ${stats.keywordMapping}`);
    console.log(`  Random Assignment: ${stats.randomMapping}`);
    console.log('');
    console.log('📁 Distribution by New Category:');
    Object.entries(stats.byNewCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
            if (count > 0) {
                const percentage = ((count / stats.total) * 100).toFixed(1);
                console.log(`  ${cat}: ${count} (${percentage}%)`);
            }
        });
    console.log('');
    console.log('🗑️  Old Categories Removed:');
    if (stats.oldCategories.size > 0) {
        Array.from(stats.oldCategories).sort().forEach(cat => {
            console.log(`  - ${cat}`);
        });
    } else {
        console.log('  (None - all files already in new categories)');
    }
    console.log('');
    console.log('✅ All files now use ONLY the new category structure!');
    console.log('');
    console.log('📋 New Categories Available:');
    console.log('');
    console.log('  Software Development:');
    NEW_CATEGORIES['Software Development'].forEach(cat => {
        console.log(`    - ${cat}`);
    });
    console.log('');
    console.log('  Business Development:');
    NEW_CATEGORIES['Business Development'].forEach(cat => {
        console.log(`    - ${cat}`);
    });
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('  1. Refresh your browser');
    console.log('  2. Check the category filters');
    console.log('  3. Verify files are properly categorized');
    console.log('  4. Upload new files using the new categories');
    console.log('');
}

// Run migration
migrateAllCategories()
    .then(() => {
        console.log('Migration script finished successfully.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    });
