const fs = require('fs');

const data = fs.readFileSync('index.html', 'utf8');
const lines = data.split('\n');

const styleLines = lines.slice(14, 1143);
const appLines = lines.slice(1407, 2415);

fs.writeFileSync('style.css', styleLines.join('\n'));
fs.writeFileSync('app.js', appLines.join('\n'));

console.log('Split successful!');
