const https = require('https');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const repo = 'ahmdmansoor2/digital-lawyer-platform';

const headers = {
  'User-Agent': 'Node-HealthCheck',
  'Accept': 'application/vnd.github.v3+json'
};
if (token) headers['Authorization'] = 'Bearer ' + token;

https.get('https://api.github.com/repos/' + repo + '/actions/runs?per_page=15', { headers }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.workflow_runs) {
        json.workflow_runs.forEach(r => {
          console.log(`Run #${r.run_number} | ID: ${r.id} | ${r.name} | Status: ${r.status} | Conclusion: ${r.conclusion} | Time: ${r.updated_at}`);
          if (r.conclusion === 'failure') {
            console.log(`   HTML URL: ${r.html_url}`);
          }
        });
      } else {
        console.log('Response:', data.slice(0, 300));
      }
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', console.error);
