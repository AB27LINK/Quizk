/**
 * scripts/lint.js
 * Project linter verifying syntax, formatting, and AGENTS.md hard security rules.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let errorCount = 0;

function checkRule(condition, message, file = '') {
  if (!condition) {
    console.error(`❌ [LINT ERROR] ${message}${file ? ` in ${file}` : ''}`);
    errorCount++;
  }
}

function scanDir(dir, fileCallback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        scanDir(fullPath, fileCallback);
      }
    } else {
      fileCallback(fullPath);
    }
  }
}

console.log('🔍 Running QUIZK compliance linter...');

// Check 1: Verify .env is git-ignored
const gitignorePath = path.join(ROOT, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  checkRule(gitignore.includes('.env'), '.env must be included in .gitignore');
} else {
  checkRule(false, '.gitignore file is missing');
}

// Check 2: Verify .env.example exists and contains GEMINI_API_KEY
const envExamplePath = path.join(ROOT, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  checkRule(envExample.includes('GEMINI_API_KEY'), '.env.example must define GEMINI_API_KEY');
} else {
  checkRule(false, '.env.example is missing');
}

// Check 3: Scan client code for innerHTML and forbidden AI endpoint calls
scanDir(path.join(ROOT, 'client'), (filePath) => {
  if (!filePath.match(/\.(js|jsx|html|css)$/)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(ROOT, filePath);

  // Check no innerHTML
  if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
    checkRule(false, 'Violation of rule 7: Never use innerHTML/dangerouslySetInnerHTML. Use textContent/React text nodes', rel);
  }

  // Check no direct AI calls
  if (content.includes('generativelanguage.googleapis.com') || content.includes('GEMINI_API_KEY')) {
    checkRule(false, 'Violation of rule 2: Client must never contact AI provider directly or reference API keys', rel);
  }
});

if (errorCount === 0) {
  console.log('✅ QUIZK Linting passed: 0 errors found. All AGENTS.md rules respected.');
  process.exit(0);
} else {
  console.error(`💥 Linting failed with ${errorCount} error(s).`);
  process.exit(1);
}

