const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const services = [
  { name: 'API Gateway', command: 'npm', args: ['run', 'dev', '--workspace=@wertbot/api-gateway'], color: '\x1b[36m' },
  { name: 'PFM Service', command: 'npm', args: ['run', 'dev', '--workspace=@wertbot/pfm-service'], color: '\x1b[32m' },
  { name: 'AI Service', command: 'npm', args: ['run', 'dev', '--workspace=@wertbot/ai-service'], color: '\x1b[35m' },
  { name: 'Trading Service', command: 'npm', args: ['run', 'dev', '--workspace=@wertbot/trading-service'], color: '\x1b[33m' },
  { name: 'Banking Service', command: 'npm', args: ['run', 'dev', '--workspace=@wertbot/banking-service'], color: '\x1b[34m' },
  { name: 'Web App', command: 'npm', args: ['run', 'dev', '--workspace=@wertbot/web'], color: '\x1b[31m' },
];

console.log('\x1b[1m\x1b[32m🚀 Starting All WertBot Services Concurrently...\x1b[0m\n');

services.forEach((s) => {
  const proc = spawn(s.command, s.args, { cwd: rootDir, shell: true });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${s.color}[${s.name}]\x1b[0m ${line}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.error(`${s.color}[${s.name} ERROR]\x1b[0m ${line}`);
      }
    });
  });

  proc.on('close', (code) => {
    console.log(`${s.color}[${s.name}]\x1b[0m process exited with code ${code}`);
  });
});
