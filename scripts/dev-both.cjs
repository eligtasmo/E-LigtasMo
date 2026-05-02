const { spawn } = require('node:child_process');
const path = require('node:path');

async function main() {
  const rootDir = process.cwd();
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  const useTunnel = process.argv.includes('--tunnel');

  console.log('🧹 Preparing background services...');
  
  // 1. Start Background Services (Web, API, Proxy)
  const background = spawn(`${npmCmd} run dev:web`, [], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit'
  });

  // Small delay to let background services initialize slightly before Expo takes over
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📱 Starting Interactive Mobile App (Expo Go)...');
  console.log('--- The QR Code and Menu will appear below ---\n');

  // 2. Start Mobile (Expo Go) as the Primary Interactive Process
  const mobile = spawn(`${npmCmd} run ${useTunnel ? 'dev:mobile:tunnel' : 'dev:mobile'}`, [], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit'
  });

  // Cleanup logic
  const cleanup = () => {
    try { background.kill(); } catch (e) {}
    try { mobile.kill(); } catch (e) {}
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  mobile.on('exit', (code) => {
    try { background.kill(); } catch (e) {}
    process.exit(code || 0);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
