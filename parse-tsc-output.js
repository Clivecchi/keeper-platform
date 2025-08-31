const fs = require('fs');
const path = require('path');

// Parse the type-check output from file or stdin
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
  // Try to read from default files
  const defaultFiles = ['tsc-output.txt', '.reports/tsc-output.txt', 'tsc-errors.log'];
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
    console.error('❌ No input file found. Usage:');
    console.error('  node parse-tsc-output.js [file]');
    console.error('  OR pipe output: pnpm run type-check | node parse-tsc-output.js');
    console.error('  OR save output to file and run: node parse-tsc-output.js tsc-output.txt');
    process.exit(1);
  }
}

// Parse the type-check output
const lines = output.split('\n').filter(line => line.includes('error TS'));
const items = lines.map(line => {
  const match = line.match(/^([^:]+):(\d+):(\d+) - error (TS\d+): (.+)$/);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      col: parseInt(match[3]),
      code: match[4],
      msg: match[5]
    };
  }
  return null;
}).filter(Boolean);

const byCode = {};
const byFile = {};
items.forEach(item => {
  byCode[item.code] = (byCode[item.code] || 0) + 1;
  byFile[item.file] = (byFile[item.file] || 0) + 1;
});

function top(obj, n = 10) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

console.log('\n=== TSC SUMMARY (keeper-web) ===');
console.log('Total errors:', items.length);
console.log('Top codes:', top(byCode).map(([c, n]) => `${c} → ${n}`).join(', ') || 'None');
console.log('Top files:', top(byFile).map(([f, n]) => `${f} → ${n}`).join(', ') || 'None');

if (items.length > 0) {
  console.log('\nSample (first 10):');
items.slice(0, 10).forEach(item => {
    console.log(`- ${item.file}:${item.line}:${item.col} ${item.code} ${item.msg}`);
  });
}

// Export analysis as JSON if requested
if (process.argv.includes('--json') || process.argv.includes('-j')) {
  const analysis = {
    summary: {
      total: items.length,
      byCode,
      byFile,
      generatedAt: new Date().toISOString()
    },
    errors: items
  };

  const jsonFile = 'tsc-analysis.json';
  fs.writeFileSync(jsonFile, JSON.stringify(analysis, null, 2));
  console.log(`\n📄 Analysis exported to ${jsonFile}`);
}
