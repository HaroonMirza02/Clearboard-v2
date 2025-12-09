# 🎯 Semantic Search Extension - Implementation Plan

## Overview
Extending the existing semantic search to support PowerPoint (PPT/PPTX) and Image files (PNG, JPEG, GIF) with category-based filtering.

## 📦 New Dependencies

### PowerPoint Processing
- `pptx-parser` - Extract text from PPTX files
- Alternative: `officegen-pptx` for PPT parsing

### Image Processing
- `tesseract.js` - OCR for text extraction from images
- `sharp` - Image processing and thumbnail generation
- `@xenova/transformers` (already installed) - For CLIP image embeddings

## 🏗️ Architecture Changes

### 1. Document Processor Extension

**New Functions**:
```javascript
// Extract text from PowerPoint
async function extractTextFromPPT(buffer)
  - Parse PPTX file
  - Extract text from each slide
  - Return array of { slideNumber, text, notes }

// Extract text from images using OCR
async function extractTextFromImage(buffer)
  - Run OCR on image
  - Extract text content
  - Return extracted text

// Generate image embeddings
async function generateImageEmbedding(buffer)
  - Use CLIP model
  - Generate visual embeddings
  - Return 512-dim vector
```

**Supported Formats**:
- `.ppt`, `.pptx` - PowerPoint
- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` - Images

### 2. Embedding Service Extension

**New Functions**:
```javascript
// Generate embeddings for PPT slides
async function generateSlideEmbeddings(slides)
  - Process each slide text
  - Generate text embeddings
  - Return array of embeddings

// Generate image embeddings using CLIP
async function generateImageEmbedding(imageBuffer)
  - Load CLIP model
  - Process image
  - Generate visual embedding
  - Return embedding vector
```

**Models**:
- Text: `all-MiniLM-L6-v2` (384-dim) - Already in use
- Images: `clip-vit-base-patch32` (512-dim) - New

### 3. Vector Store Extension

**Enhanced Metadata**:
```javascript
{
  fileId: string,
  filename: string,
  fileType: 'text' | 'ppt' | 'image',
  category: string,
  
  // For PPT
  slideNumber?: number,
  slideText?: string,
  
  // For images
  hasText?: boolean,
  ocrText?: string,
  thumbnailUrl?: string,
  
  // Common
  embedding: number[],
  uploadedAt: Date,
  ownerUserId: string
}
```

**Search Filtering**:
- Filter by category
- Filter by file type
- Combine text and image results

### 4. Semantic Search Service Extension

**New Functions**:
```javascript
// Index PowerPoint file
async function indexPowerPoint(fileId, buffer, metadata)
  - Extract slides
  - Generate embeddings per slide
  - Store with slide metadata

// Index Image file
async function indexImage(fileId, buffer, metadata)
  - Try OCR extraction
  - Generate image embedding
  - Store both if text found

// Search with category filter
async function searchDocuments(query, options)
  - options.category - Filter by category
  - options.fileType - Filter by type
  - Return mixed results (text, ppt, images)
```

## 🎨 Frontend Changes

### 1. SemanticSearchBar Component

**New Props**:
```javascript
{
  category?: string,  // Filter by category
  showOnlyWhenCategorySelected?: boolean,
  onResults: (results) => void,
  onResultClick: (result) => void
}
```

**Result Display**:
```javascript
// For text documents
<div className="result-text">
  <FileText icon />
  <span>{filename}</span>
  <span>{snippet}</span>
</div>

// For PPT slides
<div className="result-ppt">
  <Presentation icon />
  <span>{filename} - Slide {slideNumber}</span>
  <span>{slideText preview}</span>
</div>

// For images
<div className="result-image">
  <Image icon />
  <img src={thumbnailUrl} />
  <span>{filename}</span>
  {ocrText && <span>{ocrText preview}</span>}
</div>
```

### 2. FileList Integration

**Conditional Rendering**:
```javascript
{filterCategory && (
  <SemanticSearchBar
    category={filterCategory}
    onResults={handleSemanticSearchResults}
    placeholder={`Search in ${filterCategory}...`}
  />
)}
```

**Result Handling**:
```javascript
// Handle different result types
const handleResultClick = (result) => {
  switch(result.fileType) {
    case 'text':
    case 'ppt':
      downloadFile(result.fileId);
      break;
    case 'image':
      previewImage(result.fileId);
      break;
  }
};
```

## 🔄 API Changes

### Enhanced Endpoints

**POST /api/search**
```javascript
Request:
{
  query: string,
  topK?: number,
  category?: string,      // NEW: Filter by category
  fileType?: string[]     // NEW: Filter by type ['text', 'ppt', 'image']
}

Response:
{
  success: true,
  query: string,
  results: [
    {
      fileId: string,
      filename: string,
      fileType: 'text' | 'ppt' | 'image',
      category: string,
      score: number,
      
      // Type-specific fields
      snippet?: string,           // For text
      slideNumber?: number,       // For PPT
      slideText?: string,         // For PPT
      thumbnailUrl?: string,      // For images
      ocrText?: string,          // For images
      
      // Common metadata
      ownerUserId: string,
      uploadedAt: Date,
      size: number
    }
  ],
  totalResults: number,
  searchTime: number
}
```

**POST /api/search/index/:fileId**
- Auto-detect file type
- Route to appropriate indexer
- Handle PPT slides and images

## 📊 Implementation Steps

### Phase 1: PowerPoint Support (Priority 1)
1. ✅ Install `pptx-parser`
2. ⏳ Extend `documentProcessor.js`
3. ⏳ Add slide extraction
4. ⏳ Generate embeddings per slide
5. ⏳ Update vector store
6. ⏳ Test with sample PPTX

### Phase 2: Image Support (Priority 2)
1. ✅ Install `tesseract.js` and `sharp`
2. ⏳ Add OCR extraction
3. ⏳ Add CLIP model integration
4. ⏳ Generate image embeddings
5. ⏳ Create thumbnails
6. ⏳ Test with sample images

### Phase 3: Category Filtering (Priority 1)
1. ⏳ Add category prop to SemanticSearchBar
2. ⏳ Conditional rendering in FileList
3. ⏳ Filter search results by category
4. ⏳ Update API to accept category filter

### Phase 4: Frontend Enhancement (Priority 2)
1. ⏳ Update result display for PPT
2. ⏳ Update result display for images
3. ⏳ Add thumbnails for images
4. ⏳ Add slide navigation for PPT
5. ⏳ Update CSS for new result types

## 🎯 Expected Behavior

### Scenario 1: User Selects "WebDev Assets" Category
```
1. User selects "WebDev Assets" from category dropdown
2. Semantic search bar appears below category filter
3. User types "React components"
4. Search returns:
   - Text docs about React
   - PPT slides mentioning components
   - Images with React diagrams (if OCR finds "React")
5. All results are from "WebDev Assets" category only
```

### Scenario 2: User Searches for "database schema"
```
1. Search bar active with category selected
2. User types "database schema"
3. Results show:
   - PDF documents about databases
   - PPT slides with schema diagrams
   - Images of ER diagrams (via OCR or visual similarity)
4. Click PPT result → Opens file at specific slide
5. Click image → Shows preview modal
```

## 🔒 Security & Performance

### Security
- Validate file types before processing
- Sanitize OCR text output
- Limit image processing size (max 10MB)
- Rate limit search requests

### Performance
- Cache CLIP model in memory
- Generate thumbnails asynchronously
- Batch process multiple slides
- Index images in background
- Limit OCR to reasonable image sizes

### Storage
- Store thumbnails in GCS
- Cache embeddings in vector store
- Compress slide text
- Optimize image embeddings

## 📝 Testing Plan

### Test Cases

**PowerPoint**:
1. Upload PPTX with 10 slides
2. Search for content from slide 5
3. Verify slide number in results
4. Click result → Downloads file

**Images**:
1. Upload PNG with text
2. Upload JPEG without text
3. Search for text in image
4. Search for visual content
5. Verify thumbnails display

**Category Filtering**:
1. Select category
2. Search bar appears
3. Upload files to different categories
4. Search only returns files from selected category
5. Clear category → Search bar hides

## 🚀 Deployment Checklist

- [ ] Install all dependencies
- [ ] Update documentProcessor.js
- [ ] Update embeddingService.js
- [ ] Update vectorStore.js
- [ ] Update semanticSearch.js
- [ ] Update server.js API endpoints
- [ ] Update SemanticSearchBar.jsx
- [ ] Update FileList.jsx
- [ ] Add CSS for new result types
- [ ] Test with sample files
- [ ] Update documentation
- [ ] Performance testing
- [ ] Deploy to production

## 📚 Documentation Updates

- [ ] Update SEMANTIC_SEARCH_GUIDE.md
- [ ] Add PPT_IMAGE_SEARCH.md
- [ ] Update API documentation
- [ ] Add usage examples
- [ ] Create troubleshooting guide

---

**Estimated Implementation Time**: 4-6 hours
**Complexity**: High
**Priority**: Medium-High
**Dependencies**: pptx-parser, tesseract.js, sharp, CLIP model

**Status**: 🟡 In Progress
