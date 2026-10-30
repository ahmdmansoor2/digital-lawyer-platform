const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const sameAsMatches = indexHtml.match(/"sameAs":\s*\[[^\]]*\]/g);
console.log('sameAs in root index.html:', sameAsMatches);

// Let's check scripts/youtube-publisher/youtube-published-log.json for channel or URLs
if (fs.existsSync('scripts/youtube-publisher/youtube-published-log.json')) {
  console.log('YouTube log:', fs.readFileSync('scripts/youtube-publisher/youtube-published-log.json', 'utf8'));
}

// Let's check .env for FB or YouTube links
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.includes('FB_') || line.includes('YT_') || line.includes('PAGE_ID') || line.includes('YOUTUBE')) {
      console.log(line.replace(/=.*/, '=***'));
    }
  });
}
