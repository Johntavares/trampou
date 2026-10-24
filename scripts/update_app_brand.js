const fs = require('fs');

let content = fs.readFileSync('web/app.js', 'utf8');

// Replace brand strings
content = content.replace(/pelo GO Parauapebas/g, 'pelo Trampou');
content = content.replace(/no GO Parauapebas/g, 'no Trampou');
content = content.replace(/do GO Parauapebas/g, 'do Trampou');
content = content.replace(/o GO Parauapebas/g, 'o Trampou');
content = content.replace(/GO Parauapebas/g, 'Trampou');
content = content.replace(/goparauapebas\.com\.br/g, 'trampou.com.br');

fs.writeFileSync('web/app.js', content, 'utf8');
console.log('✅ Updated brand strings to Trampou in web/app.js!');
