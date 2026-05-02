const { spawn } = require('child_process');
const path = require('path');

const mobileDir = path.join(__dirname, '..', 'mobile-app');
const useTunnel = process.argv.includes('--tunnel');

const env = {
  ...process.env,
  CI: '0', // Explicitly disable CI mode with a valid boolean-like string
  EXPO_USE_DEV_CLIENT: '0',
  EXPO_HOME: path.join(mobileDir, '.expo-home'),
  XDG_CACHE_HOME: path.join(mobileDir, '.cache'),
  FORCE_COLOR: '1', 
  TERM: 'xterm-256color',
};

const args = [
  path.join(mobileDir, 'node_modules', 'expo', 'bin', 'cli'),
  'start',
  '--go',
  useTunnel ? '--tunnel' : '--lan',
  '--port', '8082'
];

console.log(`🚀 Starting Expo Go in ${mobileDir}${useTunnel ? ' (tunnel mode)' : ''}...`);

const child = spawn('node', args, {
  cwd: mobileDir,
  env,
  stdio: 'inherit',
  shell: false
});

// Handle termination signals to ensure child process is killed
const cleanup = (signal) => {
  if (child.pid) {
    try {
      child.kill(signal);
    } catch (e) {}
  }
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

child.on('exit', (code) => {
  process.exit(code || 0);
});
