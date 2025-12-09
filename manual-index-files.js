/**
 * Manual File Indexing Script
 * Run this in browser console to manually index uploaded files
 */

const indexAllFiles = async () => {
    try {
        console.log('🔍 Fetching all files...');
        const token = localStorage.getItem('token');

        // Get all files
        const filesResponse = await fetch('http://localhost:8080/api/files', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!filesResponse.ok) {
            throw new Error('Failed to fetch files');
        }

        const files = await filesResponse.json();
        console.log(`📁 Found ${files.length} file groups`);

        // Extract all file IDs from all versions
        const fileIds = [];
        files.forEach(fileGroup => {
            if (fileGroup.versions && fileGroup.versions.length > 0) {
                // Index the latest version
                const latestVersion = fileGroup.versions[0];
                fileIds.push({
                    id: latestVersion.id,
                    name: fileGroup.name,
                    filename: fileGroup.originalname || fileGroup.name
                });
            }
        });

        console.log(`📝 Will index ${fileIds.length} files`);

        // Index each file
        let indexed = 0;
        let skipped = 0;
        let failed = 0;

        for (const file of fileIds) {
            console.log(`\n📄 Indexing: ${file.name}...`);

            try {
                const response = await fetch(`http://localhost:8080/api/search/index/${file.id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const result = await response.json();

                if (result.success) {
                    console.log(`  ✅ Success! Indexed ${result.chunksIndexed} chunks`);
                    indexed++;
                } else {
                    console.log(`  ⚠️ Skipped: ${result.message}`);
                    skipped++;
                }
            } catch (error) {
                console.error(`  ❌ Failed: ${error.message}`);
                failed++;
            }

            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Indexing Complete!');
        console.log(`✅ Indexed: ${indexed}`);
        console.log(`⚠️ Skipped: ${skipped}`);
        console.log(`❌ Failed: ${failed}`);
        console.log('='.repeat(50));

        // Get index stats
        console.log('\n📈 Fetching index statistics...');
        const statsResponse = await fetch('http://localhost:8080/api/search/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('📊 Index Stats:', stats);
        }

        console.log('\n🎉 Done! Try searching now!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
};

// Run the indexing
console.log('🚀 Starting manual file indexing...');
indexAllFiles();
