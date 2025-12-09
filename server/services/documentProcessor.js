/**
 * Document Processing Service
 * Extracts text content from various file formats (PDF, DOCX, TXT)
 * and splits large documents into manageable chunks for embedding generation
 */

const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

/**
 * Extract text from PDF file
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(buffer) {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

/**
 * Extract text from DOCX file
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromDOCX(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

/**
 * Extract text from TXT file
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromTXT(buffer) {
    try {
        return buffer.toString('utf-8');
    } catch (error) {
        console.error('Error extracting text from TXT:', error);
        throw new Error('Failed to extract text from TXT');
    }
}

/**
 * Extract text from file based on extension
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {Promise<string>} Extracted text
 */
async function extractText(buffer, filename) {
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
        case '.pdf':
            return await extractTextFromPDF(buffer);
        case '.docx':
        case '.doc':
            return await extractTextFromDOCX(buffer);
        case '.txt':
            return await extractTextFromTXT(buffer);
        default:
            throw new Error(`Unsupported file format: ${ext}`);
    }
}

/**
 * Split text into chunks of approximately equal size
 * @param {string} text - Text to split
 * @param {number} chunkSize - Target chunk size in words (default: 500)
 * @param {number} overlap - Number of overlapping words between chunks (default: 50)
 * @returns {Array<string>} Array of text chunks
 */
function splitIntoChunks(text, chunkSize = 500, overlap = 50) {
    // Clean and normalize text
    const cleanedText = text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n+/g, ' ')  // Replace newlines with spaces
        .trim();

    const words = cleanedText.split(' ');
    const chunks = [];

    // If text is smaller than chunk size, return as single chunk
    if (words.length <= chunkSize) {
        return [cleanedText];
    }

    // Create overlapping chunks
    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim().length > 0) {
            chunks.push(chunk);
        }

        // Break if we've reached the end
        if (i + chunkSize >= words.length) {
            break;
        }
    }

    return chunks;
}

/**
 * Process a document: extract text and split into chunks
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {Object} options - Processing options
 * @param {number} options.chunkSize - Target chunk size in words
 * @param {number} options.overlap - Overlap between chunks in words
 * @returns {Promise<Object>} Processing result with chunks
 */
async function processDocument(buffer, filename, options = {}) {
    const { chunkSize = 500, overlap = 50 } = options;

    try {
        // Extract text from document
        const text = await extractText(buffer, filename);

        // Split into chunks
        const chunks = splitIntoChunks(text, chunkSize, overlap);

        return {
            success: true,
            filename,
            fullText: text,
            chunks,
            chunkCount: chunks.length,
            wordCount: text.split(/\s+/).length,
            characterCount: text.length
        };
    } catch (error) {
        console.error(`Error processing document ${filename}:`, error);
        return {
            success: false,
            filename,
            error: error.message
        };
    }
}

/**
 * Check if file type is supported for text extraction
 * @param {string} filename - Filename to check
 * @returns {boolean} True if supported
 */
function isSupportedFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.pdf', '.docx', '.doc', '.txt'].includes(ext);
}

module.exports = {
    extractText,
    extractTextFromPDF,
    extractTextFromDOCX,
    extractTextFromTXT,
    splitIntoChunks,
    processDocument,
    isSupportedFileType
};
