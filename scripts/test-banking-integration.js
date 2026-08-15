const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  console.log('=== Start End-to-End Neobanking Integration Verification ===\n');

  // Start Banking Service on port 3004
  console.log('Starting Banking Service...');
  const bankingProc = spawn('npm', ['run', 'dev', '--workspace=@wertbot/banking-service'], {
    cwd: rootDir,
    shell: true,
    env: { ...process.env, BANKING_SERVICE_PORT: '3004' }
  });

  bankingProc.stdout.on('data', (data) => {
    console.log(`[Banking Service] ${data.toString().trim()}`);
  });
  bankingProc.stderr.on('data', (data) => {
    console.error(`[Banking Service Error] ${data.toString().trim()}`);
  });

  // Start API Gateway on port 3000
  console.log('Starting API Gateway...');
  const gatewayProc = spawn('npm', ['run', 'dev', '--workspace=@wertbot/api-gateway'], {
    cwd: rootDir,
    shell: true,
    env: { ...process.env, API_GATEWAY_PORT: '3000', BANKING_SERVICE_PORT: '3004' }
  });

  gatewayProc.stdout.on('data', (data) => {
    console.log(`[API Gateway] ${data.toString().trim()}`);
  });
  gatewayProc.stderr.on('data', (data) => {
    console.error(`[API Gateway Error] ${data.toString().trim()}`);
  });

  // Wait dynamically for API Gateway to be responsive
  console.log('Waiting for API Gateway to become responsive on port 3000...');
  let ready = false;
  let retries = 60; // 60 seconds
  while (retries > 0) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/v1/health');
      if (res.status === 200 || res.status === 404 || res.status === 500) {
        console.log('API Gateway is now listening and responsive.');
        ready = true;
        break;
      }
    } catch (e) {
      // Server not listening yet
    }
    retries--;
    await sleep(1000);
  }

  if (!ready) {
    console.error('❌ API Gateway failed to become ready on port 3000 within 60 seconds.');
  }

  let passed = true;

  if (ready) {
    try {
      // 1. Verify GET /wallet/balance
      console.log('\n--- 1. Testing GET /wallet/balance ---');
      const balanceRes = await fetch('http://127.0.0.1:3000/api/v1/wallet/balance');
      const balanceJson = await balanceRes.json();
      console.log('Status:', balanceRes.status);
      console.log('Balances received:', balanceJson.data?.balances?.length);
      console.log('Sample balances (USD):', balanceJson.data?.balances?.find(b => b.currency === 'USD'));
      if (!balanceJson.success || !balanceJson.data?.balances || balanceJson.data.balances.length === 0) {
        throw new Error('Failed to fetch wallet balances');
      }
      console.log('✅ GET /wallet/balance test PASSED');

      // 2. Verify POST /wallet/deposit
      console.log('\n--- 2. Testing POST /wallet/deposit ---');
      const depositRes = await fetch('http://127.0.0.1:3000/api/v1/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: 'USD', amount: 1500.50 })
      });
      const depositJson = await depositRes.json();
      console.log('Status:', depositRes.status);
      console.log('Response Message:', depositJson.message || (depositJson.success ? 'Success' : 'Failed'));
      if (!depositJson.success) {
        throw new Error('Failed to deposit funds');
      }
      console.log('✅ POST /wallet/deposit test PASSED');

      // 3. Verify POST /wallet/transfer
      console.log('\n--- 3. Testing POST /wallet/transfer ---');
      const transferRes = await fetch('http://127.0.0.1:3000/api/v1/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName: 'Jane Doe', amount: 500, currency: 'USD' })
      });
      const transferJson = await transferRes.json();
      console.log('Status:', transferRes.status);
      console.log('Response Message:', transferJson.message || (transferJson.success ? 'Success' : 'Failed'));
      if (!transferJson.success) {
        throw new Error('Failed to transfer funds');
      }
      console.log('✅ POST /wallet/transfer test PASSED');

      // 4. Verify POST /wallet/convert
      console.log('\n--- 4. Testing POST /wallet/convert ---');
      const convertRes = await fetch('http://127.0.0.1:3000/api/v1/wallet/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCurrency: 'USD', toCurrency: 'EUR', amount: 1000 })
      });
      const convertJson = await convertRes.json();
      console.log('Status:', convertRes.status);
      console.log('Response FX Rate:', convertJson.rate);
      console.log('Converted Amount (EUR):', convertJson.convertedAmount);
      if (!convertJson.success) {
        throw new Error('Failed to convert currency');
      }
      console.log('✅ POST /wallet/convert test PASSED');

    } catch (err) {
      console.error('❌ Integration Test FAILED:', err.message);
      passed = false;
    }
  } else {
    passed = false;
  }

  console.log('\nShutting down NestJS microservices...');
  // Kill processes
  bankingProc.kill('SIGTERM');
  gatewayProc.kill('SIGTERM');
  await sleep(2000);
  console.log('Cleanup completed.');

  if (passed) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTest();
