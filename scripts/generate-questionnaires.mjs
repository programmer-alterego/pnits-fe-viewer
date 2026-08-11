// This script lists all questionnaires found in public/questionnaires.
// The result is written as JSON and saved in the same directory.
// Run this script when adding, removing, or modifying questionnaires.

import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const QUESTIONNAIRES_DIR = path.resolve('public/questionnaires');
const OUTPUT_FILE = path.join(QUESTIONNAIRES_DIR, 'questionnaires.json');

const QUESTIONNAIRE_PATTERN = /^20\d{2}[AS]_(AM|PM)\.pdf$/i;

async function generateQuestionnaireList() {
  const files = await readdir(QUESTIONNAIRES_DIR);

  const pdfFiles = files.filter((file) => file.toLowerCase().endsWith('.pdf'));

  const invalidFiles = pdfFiles.filter(
    (file) => !QUESTIONNAIRE_PATTERN.test(file),
  );

  if (invalidFiles.length > 0) {
    console.error('Invalid questionnaire filename(s):');

    for (const file of invalidFiles) {
      console.error(`  ${file}`);
    }

    console.error('\nExpected filename format: 20YY[A|S]_(AM|PM).pdf');

    process.exitCode = 1;
    return;
  }

  const questionnaires = pdfFiles.sort();

  await writeFile(
    OUTPUT_FILE,
    JSON.stringify(questionnaires, null, 4) + '\n',
    'utf8',
  );

  console.log(`Generated ${path.relative(process.cwd(), OUTPUT_FILE)}`);

  console.log(`Found ${questionnaires.length} questionnaire(s).`);
}

generateQuestionnaireList().catch((error) => {
  console.error('Failed to generate questionnaire list.');
  console.error(error);

  process.exitCode = 1;
});
