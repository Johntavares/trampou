const fs = require('fs');
const content = fs.readFileSync('web/app.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('function loadProfessionalsFromStorage')) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
