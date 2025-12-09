/**
 * Embedding Service
 * Generates vector embeddings using Hugging Face Transformers
 * Uses the all-MiniLM-L6-v2 model for efficient semantic embeddings
 */

const { pipeline, env } = require('@xenova/transformers');

// Configure transformers to use local cache
env.cacheDir = './.cache';

// Singleton pattern for model loading
let embeddingPipeline = null;
let isInitializing = false;
let initializationPromise = null;

/**
 * Initialize the embedding pipeline
 * @returns {Promise<void>}
 */
async function initializeEmbeddingModel() {
    if (embeddingPipeline) {
        return embeddingPipeline;
    }

    if (isInitializing) {
        return initializationPromise;
    }

    isInitializing = true;
    console.log('Initializing embedding model (all-MiniLM-L6-v2)...');

    initializationPromise = (async () => {
        try {
            // Load the feature extraction pipeline with the MiniLM model
            embeddingPipeline = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2',
                {
                    quantized: true, // Use quantized model for better performance
                }
            );

            console.log('Embedding model initialized successfully');
            isInitializing = false;
            return embeddingPipeline;
        } catch (error) {
            console.error('Error initializing embedding model:', error);
            isInitializing = false;
            embeddingPipeline = null;
            throw new Error('Failed to initialize embedding model');
        }
    })();

    return initializationPromise;
}

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} Embedding vector
 */
async function generateEmbedding(text) {
    try {
        if (!embeddingPipeline) {
            await initializeEmbeddingModel();
        }

        // Generate embedding
        const output = await embeddingPipeline(text, {
            pooling: 'mean',
            normalize: true
        });

        // Convert to regular array
        const embedding = Array.from(output.data);

        return embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {Array<string>} texts - Array of texts to embed
 * @param {number} batchSize - Batch size for processing (default: 32)
 * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
 */
async function generateEmbeddingsBatch(texts, batchSize = 32) {
    try {
        if (!embeddingPipeline) {
            await initializeEmbeddingModel();
        }

        const embeddings = [];

        // Process in batches to avoid memory issues
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

            const batchPromises = batch.map(text => generateEmbedding(text));
            const batchEmbeddings = await Promise.all(batchPromises);

            embeddings.push(...batchEmbeddings);
        }

        return embeddings;
    } catch (error) {
        console.error('Error generating batch embeddings:', error);
        throw new Error('Failed to generate batch embeddings');
    }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} Cosine similarity score (0-1)
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

/**
 * Get embedding dimension for the current model
 * @returns {number} Embedding dimension (384 for all-MiniLM-L6-v2)
 */
function getEmbeddingDimension() {
    return 384; // all-MiniLM-L6-v2 produces 384-dimensional embeddings
}

/**
 * Warm up the model by generating a test embedding
 * @returns {Promise<void>}
 */
async function warmUpModel() {
    try {
        console.log('Warming up embedding model...');
        await generateEmbedding('This is a test sentence for model warm-up.');
        console.log('Model warm-up complete');
    } catch (error) {
        console.error('Error warming up model:', error);
    }
}

module.exports = {
    initializeEmbeddingModel,
    generateEmbedding,
    generateEmbeddingsBatch,
    cosineSimilarity,
    getEmbeddingDimension,
    warmUpModel
};
