const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const TRANSLATIONS_DIR = path.join(SRC_DIR, 'i18n', 'translations');

// Load translation files
const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
const taPath = path.join(TRANSLATIONS_DIR, 'ta.json');
const hiPath = path.join(TRANSLATIONS_DIR, 'hi.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

// Helper to flatten nested object keys
function getFlattenedKeys(obj, prefix = '') {
  let keys = {};
  for (const key in obj) {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      Object.assign(keys, getFlattenedKeys(val, fullKey));
    } else {
      keys[fullKey] = val;
    }
  }
  return keys;
}

const enKeys = getFlattenedKeys(en);
const taKeys = getFlattenedKeys(ta);
const hiKeys = getFlattenedKeys(hi);

console.log(`Loaded Translation Keys:`);
console.log(`- English: ${Object.keys(enKeys).length} keys`);
console.log(`- Tamil: ${Object.keys(taKeys).length} keys`);
console.log(`- Hindi: ${Object.keys(hiKeys).length} keys\n`);

let hasErrors = false;

// 1. Check for missing keys in Tamil and Hindi compared to English
for (const key of Object.keys(enKeys)) {
  if (!taKeys[key]) {
    console.error(`❌ [Missing Key] Tamil translation is missing key: "${key}"`);
    hasErrors = true;
  }
  if (!hiKeys[key]) {
    console.error(`❌ [Missing Key] Hindi translation is missing key: "${key}"`);
    hasErrors = true;
  }
}

// 2. Scan source files for hardcoded strings and t() usages
function scanFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'i18n' && file !== 'node_modules' && file !== 'dist') {
        scanFiles(filePath, filesList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

const sourceFiles = scanFiles(SRC_DIR);
console.log(`Scanning ${sourceFiles.length} source files for translation coverage...\n`);

let tUsageCount = 0;
let missingKeysInCode = new Set();
let potentialHardcodedStrings = [];

// Regexes
const tRegex = /t\(\s*['"`]([a-zA-Z0-9._-]+)['"`]/g;
const jsxTextRegex = />\s*([^<>{}$]*[a-zA-Z][^<>{}$]*)\s*</g;
const attrTextRegex = /\b(placeholder|aria-label|title|action)\s*=\s*["']([^"']*[a-zA-Z][^"']*)["']/g;

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);

  // Check t() usages
  let match;
  tRegex.lastIndex = 0;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    tUsageCount++;
    if (!enKeys[key]) {
      missingKeysInCode.add(JSON.stringify({ key, file: relPath }));
    }
  }

  // Check line by line for hardcoded string patterns
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip import lines, comments, console logs
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('console.')) {
      return;
    }

    // A. Check JSX text
    let jsxMatch;
    jsxTextRegex.lastIndex = 0;
    while ((jsxMatch = jsxTextRegex.exec(line)) !== null) {
      const text = jsxMatch[1].trim();
      // Skip if it contains code constructs or is purely emoji/non-english, or format expressions
      if (text && !text.includes('=>') && !text.startsWith('export ') && !text.startsWith('const ') && !/^[A-Z_]+$/.test(text)) {
        potentialHardcodedStrings.push({
          file: relPath,
          line: lineNum,
          type: 'JSX Text',
          text
        });
      }
    }

    // B. Check attributes
    let attrMatch;
    attrTextRegex.lastIndex = 0;
    while ((attrMatch = attrTextRegex.exec(line)) !== null) {
      const attr = attrMatch[1];
      const val = attrMatch[2];
      potentialHardcodedStrings.push({
        file: relPath,
        line: lineNum,
        type: `Attribute (${attr})`,
        text: val
      });
    }
  });
}

// Print t() check results
if (missingKeysInCode.size > 0) {
  console.error(`❌ [Code Verification] The following translation keys are used in code but missing from en.json:`);
  missingKeysInCode.forEach((itemStr) => {
    const { key, file } = JSON.parse(itemStr);
    console.error(`   - "${key}" in ${file}`);
  });
  hasErrors = true;
} else {
  console.log(`✅ [Code Verification] All t() translation keys used in source code exist in en.json.`);
}

// Print potential hardcoded strings
console.log(`\nPotential Hardcoded Strings Found (${potentialHardcodedStrings.length}):`);
if (potentialHardcodedStrings.length > 0) {
  potentialHardcodedStrings.forEach((item) => {
    console.log(`- ${item.file}:${item.line} [${item.type}] "${item.text}"`);
  });
} else {
  console.log(`✅ No potential hardcoded English strings found!`);
}

// Print overall status
console.log(`\n=============================================`);
console.log(`Verification Summary:`);
console.log(`- Total source files checked: ${sourceFiles.length}`);
console.log(`- Total translation key references checked: ${tUsageCount}`);
if (hasErrors) {
  console.log(`STATUS: ❌ Verification Failed. Please resolve issues above.`);
  process.exit(1);
} else {
  console.log(`STATUS: ✅ Verification Passed. 100% localization alignment!`);
}
