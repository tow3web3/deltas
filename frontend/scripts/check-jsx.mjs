// Parses JSX files without building the site: catches syntax errors in seconds.
//   node scripts/check-jsx.mjs components/Hero.js components/FAQ.js
import fs from 'node:fs';
import { transform } from 'sucrase';

let bad = 0;
for (const file of process.argv.slice(2)) {
  try {
    transform(fs.readFileSync(file, 'utf8'), { transforms: ['jsx', 'imports'], filePath: file, production: true });
    console.log(`ok    ${file}`);
  } catch (e) {
    bad++;
    console.log(`FAIL  ${file}: ${e.message.split('\n')[0]}`);
  }
}
process.exit(bad ? 1 : 0);
