const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const tradingProtoPath = path.join(__dirname, '../libs/proto/trading.proto');

function loadProto(protoPath, packageName, serviceName) {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

  const packageParts = packageName.split('.');
  let resolved = protoDescriptor;
  for (const part of packageParts) {
    resolved = resolved[part];
  }
  return resolved[serviceName];
}

async function run() {
  console.log('=== gRPC TradingService Verification ===');

  // 1. Load TradingService definition
  const TradingService = loadProto(tradingProtoPath, 'wertbot.trading', 'TradingService');

  // 2. Start Mock gRPC Trading Server
  const server = new grpc.Server();

  server.addService(TradingService.service, {
    PlaceOrder: (call, callback) => {
      console.log('Server received PlaceOrder:', call.request.symbol, call.request.side, call.request.quantity_minor);
      callback(null, {
        order_id: 'ord-test-999',
        user_id: call.request.user_id || 'user-alex',
        symbol: call.request.symbol,
        side: call.request.side,
        order_type: call.request.order_type,
        status: 'FILLED',
        exchange: call.request.exchange || 'binance',
        quantity_minor: call.request.quantity_minor,
        filled_quantity_minor: call.request.quantity_minor,
        avg_fill_price: '67240.00',
        fee_minor: 50,
        fee_currency: 'USD',
        placed_at: Date.now(),
        filled_at: Date.now() + 15,
      });
    },

    GetPortfolio: (call, callback) => {
      console.log('Server received GetPortfolio for user_id:', call.request.user_id);
      callback(null, {
        user_id: call.request.user_id,
        holdings: [
          {
            symbol: 'BTC/USDT',
            asset_class: 'CRYPTO',
            quantity: '0.5000',
            avg_cost: '65800.00',
            current_price: '67240.00',
            market_value: '33620.00',
            unrealized_pnl: 720.0,
            unrealized_pnl_pct: 2.19,
          },
        ],
        total_value: '33620.00',
        total_unrealized_pnl: 720.0,
        total_realized_pnl: 1450.5,
      });
    },

    GetPricePrediction: (call, callback) => {
      console.log('Server received GetPricePrediction for symbol:', call.request.symbol);
      callback(null, {
        symbol: call.request.symbol,
        direction: 'LONG',
        confidence: 84.5,
        target_price: '69391.68',
        stop_loss: '66231.40',
        reasoning: 'Oversold RSI with Bullish MACD Crossover',
        generated_at: Date.now(),
        rsi: 28.4,
        macd_signal: 'Bullish Crossover',
      });
    },

    ListOrders: (call, callback) => {
      console.log('Server received ListOrders for user_id:', call.request.user_id);
      callback(null, {
        orders: [],
        total: 0,
        has_next: false,
      });
    },

    CancelOrder: (call, callback) => {
      console.log('Server received CancelOrder for order_id:', call.request.order_id);
      callback(null, {
        order_id: call.request.order_id,
        user_id: call.request.user_id,
        status: 'CANCELLED',
      });
    },
  });

  const port = 50098;
  await new Promise((resolve, reject) => {
    server.bindAsync(`127.0.0.1:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) return reject(err);
      server.start();
      console.log(`\n✅ Mock gRPC Trading Server started on port ${boundPort}`);
      resolve();
    });
  });

  // 3. Connect gRPC Client & Perform RPC Calls
  console.log('\nConnecting Trading gRPC Client to mock server...');
  const client = new TradingService(`127.0.0.1:${port}`, grpc.credentials.createInsecure());

  // Test PlaceOrder
  await new Promise((resolve, reject) => {
    client.PlaceOrder(
      {
        user_id: 'user-alex',
        symbol: 'BTC/USDT',
        asset_class: 'CRYPTO',
        side: 'BUY',
        order_type: 'MARKET',
        exchange: 'binance',
        quantity_minor: 5000,
      },
      (err, response) => {
        if (err) return reject(err);
        console.log('✅ PlaceOrder response received successfully:');
        console.log(JSON.stringify(response, null, 2));
        resolve();
      },
    );
  });

  // Test GetPortfolio
  await new Promise((resolve, reject) => {
    client.GetPortfolio({ user_id: 'user-alex' }, (err, response) => {
      if (err) return reject(err);
      console.log('✅ GetPortfolio response received successfully:');
      console.log(JSON.stringify(response, null, 2));
      resolve();
    });
  });

  // Test GetPricePrediction
  await new Promise((resolve, reject) => {
    client.GetPricePrediction({ symbol: 'BTC/USDT', asset_class: 'CRYPTO', timeframe: '1h' }, (err, response) => {
      if (err) return reject(err);
      console.log('✅ GetPricePrediction response received successfully:');
      console.log(JSON.stringify(response, null, 2));
      resolve();
    });
  });

  // 4. Clean up
  console.log('\nClosing gRPC connection...');
  client.close();
  server.tryShutdown(() => {
    console.log('✅ Mock gRPC Trading Server shut down.');
    console.log('=== gRPC Trading Verification Completed Successfully ===');
  });
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
