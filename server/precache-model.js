// Pre-cache ML model for semantic search
const { pipeline } = require('@xenova/transformers');

(async () => {
    try {
        console.log('Pre-downloading ML model for semantic search...');
        const model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true
        });
        console.log('✓ ML model cached successfully');
        process.exit(0);
    } catch (error) {
        console.error('⚠ Warning: Could not pre-cache model:', error.message);
        console.error('  Model will be downloaded at runtime instead');
        process.exit(0); // Exit successfully anyway
    }
})();
