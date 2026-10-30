const { fetchUrl } = require('./fetch_helper.cjs');

async function resolveUrl(url) {
  const res = await fetchUrl(url, 1);
  console.log('Location:', res.headers.location);
}

resolveUrl('https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFE8VYYbOc7rC35tzSLysTnR84LlXwWbBNchKZUPswaN3Akkq3puGIHnYgOwuMoJVu6d-0aRSXJKs1P0p7AijGbi4G7CNGmiUUUvmI6AZ9q_DHo8O8=').catch(console.error);
