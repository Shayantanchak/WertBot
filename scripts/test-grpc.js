const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load proto definitions
const transactionProtoPath = path.join(__dirname, '../libs/proto/transaction.proto');
const aiProtoPath = path.join(__dirname, '../libs/proto/ai.proto');

function loadProto(protoPath, packageName, serviceName) {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  
  // Resolve package path
  const packageParts = packageName.split('.');
  let resolved = protoDescriptor;
  for (const part of packageParts) {
    resolved = resolved[part];
  }
  return resolved[serviceName];
}

async function run() {
  console.log('=== gRPC Integration Verification ===');
  
  // 1. Load services
  const TransactionService = loadProto(transactionProtoPath, 'wertbot.transaction', 'TransactionService');
  const AiService = loadProto(aiProtoPath, 'wertbot.ai', 'AiService');

  // 2. Start mock servers
  const server = new grpc.Server();
  
  // Implement TransactionService mock using exact casing from proto definitions (PascalCase + snake_case fields)
  server.addService(TransactionService.service, {
    ListTransactions: (call, callback) => {
      console.log('Server received ListTransactions call for user_id:', call.request.user_id);
      callback(null, {
        transactions: [
          {
            transaction_id: 't-123',
            user_id: call.request.user_id || 'user-alex',
            account_id: 'acc-1',
            amount_minor: 2500,
            currency: 'USD',
            merchant_name: 'Mock Merchant',
            category: 'Groceries',
            transaction_date: Date.now(),
            status: 'COMPLETED',
            type: 'DEBIT',
          }
        ],
        total: 1,
        has_next: false,
      });
    },
    GetCardRecommendation: (call, callback) => {
      console.log('Server received GetCardRecommendation call for MCC:', call.request.merchant_mcc);
      callback(null, {
        card_id: 'card-amx',
        card_name: 'WertBot Amex Card',
        issuer: 'Amex',
        reward_rate: 4,
        reward_type: 'points',
        reward_program: 'Membership Rewards',
        estimated_reward: 100,
        reasoning: 'Highest reward multiplier (4x) for dining MCC ' + call.request.merchant_mcc,
      });
    }
  });

  // Implement AiService mock using exact casing from proto definitions (PascalCase + snake_case fields)
  server.addService(AiService.service, {
    Chat: (call, callback) => {
      console.log('Server received Chat call:', call.request.user_message);
      callback(null, {
        response: 'Hello! I am WertBot, your AI co-pilot. You said: "' + call.request.user_message + '"',
        tokens_used: 12,
      });
    }
  });

  // Bind and start server
  const port = 50099;
  await new Promise((resolve, reject) => {
    server.bindAsync(`127.0.0.1:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) return reject(err);
      server.start();
      console.log(`\n✅ Mock gRPC Server started on port ${boundPort}`);
      resolve();
    });
  });

  // 3. Start client and verify calls
  console.log('\nConnecting gRPC Clients to mock server...');
  const txClient = new TransactionService(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
  const aiClient = new AiService(`127.0.0.1:${port}`, grpc.credentials.createInsecure());

  // Test TransactionService (using snake_case properties to match proto definitions)
  await new Promise((resolve, reject) => {
    txClient.ListTransactions({ user_id: 'user-alex', page: 1, limit: 10 }, (err, response) => {
      if (err) {
        console.error('❌ ListTransactions failed:', err);
        return reject(err);
      }
      console.log('✅ ListTransactions response received successfully:');
      console.log(JSON.stringify(response, null, 2));
      resolve();
    });
  });

  // Test CardRecommendation (using snake_case properties to match proto definitions)
  await new Promise((resolve, reject) => {
    txClient.GetCardRecommendation({ user_id: 'user-alex', merchant_mcc: '5812', merchant_name: 'Pizza Hut', amount_minor: 2500 }, (err, response) => {
      if (err) {
        console.error('❌ GetCardRecommendation failed:', err);
        return reject(err);
      }
      console.log('✅ GetCardRecommendation response received successfully:');
      console.log(JSON.stringify(response, null, 2));
      resolve();
    });
  });

  // Test AiService (using snake_case properties to match proto definitions)
  await new Promise((resolve, reject) => {
    aiClient.Chat({ user_id: 'user-alex', user_message: 'What is my budget?', context_id: 'session-1' }, (err, response) => {
      if (err) {
        console.error('❌ Chat failed:', err);
        return reject(err);
      }
      console.log('✅ Chat response received successfully:');
      console.log(JSON.stringify(response, null, 2));
      resolve();
    });
  });

  // 4. Clean up
  console.log('\nClosing gRPC connection...');
  txClient.close();
  aiClient.close();
  server.tryShutdown(() => {
    console.log('✅ Mock gRPC Server shut down.');
    console.log('=== gRPC Verification Completed Successfully ===');
  });
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
