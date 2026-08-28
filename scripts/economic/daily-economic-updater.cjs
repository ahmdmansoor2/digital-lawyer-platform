#!/usr/bin/env node
/**
 * Daily Economic & Market Rates Updater
 * Fetches real-time live rates from open financial APIs and updates public/data/economic-rates.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_FILE = path.join(ROOT_DIR, 'public/data/economic-rates.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Daily Real-Time Economic & Market Updater ===');
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Cairo' };
  const dateDisplay = now.toLocaleDateString('ar-EG', dateOptions);

  let data = {};
  if (fs.existsSync(DATA_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.warn('Using default skeleton');
    }
  }

  try {
    const [goldData, fxData] = await Promise.all([
      fetchJson('https://api.gold-api.com/price/XAU'),
      fetchJson('https://open.er-api.com/v6/latest/USD')
    ]);

    const usdEgp = fxData.rates.EGP || 50.25;
    const eurEgp = usdEgp / (fxData.rates.EUR || 0.858);
    const sarEgp = usdEgp / (fxData.rates.SAR || 3.75);
    const aedEgp = usdEgp / (fxData.rates.AED || 3.672);
    const kwdEgp = usdEgp / (fxData.rates.KWD || 0.308);

    const ounceUsd = goldData.price || 2515;
    const gram24kUsd = ounceUsd / 31.1034768;
    const gram24kEgp = Math.round(gram24kUsd * usdEgp);
    const gram21kEgp = Math.round(gram24kEgp * (21 / 24));
    const gram18kEgp = Math.round(gram24kEgp * (18 / 24));
    const goldPoundEgp = Math.round(gram21kEgp * 8);

    data.lastUpdated = now.toISOString();
    data.dateDisplay = dateDisplay;
    data.gold = {
      ounceUSD: parseFloat(ounceUsd.toFixed(2)),
      k24: gram24kEgp,
      k21: gram21kEgp,
      k18: gram18kEgp,
      goldPound: goldPoundEgp
    };
    data.currencies = {
      USD: { buy: parseFloat((usdEgp - 0.10).toFixed(2)), sell: parseFloat(usdEgp.toFixed(2)), name: "الدولار الأمريكي", symbol: "$" },
      EUR: { buy: parseFloat((eurEgp - 0.15).toFixed(2)), sell: parseFloat(eurEgp.toFixed(2)), name: "اليورو الأوروبي", symbol: "€" },
      SAR: { buy: parseFloat((sarEgp - 0.04).toFixed(2)), sell: parseFloat(sarEgp.toFixed(2)), name: "الريال السعودي", symbol: "ر.س" },
      AED: { buy: parseFloat((aedEgp - 0.04).toFixed(2)), sell: parseFloat(aedEgp.toFixed(2)), name: "الدرهم الإماراتي", symbol: "د.إ" },
      KWD: { buy: parseFloat((kwdEgp - 0.50).toFixed(2)), sell: parseFloat(kwdEgp.toFixed(2)), name: "الدينار الكويتي", symbol: "د.ك" }
    };

    console.log('✓ Fetched and computed real-time live rates successfully!');
  } catch (err) {
    console.warn('Could not fetch live API, maintaining existing rates:', err.message);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('✓ Successfully wrote data to', DATA_FILE);
}

main().catch(err => {
  console.error('Fatal error in updater:', err);
  process.exit(1);
});
