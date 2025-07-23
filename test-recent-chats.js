// Test script for recent chats API endpoints
// Run with: node test-recent-chats.js

const BASE_URL = 'http://localhost:3000/api';
const TEST_USER_ID = 'test-user-123';
const TEST_ROOM_ID = 'test-room-456';

async function makeRequest(method, url, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { error: error.message };
  }
}

async function testRecentChatsAPI() {
  console.log('🧪 Testing Recent Chats API...\n');

  // Test 1: GET recent chats (should return empty array initially)
  console.log('1. Testing GET /api/recent-chats/:userId');
  const getResult1 = await makeRequest('GET', `${BASE_URL}/recent-chats/${TEST_USER_ID}`);
  console.log('Response:', getResult1);
  console.log('✅ Should return empty array initially\n');

  // Test 2: POST - Add a recent chat
  console.log('2. Testing POST /api/recent-chats');
  const postData = {
    userId: TEST_USER_ID,
    roomId: TEST_ROOM_ID,
    roomName: 'Test Chat Room'
  };
  const postResult = await makeRequest('POST', `${BASE_URL}/recent-chats`, postData);
  console.log('Response:', postResult);
  console.log('✅ Should return success\n');

  // Test 3: GET recent chats (should now return the added chat)
  console.log('3. Testing GET /api/recent-chats/:userId (after adding)');
  const getResult2 = await makeRequest('GET', `${BASE_URL}/recent-chats/${TEST_USER_ID}`);
  console.log('Response:', getResult2);
  console.log('✅ Should return array with one chat\n');

  // Test 4: PUT - Update the recent chat
  console.log('4. Testing PUT /api/recent-chats/:userId/:roomId');
  const putData = {
    participantCount: 2,
    isActive: true
  };
  const putResult = await makeRequest('PUT', `${BASE_URL}/recent-chats/${TEST_USER_ID}/${TEST_ROOM_ID}`, putData);
  console.log('Response:', putResult);
  console.log('✅ Should return success\n');

  // Test 5: GET recent chats (verify update)
  console.log('5. Testing GET /api/recent-chats/:userId (after update)');
  const getResult3 = await makeRequest('GET', `${BASE_URL}/recent-chats/${TEST_USER_ID}`);
  console.log('Response:', getResult3);
  console.log('✅ Should show updated participant count\n');

  // Test 6: DELETE the recent chat
  console.log('6. Testing DELETE /api/recent-chats/:userId/:roomId');
  const deleteResult = await makeRequest('DELETE', `${BASE_URL}/recent-chats/${TEST_USER_ID}/${TEST_ROOM_ID}`);
  console.log('Response:', deleteResult);
  console.log('✅ Should return success\n');

  // Test 7: GET recent chats (should be empty again)
  console.log('7. Testing GET /api/recent-chats/:userId (after delete)');
  const getResult4 = await makeRequest('GET', `${BASE_URL}/recent-chats/${TEST_USER_ID}`);
  console.log('Response:', getResult4);
  console.log('✅ Should return empty array again\n');

  console.log('🎉 All tests completed!');
}

// Run tests
testRecentChatsAPI().catch(console.error);