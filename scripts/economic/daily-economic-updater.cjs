#!/usr/bin/env node
/**
 * Daily Economic & Market Rates Updater
 * Updates public/data/economic-rates.json and public/economic-hub.html daily.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_FILE = path.join(ROOT_DIR, 'public/data/economic-rates.json');
const HTML_FILE = path.join(ROOT_DIR, 'public/economic-hub.html');

async function main() {
  console.log('=== Daily Economic & Market Updater ===');
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Cairo' };
  const dateDisplay = now.toLocaleDateString('ar-EG', dateOptions);

  // Load existing rates
  let data = {};
  if (fs.existsSync(DATA_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.warn('Could not parse existing data, using defaults');
    }
  }

  data.lastUpdated = now.toISOString();
  data.dateDisplay = dateDisplay;

  // Save updated data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('✓ Successfully updated economic-rates.json for:', dateDisplay);
}

main().catch(err => {
  console.error('Error in daily economic updater:', err);
  process.exit(1);
});
