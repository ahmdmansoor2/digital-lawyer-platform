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

async function getRunJobs(runId) {
  return new Promise((resolve) => {
    https.get(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
      });
    }).on('error', () => resolve({}));
  });
}

(async () => {
  console.log('=== Jobs for Run 39042691262 (الناشر الذكي - in_progress) ===');
  const smartJobs = await getRunJobs('39042691262');
  if (smartJobs.jobs) {
    smartJobs.jobs.forEach(j => {
      console.log(`Job: ${j.name} | Status: ${j.status} | Started: ${j.started_at}`);
      j.steps?.forEach(s => {
        console.log(`   Step: ${s.name} | Status: ${s.status} | Conclusion: ${s.conclusion}`);
      });
    });
  }

  console.log('\n=== Jobs for Run 39045008244 (ريلز فيسبوك - failure) ===');
  const reelsJobs = await getRunJobs('39045008244');
  if (reelsJobs.jobs) {
    reelsJobs.jobs.forEach(j => {
      console.log(`Job: ${j.name} | Status: ${j.status} | Conclusion: ${j.conclusion}`);
      j.steps?.forEach(s => {
        if (s.conclusion === 'failure' || s.status !== 'completed') {
          console.log(`   FAILED Step: ${s.name} | Status: ${s.status} | Conclusion: ${s.conclusion}`);
        }
      });
    });
  }
})();
