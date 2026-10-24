const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\silva\\.gemini\\antigravity-ide\\brain\\929c4a4a-63d1-4b67-ad6a-80809b7d2dde';
const simpleLogo = path.join(brainDir, 'trampou_simple_icon_1792865668658.jpg');
const appIcon = path.join(brainDir, 'trampou_app_squircle_1792865717058.jpg');

fs.copyFileSync(simpleLogo, path.join(__dirname, '..', 'web', 'trampou_logo_clean.jpg'));
fs.copyFileSync(appIcon, path.join(__dirname, '..', 'web', 'trampou_icon.jpg'));

console.log('✅ Copied trampou_logo_clean.jpg and trampou_icon.jpg to web/ directory!');
