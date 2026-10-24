const fs = require('fs');

const content = fs.readFileSync('web/app.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('DOMContentLoaded') || line.includes('function init(') || line.includes('window.onload')) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
