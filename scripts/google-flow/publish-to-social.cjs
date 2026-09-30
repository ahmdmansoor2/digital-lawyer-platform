/**
 * scripts/google-flow/publish-to-social.cjs
 * نشر ريلز الإيجار القديم على فيسبوك ويوتيوب
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const { publishReel } = require('../facebook-publisher/facebook-graph.cjs');
const { getValidAccessToken } = require('../youtube-publisher/youtube-oauth.cjs');

const DESKTOP = 'C:\\Users\\احمد منصور\\Desktop';
const VIDEO_PATH = path.join(DESKTOP, 'ريلز_الإيجار_القديم_فيسبوك_ويوتيوب.mp4');

const TITLE = 'حكم محكمة النقض في الإيجار القديم: متى يسقط العقد ويُطرد الورثة؟ ⚖️ #Shorts';
const DESCRIPTION = `حكم تاريخي لمحكمة النقض يُنهي جدل الإيجار القديم!

أكدت محكمة النقض في أحدث مبادئها أن الامتداد القانوني لعقد الإيجار بعد وفاة المستأجر الأصلي يتم (لمرة واحدة فقط) وبشروط إقامة صارمة، ولا يجوز توريثه عبر الأجيال.

⚖️ منصة المحامي الرقمية 2026 — مستشارك القانوني وموسوعة العدالة
🌐 ادخل المنصة واحسب مستحقاتك القانونية مجاناً:
👉 الموقع الرسمي: https://mohamidigital.online/

#Shorts #ريلز #الإيجار_القديم #محكمة_النقض #قانون_مصر #المحامي_الرقمي #استشارات_قانونية #أحمد_منصور`;

const HASHTAGS = ['Shorts', 'الإيجار_القديم', 'محكمة_النقض', 'قانون_مصر', 'المحامي_الرقمي', 'أحمد_منصور'];

async function uploadToYouTubeShorts() {
  console.log('\n[YouTube] 🔴 جارٍ رفع الريلز على YouTube Shorts...');
  const accessToken = await getValidAccessToken();
  const videoBuffer = fs.readFileSync(VIDEO_PATH);

  // 1) init resumable session
  const initResp = await fetch(
    'https://youtube.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({
        snippet: {
          title: TITLE.substring(0, 100),
          description: DESCRIPTION,
          tags: HASHTAGS,
          categoryId: '27', // Education
        },
        status: {
          privacyStatus: 'public',
          madeForKids: false,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (initResp.status !== 200) {
    const errText = await initResp.text();
    throw new Error(`YouTube init failed (${initResp.status}): ${errText}`);
  }

  const uploadUrl = initResp.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube did not return upload URL');

  // 2) upload binary
  console.log('[YouTube] جارٍ إرسال حزم الفيديو...');
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBuffer.length)
    },
    body: videoBuffer
  });

  if (uploadResp.status !== 200 && uploadResp.status !== 201) {
    const errText = await uploadResp.text();
    throw new Error(`YouTube upload failed (${uploadResp.status}): ${errText}`);
  }

  const data = await uploadResp.json();
  const videoId = data.id;
  const youtubeUrl = `https://www.youtube.com/shorts/${videoId}`;
  console.log(`[YouTube] ✅ تم النشر بنجاح على YouTube Shorts!`);
  console.log(`[YouTube] 🔗 الرابط: ${youtubeUrl}`);
  return { videoId, youtubeUrl };
}

async function uploadToFacebookReels() {
  console.log('\n[Facebook] 🔵 جارٍ نشر الريلز على Facebook Page...');
  const result = await publishReel({
    videoPath: VIDEO_PATH,
    description: `${TITLE}\n\n${DESCRIPTION}`
  });
  console.log(`[Facebook] ✅ تم النشر بنجاح على Facebook Reels!`);
  console.log(`[Facebook] 🔗 معرف الفيديو (Video ID): ${result.video_id}`);
  return result;
}

async function main() {
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error('❌ ملف الفيديو غير موجود:', VIDEO_PATH);
    process.exit(1);
  }

  console.log('🚀 بدء نشر الريلز على فيسبوك ويوتيوب دفعة واحدة...');
  
  const results = {};

  try {
    results.facebook = await uploadToFacebookReels();
  } catch (e) {
    console.error('❌ خطأ في نشر فيسبوك:', e.message);
    results.facebookError = e.message;
  }

  try {
    results.youtube = await uploadToYouTubeShorts();
  } catch (e) {
    console.error('❌ خطأ في نشر يوتيوب:', e.message);
    results.youtubeError = e.message;
  }

  console.log('\n=======================================');
  console.log('📊 تقرير النشر النهائي:');
  console.log(JSON.stringify(results, null, 2));
  console.log('=======================================');
}

main();
