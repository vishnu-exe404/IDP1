const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html);
const document = dom.window.document;

const regex = /querySelector\(['"]([^'"]+)['"]\)/g;
let match;
while ((match = regex.exec(app)) !== null) {
  const selector = match[1];
  try {
    const el = document.querySelector(selector);
    if (!el) {
      console.log('Missing selector:', selector);
    }
  } catch(e) {
    console.log('Invalid selector syntax?', selector);
  }
}
