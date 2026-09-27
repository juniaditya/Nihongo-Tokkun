/**
 * Architecture test: No Spreadsheet runtime reads in Next.js source.
 *
 * Scans all .ts/.tsx files in src/ for forbidden Google Sheets / Apps Script
 * patterns. Expected occurrences at runtime: 0.
 *
 * Run: node scripts/check-no-sheets.js
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');

const FORBIDDEN_PATTERNS = [
  'sheets.googleapis.com',
  'SpreadsheetApp',
  'google.script.run',
  'googleapis.com/spreadsheets',
  'script.google.com',
  'SpreadsheetService',
  'getSpreadsheet',
];

function walkSync(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip test directories — tests may reference forbidden patterns as assertions
      if (entry.name === '__tests__') continue;
      walkSync(fullPath, results);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walkSync(SRC_DIR);
const violations = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (content.includes(pattern)) {
      violations.push(`  FORBIDDEN: "${pattern}" in ${relative(SRC_DIR, file)}`);
    }
  }
}

if (violations.length > 0) {
  console.error('❌ Spreadsheet runtime dependency detected in Next.js source:');
  violations.forEach((v) => console.error(v));
  console.error('\nNext.js must NEVER read from Google Sheets at runtime.');
  console.error('Direction: Spreadsheet → Supabase importer → Supabase (runtime)');
  process.exit(1);
} else {
  console.log(`✅ No-Spreadsheet check PASS — scanned ${files.length} files, 0 violations.`);
}
