#!/usr/bin/env node
/*
  Free commonly used dev ports (Vite: 5173, HMR WS: 24690) on Windows before starting the dev server.
  This script scans netstat output, finds PIDs bound to the specified ports, and force kills them.
*/
const { exec } = require('child_process');

const ports = [5173, 24690, 3001, 5000, 8082];

function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve({ stdout, stderr });
    });
  });
}

async function findPidsForPort(port) {
  try {
    const { stdout } = await execAsync('netstat -ano');
    const lines = stdout.split(/\r?\n/).filter(l => l.includes(':'+port));
    const pids = new Set();
    for (const line of lines) {
      // Example: TCP    0.0.0.0:5173      0.0.0.0:0      LISTENING       12345
      // Example: TCP    [::]:5173         [::]:0         LISTENING       12345
      const parts = line.trim().split(/\s+/);
      const pidStr = parts[parts.length - 1];
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid) && pid > 4) pids.add(pid); // Skip PID 0 (Idle) and PID 4 (System)
    }
    return Array.from(pids);
  } catch (e) {
    console.error('[free-ports] Failed to run netstat:', e.message);
    return [];
  }
}

async function killPid(pid) {
  try {
    await execAsync(`taskkill /F /PID ${pid}`);
    console.log(`[free-ports] Killed PID ${pid}`);
  } catch (e) {
    // Some PIDs may already be gone or require elevated permissions
    console.warn(`[free-ports] Could not kill PID ${pid}: ${e.message}`);
  }
}

(async function main() {
  console.log('[free-ports] Checking and freeing ports:', ports.join(', '));
  for (const port of ports) {
    const pids = await findPidsForPort(port);
    if (pids.length === 0) {
      console.log(`[free-ports] Port ${port} is free.`);
      continue;
    }
    console.log(`[free-ports] Port ${port} in use by PIDs: ${pids.join(', ')}`);
    for (const pid of pids) {
      await killPid(pid);
    }
  }
  console.log('[free-ports] Done.');
})();