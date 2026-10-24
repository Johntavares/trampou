const fs = require('fs');

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (/GO Parauapebas|go-parauapebas|goparauapebas/i.test(l)) {
      console.log(`${file}:${i + 1} -> ${l.trim().slice(0, 100)}`);
    }
  });
}

checkFile('web/index.html');
