const https = require('https');

https.get('https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEf11FKjtLRv2K-zdk5Lhn9EQcIk2UFkkAx8c2cS9dWVCKszudbr1dh2Mp_o1jQtxvANp7vT1iIGm7Q05WbjhUnfvKFQERCSq0wDvpifFMSYXlnUDcilQ==', res => {
  console.log('Redirect:', res.headers.location);
});
