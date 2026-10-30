const fs = require('fs');
const v6 = fs.readFileSync('scratch/extracted_v6/lawyers-directory.html', 'utf8');
const modals = v6.match(/id=["'][^"']*modal[^"']*["']/gi);
console.log('Modals in v6:', modals);
console.log('Has openRegisterModal:', v6.includes('openRegisterModal'));
