#!/usr/bin/env node

/**
 * Automatic pre-rendering script
 * 
 * This script:
 * 1. Checks if pre-rendering is needed (new content, changes, etc.)
 * 2. Runs pre-rendering
 * 3. Commits and pushes the pre-rendered files automatically
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Check if we're in a git repo
function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { cwd: rootDir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Check if there are uncommitted changes
function hasUncommittedChanges() {
  try {
    const status = execSync('git status --porcelain', { 
      cwd: rootDir, 
      encoding: 'utf-8' 
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

// Check if dist/ has pre-rendered files
function hasPreRenderedFiles() {
  const distDir = join(rootDir, 'dist');
  if (!existsSync(distDir)) return false;
  
  try {
    const files = execSync('find dist -name "index.html" -type f | wc -l', {
      cwd: rootDir,
      encoding: 'utf-8'
    });
    return parseInt(files.trim()) > 10; // At least 10 pre-rendered files
  } catch {
    return false;
  }
}

// Main function
async function autoPrerender() {
  console.log('🔍 Checking if pre-rendering is needed...');
  
  if (!isGitRepo()) {
    console.log('⚠️  Not a git repository. Skipping auto-commit.');
    console.log('   Running pre-rendering only...');
    execSync('npm run prerender:local', { cwd: rootDir, stdio: 'inherit' });
    return;
  }
  
  // Check if we need to pre-render
  const needsPrerender = !hasPreRenderedFiles() || hasUncommittedChanges();
  
  if (!needsPrerender) {
    console.log('✅ Pre-rendered files are up to date.');
    console.log('   Run "npm run prerender:local" manually if you want to refresh.');
    return;
  }
  
  console.log('🔄 Running pre-rendering...');
  execSync('npm run prerender:local', { cwd: rootDir, stdio: 'inherit' });
  
  // Check if there are new pre-rendered files to commit
  try {
    const status = execSync('git status --porcelain dist/', {
      cwd: rootDir,
      encoding: 'utf-8'
    });
    
    if (status.trim().length === 0) {
      console.log('✅ No changes to pre-rendered files.');
      return;
    }
    
    console.log('📝 Committing pre-rendered files...');
    execSync('git add dist/', { cwd: rootDir, stdio: 'inherit' });
    
    const commitMessage = 'Auto-update pre-rendered HTML for SEO';
    execSync(`git commit -m "${commitMessage}"`, { 
      cwd: rootDir, 
      stdio: 'inherit' 
    });
    
    console.log('🚀 Pushing to repository...');
    execSync('git push', { cwd: rootDir, stdio: 'inherit' });
    
    console.log('✅ Pre-rendered files committed and pushed!');
    
  } catch (err) {
    console.error('❌ Error committing/pushing:', err.message);
    console.log('   Pre-rendering completed, but files were not committed.');
    console.log('   You can commit manually: git add dist/ && git commit -m "Update pre-rendered files" && git push');
  }
}

// Run
autoPrerender().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

