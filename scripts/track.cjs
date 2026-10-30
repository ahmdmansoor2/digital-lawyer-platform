const https = require('https');

function trackRedirects(url) {
  https.get(url, res => {
    console.log(res.statusCode, res.headers.location);
    if (res.headers.location) {
      trackRedirects(res.headers.location);
    }
  });
}

trackRedirects('https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFE8VYYbOc7rC35tzSLysTnR84LlXwWbBNchKZUPswaN3Akkq3puGIHnYgOwuMoJVu6d-0aRSXJKs1P0p7AijGbi4G7CNGmiUUUvmI6AZ9q_DHo8O8=');
