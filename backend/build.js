import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

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
  '.env'
];

filesToCopy.forEach(file => {
  const source = join(__dirname, file);
  const dest = join(outputDir, file);
  
  // Create directory structure if it doesn't exist
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  if (existsSync(source)) {
    copyFileSync(source, dest);
    console.log(`Copied ${file} to ${dest}`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

// Install production dependencies
console.log('Installing production dependencies...');
const packageJson = JSON.parse(
  await fs.promises.readFile(join(__dirname, 'package.json'), 'utf-8')
);

const prodDependencies = packageJson.dependencies || {};
const depsList = Object.entries(prodDependencies)
  .map(([pkg, version]) => `${pkg}@${version}`)
  .join(' ');

if (depsList) {
  execSync(`npm install --prefix ${outputDir} --no-save ${depsList}`, {
    stdio: 'inherit',
  });
}

console.log('Backend build completed successfully!');
