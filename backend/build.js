import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

// Simple function to copy a file with directory creation
const copyFileWithDir = (source, dest) => {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  if (existsSync(source)) {
    copyFileSync(source, dest);
    console.log(`Copied ${source} to ${dest}`);
  } else {
    console.warn(`Warning: ${source} not found`);
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create output directory if it doesn't exist
const outputDir = join(process.cwd(), '.output');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Copy necessary files to output directory
const filesToCopy = [
  'index.js',
  'routes.js',
  'auth.js',
  'supabase.js',
  'middleware/security.js',
  'package.json',
  'package-lock.json'
];

// Copy files
for (const file of filesToCopy) {
  const source = join(__dirname, file);
  const dest = join(outputDir, file);
  copyFileWithDir(source, dest);
}

// Copy .env if it exists, otherwise create a default one
const envSource = join(process.cwd(), '.env');
const envDest = join(outputDir, '.env');

if (existsSync(envSource)) {
  copyFileSync(envSource, envDest);
  console.log('Copied .env file');
} else {
  console.warn('Warning: .env file not found. Using environment variables from Vercel.');
}

// Install production dependencies
console.log('Installing production dependencies...');
try {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, 'package.json'), 'utf-8')
  );

  const prodDependencies = packageJson.dependencies || {};
  const depsList = Object.entries(prodDependencies)
    .map(([pkg, version]) => `${pkg}@${version}`)
    .join(' ');

  if (depsList) {
    console.log(`Installing dependencies: ${depsList}`);
    await exec(`npm install --prefix ${outputDir} --no-save ${depsList}`, {
      stdio: 'inherit',
    });
  }
} catch (error) {
  console.error('Error installing dependencies:', error);
  process.exit(1);
}

console.log('Backend build completed successfully!');
