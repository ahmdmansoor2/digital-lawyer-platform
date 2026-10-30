const fs = require('fs');
const path = require('path');
const { fetchUrl } = require('./fetch_helper.cjs');

async function inspectNode(nodeId) {
  const url = `https://manshurat.org/node/${nodeId}`;
  const res = await fetchUrl(url);
  const html = res.buffer.toString('utf8');
  
  // Find title
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'No title';
  
  // Find pdf links
  const pdfMatches = html.match(/href="([^"]*\.pdf[^"]*)"/gi) || [];
  
  // Find img links
  const imgMatches = html.match(/src="([^"]*\.(?:png|jpg|jpeg)[^"]*)"/gi) || [];
  
  console.log(`Node ${nodeId}: ${title}`);
  console.log('PDFs:', pdfMatches);
  console.log('Images count:', imgMatches.length);
  if (imgMatches.length > 0) {
    console.log('Sample images:', imgMatches.slice(0, 5));
  }
}

inspectNode(13372).catch(console.error);
