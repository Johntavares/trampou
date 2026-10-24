const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\silva\\.gemini\\antigravity-ide\\brain\\929c4a4a-63d1-4b67-ad6a-80809b7d2dde';
const iconSource = path.join(brainDir, 'trampou_pin_icon_1792865592004.jpg');
const logoSource = path.join(brainDir, 'trampou_full_logo_1792865616903.jpg');

fs.copyFileSync(iconSource, path.join(__dirname, '..', 'web', 'trampou_icon.jpg'));
fs.copyFileSync(logoSource, path.join(__dirname, '..', 'web', 'trampou_logo.jpg'));

console.log('✅ Trampou icon and full logo copied to web/ successfully!');
