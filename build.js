// build.js
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const headerFiles = [
  'lan.js',
  'header-core.js',
  'header-database.js',
  'header-auth.js',
  'header-dropdowns.js',
  'header-search.js',
  'push-notifications.js',
  'header-init.js'
];

async function buildHeaderBundle() {
  const headerDir = path.join(__dirname, 'head');
  const headerOutputFile = path.join(headerDir, 'header.min.js');
  const sourceCode = headerFiles.map((file) => {
    const filePath = path.join(headerDir, file);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Required header file not found: ${file}`);
    }

    return `/* ===== ${file} ===== */\n${fs.readFileSync(filePath, 'utf8')}`;
  }).join('\n\n');

  const result = await minify(sourceCode, {
    compress: true,
    mangle: false,
    format: {
      comments: false
    }
  });

  if (!result.code) {
    throw new Error('Terser returned an empty header bundle');
  }

  fs.writeFileSync(headerOutputFile, `${result.code}\n`, 'utf8');
  console.log(`✅ Header bundle created: ${headerOutputFile}`);
  console.log(`📦 Header bundle size: ${(result.code.length / 1024).toFixed(2)} KB`);
}

buildHeaderBundle().catch((err) => {
  console.error(`❌ Header bundle failed: ${err.message}`);
  process.exitCode = 1;
});