/**
 * Semantic Search Service
 * Orchestrates document processing, embedding generation, and vector search
 * Main service for the semantic search feature
 */

const { processDocument, isSupportedFileType } = require('./documentProcessor');
const { generateEmbedding, generateEmbeddingsBatch, initializeEmbeddingModel } = require('./embeddingService');
const { getVectorStore } = require('./vectorStore');

/**
 * Index a document for semantic search
 * @param {Buffer} fileBuffer - File buffer
 * @param {Object} fileMetadata - File metadata
 * @returns {Promise<Object>} Indexing result
 */
async function indexDocument(fileBuffer, fileMetadata) {
    const { fileId, filename, ownerUserId, category, department } = fileMetadata;

    try {
        // Check if file type is supported
        if (!isSupportedFileType(filename)) {
            return {
                success: false,
                fileId,
                message: `File type not supported for semantic search: ${filename}`
            };
        }

        console.log(`[Semantic Search] Indexing document: ${filename} (${fileId})`);

        // Process document: extract text and split into chunks
        const processResult = await processDocument(fileBuffer, filename, {
            chunkSize: 500,
            overlap: 50
        });

        if (!processResult.success) {
            return {
                success: false,
                fileId,
                message: `Failed to process document: ${processResult.error}`
            };
        }

        const { chunks, fullText, wordCount } = processResult;

        // Generate embeddings for all chunks
        console.log(`[Semantic Search] Generating embeddings for ${chunks.length} chunks...`);
        const embeddings = await generateEmbeddingsBatch(chunks);

        // Prepare metadata for each chunk
        const chunkMetadata = chunks.map((chunk, index) => ({
            fileId,
            filename,
            ownerUserId,
            category,
            department,
            chunkIndex: index,
            chunkText: chunk,
            totalChunks: chunks.length,
            wordCount,
            indexedAt: new Date().toISOString()
        }));

        // Add to vector store
        const vectorStore = await getVectorStore();
        await vectorStore.addVectors(embeddings, chunkMetadata);

        console.log(`[Semantic Search] Successfully indexed ${chunks.length} chunks for ${filename}`);

        return {
            success: true,
            fileId,
            filename,
            chunksIndexed: chunks.length,
            wordCount,
            message: 'Document indexed successfully'
        };

    } catch (error) {
        console.error(`[Semantic Search] Error indexing document ${filename}:`, error);
        return {
            success: false,
            fileId,
            message: `Indexing failed: ${error.message}`
        };
    }
}

/**
 * Search for documents using semantic similarity
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
async function searchDocuments(query, options = {}) {
    const {
        topK = 10,
        filter = null,
        minScore = 0.3 // Minimum similarity score threshold
    } = options;

    try {
        console.log(`[Semantic Search] Searching for: "${query}"`);

        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query);

        // Search vector store
        const vectorStore = await getVectorStore();
        const rawResults = await vectorStore.search(queryEmbedding, topK * 2, filter); // Get more results for deduplication

        // Filter by minimum score
        const filteredResults = rawResults.filter(result => result.score >= minScore);

        // Deduplicate by fileId and aggregate scores
        const fileMap = new Map();

        for (const result of filteredResults) {
            const { fileId, filename, ownerUserId, category, department, chunkText, chunkIndex } = result.metadata;

            if (!fileMap.has(fileId)) {
                fileMap.set(fileId, {
                    fileId,
                    filename,
                    ownerUserId,
                    category,
                    department,
                    maxScore: result.score,
                    avgScore: result.score,
                    matchCount: 1,
                    bestMatch: {
                        chunkText,
                        chunkIndex,
                        score: result.score
                    },
                    allMatches: [{
                        chunkText,
                        chunkIndex,
                        score: result.score
                    }]
                });
            } else {
                const existing = fileMap.get(fileId);
                existing.matchCount++;
                existing.avgScore = (existing.avgScore * (existing.matchCount - 1) + result.score) / existing.matchCount;

                if (result.score > existing.maxScore) {
                    existing.maxScore = result.score;
                    existing.bestMatch = {
                        chunkText,
                        chunkIndex,
                        score: result.score
                    };
                }

                existing.allMatches.push({
                    chunkText,
                    chunkIndex,
                    score: result.score
                });
            }
        }

        // Convert to array and sort by max score
        const results = Array.from(fileMap.values())
            .sort((a, b) => b.maxScore - a.maxScore)
            .slice(0, topK);

        // Generate snippets with highlighted matches
        results.forEach(result => {
            result.snippet = generateSnippet(result.bestMatch.chunkText, query);
        });

        console.log(`[Semantic Search] Found ${results.length} relevant documents`);

        return {
            success: true,
            query,
            results,
            totalResults: results.length,
            searchTime: Date.now()
        };

    } catch (error) {
        console.error('[Semantic Search] Search error:', error);
        return {
            success: false,
            query,
            results: [],
            error: error.message
        };
    }
}

/**
 * Generate a snippet from text with query context
 * @param {string} text - Full text
 * @param {string} query - Search query
 * @param {number} maxLength - Maximum snippet length
 * @returns {string} Snippet
 */
function generateSnippet(text, query, maxLength = 200) {
    if (text.length <= maxLength) {
        return text;
    }

    // Try to find query terms in text
    const queryTerms = query.toLowerCase().split(/\s+/);
    const lowerText = text.toLowerCase();

    let bestPosition = 0;
    let maxMatches = 0;

    // Find position with most query term matches
    for (let i = 0; i < text.length - maxLength; i += 50) {
        const window = lowerText.slice(i, i + maxLength);
        const matches = queryTerms.filter(term => window.includes(term)).length;

        if (matches > maxMatches) {
            maxMatches = matches;
            bestPosition = i;
        }
    }

    // Extract snippet around best position
    let snippet = text.slice(bestPosition, bestPosition + maxLength);

    // Clean up snippet boundaries
    if (bestPosition > 0) {
        snippet = '...' + snippet;
    }
    if (bestPosition + maxLength < text.length) {
        snippet = snippet + '...';
    }

    return snippet.trim();
}

/**
 * Remove document from search index
 * @param {string} fileId - File ID to remove
 * @returns {Promise<Object>} Removal result
 */
async function removeDocument(fileId) {
    try {
        console.log(`[Semantic Search] Removing document: ${fileId}`);

        const vectorStore = await getVectorStore();
        const removedCount = await vectorStore.removeByFileId(fileId);

        return {
            success: true,
            fileId,
            chunksRemoved: removedCount,
            message: 'Document removed from search index'
        };

    } catch (error) {
        console.error(`[Semantic Search] Error removing document ${fileId}:`, error);
        return {
            success: false,
            fileId,
            message: `Removal failed: ${error.message}`
        };
    }
}

/**
 * Get search index statistics
 * @returns {Promise<Object>} Statistics
 */
async function getIndexStats() {
    try {
        const vectorStore = await getVectorStore();
        return vectorStore.getStats();
    } catch (error) {
        console.error('[Semantic Search] Error getting stats:', error);
        return {
            error: error.message
        };
    }
}

/**
 * Initialize semantic search service
 * @returns {Promise<void>}
 */
async function initializeSemanticSearch() {
    try {
        console.log('[Semantic Search] Initializing service...');

        // Initialize embedding model
        await initializeEmbeddingModel();

        // Initialize vector store
        await getVectorStore();

        console.log('[Semantic Search] Service initialized successfully');
    } catch (error) {
        console.error('[Semantic Search] Initialization error:', error);
        throw error;
    }
}

module.exports = {
    indexDocument,
    searchDocuments,
    removeDocument,
    getIndexStats,
    initializeSemanticSearch
};
