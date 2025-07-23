const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel build process...');

try {
  // Install frontend dependencies
  console.log('Installing frontend dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Build frontend
  console.log('Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });

  // Install backend dependencies
  console.log('Installing backend dependencies...');
  execSync('cd backend && npm install --production', { stdio: 'inherit' });

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), '.vercel', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Vercel build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
