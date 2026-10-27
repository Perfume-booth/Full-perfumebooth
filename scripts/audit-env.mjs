import fs from 'fs';
import path from 'path';

function findEnvInFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const results = new Set();
  
  // Django config('KEY', ...)
  const configRegex = /config\(\s*['"]([A-Z0-9_]+)['"]/g;
  let match;
  while ((match = configRegex.exec(content)) !== null) {
    results.add(match[1]);
  }
  
  // os.environ.get('KEY', ...) or os.getenv('KEY')
  const envRegex = /(?:os\.environ(?:\.get)?|os\.getenv)\(\s*['"]([A-Z0-9_]+)['"]/g;
  while ((match = envRegex.exec(content)) !== null) {
    results.add(match[1]);
  }

  // process.env.KEY
  const processEnvRegex = /process\.env\.([A-Z0-9_]+)/g;
  while ((match = processEnvRegex.exec(content)) !== null) {
    results.add(match[1]);
  }
  
  return [...results];
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

// 1. Audit Django settings.py
const djangoSettings = 'perfumebooth-backend/core/settings.py';
const djangoKeys = findEnvInFile(djangoSettings);

// 2. Audit Storefront and MPS
function scanDirForProcessEnv(dir) {
  const keys = new Set();
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const item of fs.readdirSync(d)) {
      if (item === 'node_modules' || item === '.next' || item === '.git') continue;
      const full = path.join(d, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (/\.(js|jsx|ts|tsx|mjs)$/.test(item)) {
        const found = findEnvInFile(full);
        found.forEach(k => keys.add(k));
      }
    }
  }
  walk(dir);
  return [...keys];
}

const storefrontKeys = scanDirForProcessEnv('perfumebooth/src');
const mpsKeys = scanDirForProcessEnv('perfumebooth-MPS/src');

// 3. Current Env Files
const storefrontEnv = parseEnvFile('perfumebooth/.env.local');
const dockerEnv = parseEnvFile('perfumebooth/.env.docker');
const backendEnv = parseEnvFile('perfumebooth-backend/.env');

console.log(JSON.stringify({
  djangoSettingsKeys: djangoKeys.sort(),
  storefrontCodeKeys: storefrontKeys.sort(),
  mpsCodeKeys: mpsKeys.sort(),
  files: {
    storefrontEnvCount: Object.keys(storefrontEnv).length,
    backendEnvCount: Object.keys(backendEnv).length,
    dockerEnvCount: Object.keys(dockerEnv).length,
  }
}, null, 2));
