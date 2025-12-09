// Test semantic search endpoint
const testSearch = async () => {
    try {
        const token = localStorage.getItem('token');
        console.log('Testing semantic search with token:', token ? 'Present' : 'Missing');

        const response = await fetch('http://localhost:8080/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: 'test search',
                topK: 5
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log('Response data:', data);

        if (data.results) {
            console.log('✅ Search endpoint working! Found', data.results.length, 'results');
        } else {
            console.log('⚠️ Search endpoint returned no results');
        }
    } catch (error) {
        console.error('❌ Search endpoint error:', error);
    }
};

// Run the test
testSearch();
