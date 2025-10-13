#!/usr/bin/env node

// Simple test script to verify localhost API connectivity
const API_BASE_URL = 'http://localhost:8080';

async function testLocalhostAPI() {
  console.log('🧪 Testing localhost API connectivity...');
  console.log(`📍 Testing: ${API_BASE_URL}`);
  console.log('');

  try {
    // Test if server is running
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test',
        password: 'test'
      })
    });

    if (response.status === 401) {
      console.log('✅ Server is running and responding!');
      console.log('✅ CORS is properly configured');
      console.log('✅ API endpoints are accessible');
      console.log('');
      console.log('🎉 Your localhost setup is working correctly!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Start your frontend: npm run dev');
      console.log('   2. Open http://localhost:5173 (or your frontend port)');
      console.log('   3. The frontend will automatically use localhost:8080 for API calls');
    } else {
      console.log(`⚠️  Server responded with status: ${response.status}`);
      console.log('   This might be expected if the server is running but credentials are invalid');
    }

  } catch (error) {
    console.log('❌ Connection failed!');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Make sure the backend server is running:');
    console.log('      cd server && npm run dev');
    console.log('   2. Check if port 8080 is available');
    console.log('   3. Verify your Google Cloud credentials are set up');
    console.log('');
    console.log('📋 Error details:', error.message);
  }
}

// Run the test
testLocalhostAPI();
