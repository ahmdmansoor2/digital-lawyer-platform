const sharp = require('sharp');
const path = require('path');
const fontPath = path.resolve('D:/قانوني 7/scripts/facebook-publisher/fonts/Cairo.ttf');
const fileUrl = 'file:///' + fontPath;

async function render(weight) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120">
<defs><style>@font-face{font-family:"Cairo";src:url("${fileUrl}") format("truetype");}</style></defs>
<rect width="600" height="120" fill="#0f172a"/>
<text x="20" y="80" font-family="Cairo" font-size="44" font-weight="${weight}" fill="#ffffff">المحامي الرقمية</text>
</svg>`;
  return sharp(Buffer.from(svg), { density: 200 }).resize(600, 120).png().toBuffer();
}

(async () => {
  const w400 = await render(400);
  const w700 = await render(700);
  const w800 = await render(800);
  console.log('400:', w400.length, '| 700:', w700.length, '| 800:', w800.length);
  console.log('700 differs from 400:', w400.length !== w700.length);
  console.log('800 differs from 400:', w400.length !== w800.length);
})();
