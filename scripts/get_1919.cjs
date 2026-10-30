const https = require('https');

https.get('https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGm1LZkpxAv1gm9IqBrfgGj4xF8FTCGSTCj6cpcZevtsgcirmVW5IUzd9XWjXpkj3hb4isCT3YBZMtwFQN6mxlfbcNtgrW0pphOc7CVQimM9mgX7-uzQA==', res => {
  console.log('1919 redirect:', res.headers.location);
});
