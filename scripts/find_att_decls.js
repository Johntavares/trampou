const fs = require('fs');
const content = fs.readFileSync('web/app.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('attendance') || line.includes('CONVERSATIONS')) {
    if (line.includes('function ') || line.includes('const ') || line.includes('let ')) {
      console.log(`Line ${index + 1}: ${line}`);
    }
  }
});
