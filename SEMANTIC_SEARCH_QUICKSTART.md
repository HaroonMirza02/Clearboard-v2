# Semantic Search - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Restart the Server

The semantic search service needs to initialize. Restart your backend server:

```bash
cd server
npm start
```

You should see:
```
Initializing semantic search service...
Initializing embedding model (all-MiniLM-L6-v2)...
Embedding model initialized successfully
✓ Semantic search service ready
```

**Note**: First-time initialization downloads the embedding model (~90MB). This may take 1-2 minutes.

### Step 2: Upload Test Documents

Upload the provided test documents through your ClearBoard interface:

1. Navigate to the upload section
2. Upload `server/test-documents/machine_learning_guide.txt`
3. Upload `server/test-documents/web_development_guide.txt`
4. Wait for upload to complete

The files will be automatically indexed in the background. Check server logs for:
```
[Auto-Index] Starting background indexing for machine_learning_guide.txt
[Auto-Index] Successfully indexed machine_learning_guide.txt
```

### Step 3: Test the Search

#### Using the Search Bar Component

Add the search bar to your dashboard:

```jsx
import SemanticSearchBar from './components/SemanticSearchBar';

function Dashboard() {
  const handleResultClick = (result) => {
    console.log('Selected:', result);
    // Download or preview the file
    window.location.href = `/api/files/download/${result.fileId}`;
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <SemanticSearchBar onResultClick={handleResultClick} />
      {/* Rest of your dashboard */}
    </div>
  );
}
```

#### Test Queries

Try these semantic queries:

1. **"neural networks and deep learning"**
   - Should find the machine learning guide
   - Look for chunks about deep learning and neural networks

2. **"building responsive websites"**
   - Should find the web development guide
   - Look for sections on responsive design

3. **"database optimization"**
   - Should find web development guide
   - Look for backend and performance sections

4. **"classification algorithms"**
   - Should find machine learning guide
   - Look for supervised learning section

### Step 4: Verify Results

Good results should have:
- ✅ Relevance score > 70%
- ✅ Highlighted snippets matching your query
- ✅ Correct file metadata (name, owner, category)
- ✅ Fast response time (<100ms)

## 📊 Testing with cURL

### Search Request
```bash
curl -X POST http://localhost:8080/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "machine learning algorithms",
    "topK": 5
  }'
```

### Manual Indexing
```bash
curl -X POST http://localhost:8080/api/search/index/FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Statistics (Admin)
```bash
curl http://localhost:8080/api/search/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🔍 Understanding Search Results

### Result Structure
```json
{
  "fileId": "abc123",
  "filename": "machine_learning_guide.txt",
  "displayName": "Cb_001_HaroonMirza_machine_learning_guide_01_091225",
  "category": "Others",
  "ownerUserId": "HaroonMirza",
  "score": 0.87,  // 87% similarity
  "snippet": "...neural networks with multiple layers...",
  "matchCount": 3,  // 3 chunks matched
  "uploadedAt": "2025-12-09T10:00:00Z",
  "size": 4096,
  "mimetype": "text/plain"
}
```

### Score Interpretation
- **90-100%**: Excellent match, very relevant
- **70-89%**: Good match, relevant content
- **50-69%**: Moderate match, somewhat relevant
- **30-49%**: Weak match, loosely related
- **<30%**: Not shown (filtered out)

## 🎯 Example Use Cases

### 1. Find Research Papers
**Query**: "deep learning computer vision"  
**Expected**: Documents about neural networks, CNNs, image processing

### 2. Find Documentation
**Query**: "API authentication security"  
**Expected**: Documents about REST APIs, JWT, OAuth

### 3. Find Reports
**Query**: "quarterly sales performance"  
**Expected**: Business reports, analytics documents

### 4. Find Tutorials
**Query**: "getting started with React"  
**Expected**: Web development guides, React documentation

## 🐛 Troubleshooting

### No Results Found

**Check**:
1. Are files indexed? Check server logs
2. Is query too specific? Try broader terms
3. Do you have permission to access the files?

**Solution**:
```bash
# Check index stats
curl http://localhost:8080/api/search/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Re-index a file
curl -X POST http://localhost:8080/api/search/index/FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Model Download Fails

**Error**: "Failed to initialize embedding model"

**Solution**:
```bash
# Check internet connection
# Ensure sufficient disk space (need ~200MB)
# Check server logs for specific error

# Manual download
cd server
node -e "require('@xenova/transformers').pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')"
```

### Slow Search Performance

**Check**:
1. How many documents are indexed?
2. Server CPU/memory usage
3. Network latency

**Solution**:
- Reduce `topK` parameter (default 10)
- Add metadata filters
- Upgrade server resources

## 📈 Performance Benchmarks

Expected performance on typical hardware:

| Metric | Value |
|--------|-------|
| Search latency | 20-100ms |
| Indexing speed | 1-2 docs/sec |
| Memory per doc | ~0.05 MB |
| Max documents | 10,000+ |
| Concurrent users | 50+ |

## 🔄 Next Steps

1. **Integrate into UI**: Add search bar to your main dashboard
2. **Index Existing Files**: Use manual indexing endpoint for old files
3. **Customize Settings**: Adjust chunk size, similarity threshold
4. **Monitor Usage**: Track search queries and popular results
5. **Add Filters**: Implement category/department filters

## 📚 Additional Resources

- Full documentation: `SEMANTIC_SEARCH_GUIDE.md`
- API reference: See "API Endpoints" section in guide
- Component docs: See `SemanticSearchBar.jsx` comments
- Service docs: See `services/semanticSearch.js` comments

## ✅ Verification Checklist

- [ ] Server starts without errors
- [ ] Embedding model downloads successfully
- [ ] Test files upload successfully
- [ ] Files are auto-indexed (check logs)
- [ ] Search returns relevant results
- [ ] Snippets are highlighted correctly
- [ ] Search is fast (<100ms)
- [ ] Results respect user permissions

## 🎉 Success!

If all checks pass, your semantic search is working perfectly!

Try uploading your own documents and searching for them. The more documents you index, the more powerful the search becomes.

---

**Need Help?**
- Check server logs for errors
- Review `SEMANTIC_SEARCH_GUIDE.md` for detailed docs
- Test with provided sample documents first
- Verify authentication tokens are valid

**Version**: 1.0  
**Last Updated**: December 9, 2025
