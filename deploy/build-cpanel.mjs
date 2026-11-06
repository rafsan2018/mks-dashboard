// Builds the MKS dashboard and packs two zips for upload through cPanel File Manager:
//   deploy/out/mks-frontend.zip  -> extract into the dashboard domain's document root
//   deploy/out/mks-backend.zip   -> extract into the Node.js app folder (e.g. ~/mks-api)
//
// Usage (from the project root):  node deploy/build-cpanel.mjs
// See deploy/CPANEL-DEPLOY.md for the full steps.

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.join(root, 'frontend');
const backendDir = path.join(root, 'backend');
const outDir = path.join(root, 'deploy', 'out');
const isWindows = process.platform === 'win32';

// Backend files the server needs. node_modules, logs, tests and the dev .env stay behind:
// cPanel installs the packages itself with "Run NPM Install".
const BACKEND_ENTRIES = ['package.json', 'package-lock.json', 'server.js', 'src', 'schema.sql', 'migrations'];

// npm is a .cmd script on Windows, so it must go through a shell.
function run(command, cwd) {
  console.log(`> ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

// Zips the contents of `dir` (not the folder itself), with forward-slash paths that Linux servers expect.
function zipDir(dir, zipPath) {
  const entries = fs.readdirSync(dir);
  fs.rmSync(zipPath, { force: true });
  if (isWindows) {
    // Windows' built-in bsdtar writes proper zips; Git Bash's GNU tar cannot, so call it by full path.
    const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    execFileSync(tar, ['--format', 'zip', '-cf', zipPath, '-C', dir, ...entries], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-qr', zipPath, ...entries], { cwd: dir, stdio: 'inherit' });
  }
  console.log(`  wrote ${path.relative(root, zipPath)} (${(fs.statSync(zipPath).size / 1024).toFixed(0)} KB)`);
}

// ── Frontend ────────────────────────────────────────────────────────────────
console.log('\n[1/3] Building frontend');
if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) run('npm ci', frontendDir);
run('npm run build', frontendDir);

const distDir = path.join(frontendDir, 'dist');
if (!fs.existsSync(path.join(distDir, '.htaccess'))) {
  throw new Error('frontend/dist/.htaccess is missing; frontend/public/.htaccess should be copied by Vite.');
}

// ── Backend ─────────────────────────────────────────────────────────────────
console.log('\n[2/3] Staging backend');
fs.rmSync(outDir, { recursive: true, force: true });
const backendStage = path.join(outDir, 'backend');
fs.mkdirSync(backendStage, { recursive: true });
for (const entry of BACKEND_ENTRIES) {
  fs.cpSync(path.join(backendDir, entry), path.join(backendStage, entry), { recursive: true });
}

const prodEnv = path.join(backendDir, '.env.production');
if (fs.existsSync(prodEnv)) {
  fs.copyFileSync(prodEnv, path.join(backendStage, '.env'));
  console.log('  included backend/.env.production as .env');
} else {
  console.warn('  WARNING: backend/.env.production not found, so the zip has no .env.');
  console.warn('  Copy backend/.env.production.example to backend/.env.production, fill it in and re-run,');
  console.warn('  or create .env on the server in cPanel File Manager.');
}

// ── Zips ────────────────────────────────────────────────────────────────────
console.log('\n[3/3] Creating zips');
zipDir(distDir, path.join(outDir, 'mks-frontend.zip'));
zipDir(backendStage, path.join(outDir, 'mks-backend.zip'));
fs.rmSync(backendStage, { recursive: true, force: true });

console.log('\nDone. Upload the zips in deploy/out/ as described in deploy/CPANEL-DEPLOY.md');
