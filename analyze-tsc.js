const fs = require('fs');
const path = require('path');

// Enhanced TypeScript Error Analysis Script
// Supports multiple input methods, JSON export, and better formatting

// Parse input from file, pipe, or auto-detection
let output;
const inputFile = process.argv[2];

if (inputFile && fs.existsSync(inputFile)) {
  output = fs.readFileSync(inputFile, 'utf8');
  console.log(`📁 Reading from file: ${inputFile}`);
} else if (!process.stdin.isTTY) {
  // Read from stdin if piped
  output = fs.readFileSync(0, 'utf8');
  console.log('📥 Reading from stdin (piped input)');
} else {
  // Try to read from default TypeScript error files
  const defaultFiles = [
    '.reports/tsc-web.txt',
    '.reports/tsc-output.txt',
    'tsc-output.txt',
    'tsc-errors.log'
  ];
  let foundFile = null;

  for (const file of defaultFiles) {
    if (fs.existsSync(file)) {
      output = fs.readFileSync(file, 'utf8');
      foundFile = file;
      break;
    }
  }

  if (foundFile) {
    console.log(`📁 Reading from default file: ${foundFile}`);
  } else {
    console.error('❌ No TypeScript error file found. Usage:');
    console.error('  node analyze-tsc.js [file]');
    console.error('  OR pipe output: pnpm run type-check | node analyze-tsc.js');
    console.error('  OR save output to file and run: node analyze-tsc.js tsc-output.txt');
    console.error('\nSupported file locations:');
    console.error('  .reports/tsc-web.txt, .reports/tsc-output.txt, tsc-output.txt, tsc-errors.log');
    process.exit(1);
  }
}

// Parse TypeScript errors with enhanced regex
const lines = output.split(/\r?\n/);
const errLines = lines.filter(line => /\.(?:ts|tsx|js|jsx)\(\d+,\d+\):\s*error\s+TS\d+/.test(line));

const items = errLines.map(line => {
  // Enhanced regex to handle various TypeScript error formats
  const match = line.match(/^(.*\.(?:ts|tsx|js|jsx))\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.*)$/);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      col: parseInt(match[3]),
      code: match[4],
      msg: match[5],
      severity: 'error'
    };
  }
  return null;
}).filter(Boolean);

// Analysis data structures
const byCode = {};
const byFile = {};
const bySeverity = { error: 0, warning: 0 };
const fileExtensions = {};

items.forEach(item => {
  // Count by error code
  byCode[item.code] = (byCode[item.code] || 0) + 1;

  // Count by file
  byFile[item.file] = (byFile[item.file] || 0) + 1;

  // Count by severity
  bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;

  // Count file extensions
  const ext = path.extname(item.file);
  fileExtensions[ext] = (fileExtensions[ext] || 0) + 1;
});

function top(obj, n = 10) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function formatErrorCount(count) {
  if (count === 0) return '🎉 None';
  if (count < 10) return `✅ ${count}`;
  if (count < 50) return `⚠️  ${count}`;
  return `🚨 ${count}`;
}

function getErrorCodeDescription(code) {
  const descriptions = {
    'TS1002': 'Unterminated string literal',
    'TS1003': 'Identifier expected',
    'TS1005': 'Missing semicolon',
    'TS1008': 'Unexpected token',
    'TS1011': 'Element implicitly has an \'any\' type',
    'TS18046': 'Type is \'unknown\'',
    'TS2304': 'Cannot find name',
    'TS2307': 'Cannot find module',
    'TS2322': 'Type assignment error',
    'TS2339': 'Property does not exist',
    'TS2345': 'Argument type mismatch',
    'TS2353': 'Object literal property error',
    'TS2366': 'Function lacks ending return statement',
    'TS2367': 'This comparison appears to be unintentional',
    'TS2371': 'Initializer provides no value',
    'TS2554': 'Expected arguments',
    'TS2740': 'Type lacks properties',
    'TS2741': 'Property missing from type',
    'TS2769': 'No overload matches',
    'TS7006': 'Parameter implicitly has \'any\' type',
    'TS7017': 'Element implicitly has \'any\' type'
  };
  return descriptions[code] || 'Unknown error type';
}

// Check if JSON export is requested
const shouldExportJson = process.argv.includes('--json') || process.argv.includes('-j');

// Enhanced output formatting
console.log('\n' + '='.repeat(60));
console.log('📊 ENHANCED TYPESCRIPT ERROR ANALYSIS');
console.log('='.repeat(60));

console.log(`\n📈 SUMMARY:`);
console.log(`   Total Errors: ${formatErrorCount(items.length)}`);
console.log(`   Files Affected: ${Object.keys(byFile).length}`);
console.log(`   Error Types: ${Object.keys(byCode).length}`);

console.log(`\n🏷️  TOP ERROR CODES (${Math.min(10, Object.keys(byCode).length)}):`);
const topCodes = top(byCode, 10);
if (topCodes.length > 0) {
  topCodes.forEach(([code, count], index) => {
    const desc = getErrorCodeDescription(code);
    console.log(`   ${index + 1}. ${code} → ${count} ${desc ? `(${desc})` : ''}`);
  });
} else {
  console.log('   🎉 No errors found!');
}

console.log(`\n📁 MOST AFFECTED FILES (${Math.min(10, Object.keys(byFile).length)}):`);
const topFiles = top(byFile, 10);
if (topFiles.length > 0) {
  topFiles.forEach(([file, count], index) => {
    const shortPath = file.replace(/^.*[\\\/]/, '');
    console.log(`   ${index + 1}. ${shortPath} → ${count} errors`);
  });
} else {
  console.log('   ✅ No files with errors!');
}

console.log(`\n📋 FILE TYPES AFFECTED:`);
Object.entries(fileExtensions).forEach(([ext, count]) => {
  console.log(`   ${ext}: ${count} files`);
});

if (items.length > 0) {
  console.log(`\n🔍 SAMPLE ERRORS (first ${Math.min(10, items.length)}):`);
  items.slice(0, 10).forEach((item, index) => {
    const shortPath = item.file.replace(/^.*[\\\/]/, '');
    console.log(`   ${index + 1}. ${shortPath}:${item.line}:${item.col}`);
    console.log(`      ${item.code}: ${item.msg}`);
  });

  if (items.length > 10) {
    console.log(`   ... and ${items.length - 10} more errors`);
  }
}

console.log('\n' + '='.repeat(60));

// JSON Export
if (shouldExportJson) {
  const analysis = {
    summary: {
      totalErrors: items.length,
      filesAffected: Object.keys(byFile).length,
      errorTypes: Object.keys(byCode).length,
      generatedAt: new Date().toISOString(),
      inputSource: inputFile || 'stdin'
    },
    statistics: {
      byCode,
      byFile,
      bySeverity,
      fileExtensions
    },
    errors: items,
    topCodes: topCodes.map(([code, count]) => ({
      code,
      count,
      description: getErrorCodeDescription(code)
    })),
    topFiles: topFiles.map(([file, count]) => ({ file, count }))
  };

  const jsonFile = 'tsc-analysis.json';
  fs.writeFileSync(jsonFile, JSON.stringify(analysis, null, 2));
  console.log(`📄 Analysis exported to ${jsonFile}`);
}

// Exit with appropriate code
process.exit(items.length > 0 ? 1 : 0);
