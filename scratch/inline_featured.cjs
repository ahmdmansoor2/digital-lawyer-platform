const fs = require('fs');
const path = require('path');

const featured = JSON.parse(fs.readFileSync('public/data/legal-library-featured.json', 'utf8')).slice(0, 60);
let html = fs.readFileSync('public/legal-library.html', 'utf8');

const inlineScript = `
    const INITIAL_FEATURED_BOOKS = ${JSON.stringify(featured)};
    let ALL_BOOKS = INITIAL_FEATURED_BOOKS;
    let FILTERED_BOOKS = ALL_BOOKS;
    let currentCat = 'all';
    let displayedCount = 0;
    const PAGE_SIZE = 30;
`;

html = html.replace(/let ALL_BOOKS = \[\];[\s\S]*?const PAGE_SIZE = 30;/, inlineScript.trim());

fs.writeFileSync('public/legal-library.html', html, 'utf8');
console.log('Inlined 60 featured books directly into HTML!');
