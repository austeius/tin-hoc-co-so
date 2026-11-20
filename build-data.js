const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const questionsPath = path.join(rootDir, 'data', 'questions.json');
const rawQuestions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

console.log(`Read ${rawQuestions.length} questions from questions.json`);

const fullQuestions = rawQuestions.map((q, idx) => {
  let code = '';
  if (q.solution_file) {
    const solPath = path.join(rootDir, q.solution_file);
    if (fs.existsSync(solPath)) {
      code = fs.readFileSync(solPath, 'utf-8');
    } else {
      console.warn(`Warning: solution file not found: ${solPath}`);
    }
  }
  return {
    id: q.id,
    group: q.group,
    title: q.title,
    statement: q.statement,
    approach: q.approach,
    solution_file: q.solution_file,
    code: code,
    examples: q.examples || [],
    notes: q.notes || []
  };
});

// Write to data.json
const jsonPath = path.join(__dirname, 'data.json');
fs.writeFileSync(jsonPath, JSON.stringify(fullQuestions, null, 2), 'utf-8');
console.log(`Saved ${fullQuestions.length} questions to data.json`);

// Write to data.js for direct frontend inclusion if needed
const jsPath = path.join(__dirname, 'data.js');
fs.writeFileSync(jsPath, `const QUESTIONS_DATA = ${JSON.stringify(fullQuestions)};\n`, 'utf-8');
console.log(`Saved data.js successfully (${fs.statSync(jsPath).size} bytes)`);
