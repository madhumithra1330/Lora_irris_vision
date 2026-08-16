const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

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

const files = scanFiles(SRC_DIR);
let errors = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (/\bt\s*\(/.test(content)) {
    const hasUseTranslationImport = /import\s+{[^}]*\buseTranslation\b[^}]*}\s+from\s+['"]react-i18next['"]/.test(content);
    const hasUseTranslationHook = /const\s+{[^}]*\bt\b[^}]*}\s*=\s*useTranslation\s*\(/.test(content);
    
    // Check if it's a utility file where t is passed as a parameter
    const isUtilityFile = file.includes('utils');
    
    const relPath = path.relative(path.join(__dirname, '..'), file);
    
    if (isUtilityFile) {
      // For utility files, check if t is accepted in function signatures
      const hasTParam = /\bfunction\b[^(]*\([^)]*\bt\b[^)]*\)/.test(content) || /\([^)]*\bt\b[^)]*\)\s*=>/.test(content);
      if (!hasTParam) {
        console.log(`⚠️  [Utility File] ${relPath} uses t() but does not accept t as parameter`);
      }
    } else {
      if (!hasUseTranslationImport) {
        console.error(`❌ [Missing Import] ${relPath} uses t() but does not import useTranslation`);
        errors++;
      }
      if (!hasUseTranslationHook) {
        console.error(`❌ [Missing Hook] ${relPath} uses t() but does not define const { t } = useTranslation()`);
        errors++;
      }
    }
  }
}

if (errors === 0) {
  console.log("✅ All files using t() have correct hook calls and imports.");
} else {
  console.log(`❌ Found ${errors} i18n usage errors.`);
}
process.exit(errors > 0 ? 1 : 0);
