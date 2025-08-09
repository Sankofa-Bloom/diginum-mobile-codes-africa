#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;

// Get git commit hash
let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Could not get git commit hash:', error.message);
}

// Get build date
const buildDate = new Date().toISOString();

// Create version info object
const versionInfo = {
  version,
  gitCommit,
  buildDate,
  environment: process.env.NODE_ENV || 'development'
};

// Write version info to a file that can be imported
const versionFileContent = `// Auto-generated version info
export const VERSION_INFO = ${JSON.stringify(versionInfo, null, 2)};
`;

writeFileSync(join(projectRoot, 'src/version.ts'), versionFileContent);

console.log('✅ Version info injected:', versionInfo);

// Also create .env.local with version variables for Vite
const envContent = `# Auto-generated version variables
VITE_APP_VERSION=${version}
VITE_GIT_COMMIT=${gitCommit}
VITE_BUILD_DATE=${buildDate}
VITE_BUILD_ENV=${process.env.NODE_ENV || 'development'}
`;

writeFileSync(join(projectRoot, '.env.local'), envContent);

console.log('✅ Environment variables created for Vite');