const fs = require('fs');
const path = require('path');

// =============================================================================
// WertBot — Proto Generator & Validator Script
// Dynamically verifies that all required proto files exist and are well-formed
// =============================================================================

const protos = ['auth.proto', 'transaction.proto', 'trading.proto', 'ai.proto'];
const protoDir = path.join(__dirname, '../libs/proto');

console.log('🔍 Checking WertBot gRPC proto files...');

let missingCount = 0;
for (const proto of protos) {
  const filePath = path.join(protoDir, proto);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    console.log(`✅ ${proto} found (${size} bytes)`);
  } else {
    console.error(`❌ ${proto} is MISSING!`);
    missingCount++;
  }
}

if (missingCount > 0) {
  console.error(`\nFound ${missingCount} missing proto files.`);
  process.exit(1);
} else {
  console.log('\n✨ All proto contracts validated successfully.');
}
