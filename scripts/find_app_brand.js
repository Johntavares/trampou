const fs = require('fs');

const content = fs.readFileSync('web/app.js', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (/GO Parauapebas/i.test(l)) {
    console.log(`web/app.js:${i + 1} -> ${l.trim().slice(0, 100)}`);
  }
});
