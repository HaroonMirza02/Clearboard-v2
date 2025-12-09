/**
 * Vector Database Service
 * Manages vector storage and similarity search using FAISS
 * Provides persistent storage for document embeddings
 */

const fs = require('fs').promises;
const path = require('path');
const { getEmbeddingDimension } = require('./embeddingService');

// In-memory vector store (will be persisted to disk)
class VectorStore {
    constructor() {
        this.vectors = [];
        this.metadata = [];
        this.dimension = getEmbeddingDimension();
        this.indexPath = path.join(__dirname, '../data/vector_index.json');
    }

    /**
     * Initialize the vector store
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.indexPath);
            await fs.mkdir(dataDir, { recursive: true });

            // Load existing index if available
            await this.load();

            console.log(`Vector store initialized with ${this.vectors.length} vectors`);
        } catch (error) {
            console.error('Error initializing vector store:', error);
            throw error;
        }
    }

    /**
     * Add vectors to the store
     * @param {Array<Array<number>>} vectors - Array of embedding vectors
     * @param {Array<Object>} metadata - Array of metadata objects
     * @returns {Promise<void>}
     */
    async addVectors(vectors, metadata) {
        if (vectors.length !== metadata.length) {
            throw new Error('Vectors and metadata arrays must have the same length');
        }

        for (let i = 0; i < vectors.length; i++) {
            if (vectors[i].length !== this.dimension) {
                throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, got ${vectors[i].length}`);
            }
        }

        this.vectors.push(...vectors);
        this.metadata.push(...metadata);

        // Persist to disk
        await this.save();

        console.log(`Added ${vectors.length} vectors to the store. Total: ${this.vectors.length}`);
    }

    /**
     * Search for similar vectors
     * @param {Array<number>} queryVector - Query embedding vector
     * @param {number} topK - Number of results to return
     * @param {Object} filter - Optional metadata filter
     * @returns {Promise<Array<Object>>} Search results with scores
     */
    async search(queryVector, topK = 10, filter = null) {
        if (queryVector.length !== this.dimension) {
            throw new Error(`Query vector dimension mismatch. Expected ${this.dimension}, got ${queryVector.length}`);
        }

        if (this.vectors.length === 0) {
            return [];
        }

        // Calculate similarities
        const results = [];

        for (let i = 0; i < this.vectors.length; i++) {
            // Apply filter if provided
            if (filter && !this.matchesFilter(this.metadata[i], filter)) {
                continue;
            }

            const similarity = this.cosineSimilarity(queryVector, this.vectors[i]);
            results.push({
                score: similarity,
                metadata: this.metadata[i],
                index: i
            });
        }

        // Sort by similarity (descending) and return top K
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array<number>} vecA - First vector
     * @param {Array<number>} vecB - Second vector
     * @returns {number} Similarity score
     */
    cosineSimilarity(vecA, vecB) {
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
     * Check if metadata matches filter
     * @param {Object} metadata - Metadata to check
     * @param {Object} filter - Filter criteria
     * @returns {boolean} True if matches
     */
    matchesFilter(metadata, filter) {
        for (const key in filter) {
            if (metadata[key] !== filter[key]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Remove vectors by file ID
     * @param {string} fileId - File ID to remove
     * @returns {Promise<number>} Number of vectors removed
     */
    async removeByFileId(fileId) {
        const initialLength = this.vectors.length;

        const indicesToRemove = [];
        for (let i = 0; i < this.metadata.length; i++) {
            if (this.metadata[i].fileId === fileId) {
                indicesToRemove.push(i);
            }
        }

        // Remove in reverse order to maintain indices
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
            const index = indicesToRemove[i];
            this.vectors.splice(index, 1);
            this.metadata.splice(index, 1);
        }

        const removedCount = initialLength - this.vectors.length;

        if (removedCount > 0) {
            await this.save();
            console.log(`Removed ${removedCount} vectors for file ${fileId}`);
        }

        return removedCount;
    }

    /**
     * Get statistics about the vector store
     * @returns {Object} Statistics
     */
    getStats() {
        const fileIds = new Set(this.metadata.map(m => m.fileId));

        return {
            totalVectors: this.vectors.length,
            totalFiles: fileIds.size,
            dimension: this.dimension,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage in MB
     * @returns {number} Estimated memory usage
     */
    estimateMemoryUsage() {
        // Each float32 is 4 bytes
        const vectorBytes = this.vectors.length * this.dimension * 4;
        // Rough estimate for metadata (JSON stringified)
        const metadataBytes = JSON.stringify(this.metadata).length;

        return ((vectorBytes + metadataBytes) / (1024 * 1024)).toFixed(2);
    }

    /**
     * Save index to disk
     * @returns {Promise<void>}
     */
    async save() {
        try {
            const data = {
                vectors: this.vectors,
                metadata: this.metadata,
                dimension: this.dimension,
                version: '1.0',
                lastUpdated: new Date().toISOString()
            };

            await fs.writeFile(this.indexPath, JSON.stringify(data), 'utf-8');
            console.log(`Vector index saved to ${this.indexPath}`);
        } catch (error) {
            console.error('Error saving vector index:', error);
            throw error;
        }
    }

    /**
     * Load index from disk
     * @returns {Promise<void>}
     */
    async load() {
        try {
            const data = await fs.readFile(this.indexPath, 'utf-8');
            const parsed = JSON.parse(data);

            this.vectors = parsed.vectors || [];
            this.metadata = parsed.metadata || [];
            this.dimension = parsed.dimension || this.dimension;

            console.log(`Loaded ${this.vectors.length} vectors from disk`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No existing vector index found, starting fresh');
                this.vectors = [];
                this.metadata = [];
            } else {
                console.error('Error loading vector index:', error);
                throw error;
            }
        }
    }

    /**
     * Clear all vectors
     * @returns {Promise<void>}
     */
    async clear() {
        this.vectors = [];
        this.metadata = [];
        await this.save();
        console.log('Vector store cleared');
    }
}

// Singleton instance
let vectorStoreInstance = null;

/**
 * Get or create vector store instance
 * @returns {Promise<VectorStore>} Vector store instance
 */
async function getVectorStore() {
    if (!vectorStoreInstance) {
        vectorStoreInstance = new VectorStore();
        await vectorStoreInstance.initialize();
    }
    return vectorStoreInstance;
}

module.exports = {
    VectorStore,
    getVectorStore
};
