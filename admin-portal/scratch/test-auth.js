import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('==================================================');
  console.log('       RUNNING AUTHENTICATION SECURITY TESTS      ');
  console.log('==================================================\n');

  try {
    // 1. API Security Test (Call /api/admin/* without token)
    console.log('Test 1: Call /api/admin/overview without token...');
    const res1 = await fetch(`${BASE_URL}/api/admin/overview`);
    assert.strictEqual(res1.status, 401, 'Should reject unauthenticated request with 401');
    const json1 = await res1.json();
    assert.strictEqual(json1.success, false);
    assert.ok(json1.error.includes('No token provided'));
    console.log('✅ Test 1 Passed: Unauthenticated request rejected with 401.\n');

    // 2. Obtain Farmer Token
    console.log('Test 2: Authenticate a Farmer account via OTP verification...');
    // We send OTP first to register phone
    await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876543210' })
    });
    // Verify OTP to get token
    const resFarmerAuth = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876543210', token: '123456' })
    });
    assert.strictEqual(resFarmerAuth.status, 200);
    const farmerAuthData = await resFarmerAuth.json();
    const farmerToken = farmerAuthData.data.session.access_token;
    assert.ok(farmerToken, 'Should receive a valid JWT token');
    console.log('✅ Farmer token obtained successfully.\n');

    // 3. API Security Test (Call /api/admin/* using Farmer token)
    console.log('Test 3: Call /api/admin/overview using Farmer token...');
    const res2 = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    assert.strictEqual(res2.status, 403, 'Should reject Farmer access to Admin endpoints with 403');
    const json2 = await res2.json();
    assert.strictEqual(json2.success, false);
    assert.ok(json2.error.includes('Admin access only'));
    console.log('✅ Test 3 Passed: Farmer access to /api/admin/* rejected with 403.\n');

    // 4. Invalid Admin Login (wrong credentials)
    console.log('Test 4: Admin Login with incorrect password...');
    const res4 = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@liv.com', password: 'wrong-password' })
    });
    assert.strictEqual(res4.status, 401, 'Should reject invalid credentials with 401');
    const json4 = await res4.json();
    assert.strictEqual(json4.success, false);
    assert.ok(json4.error.includes('Invalid credentials'));
    console.log('✅ Test 4 Passed: Invalid password rejected with 401.\n');

    // 5. Admin Login with Farmer Account
    console.log('Test 5: Admin Login with Farmer email...');
    const res5 = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'suresh.patel@farm.com', password: 'admin123' })
    });
    assert.strictEqual(res5.status, 403, 'Should reject Farmer login to Admin Portal with 403');
    const json5 = await res5.json();
    assert.strictEqual(json5.success, false);
    assert.ok(json5.error.includes('Admin access required'));
    console.log('✅ Test 5 Passed: Farmer login to Admin Portal rejected with 403.\n');

    // 6. Admin Login with valid credentials
    console.log('Test 6: Admin Login with valid credentials...');
    const res6 = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@liv.com', password: 'admin123' })
    });
    assert.strictEqual(res6.status, 200, 'Should allow valid Admin credentials');
    const json6 = await res6.json();
    assert.strictEqual(json6.success, true);
    const adminToken = json6.data.session.access_token;
    assert.strictEqual(json6.data.profile.role, 'admin');
    console.log('✅ Test 6 Passed: Valid Admin login allowed, token generated.\n');

    // 7. API Security Test (Call /api/admin/* using Admin token)
    console.log('Test 7: Call /api/admin/overview using Admin token...');
    const res7 = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res7.status, 200, 'Should allow Admin access to Admin endpoints');
    const json7 = await res7.json();
    assert.strictEqual(json7.success, true);
    assert.ok(json7.data.farmers, 'Should return Overview dashboard payload');
    console.log('✅ Test 7 Passed: Admin access allowed with valid Admin token.\n');

    console.log('==================================================');
    console.log('      ALL AUTHENTICATION INTEGRITY TESTS PASSED   ');
    console.log('==================================================');
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

runTests();
