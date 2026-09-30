/**
 * test-veo-api.cjs
 * فحص الاتصال وتوليد فيديو تجريبي عبر Google Veo 3.1 API
 */

const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testVeo() {
  console.log('🚀 جارٍ إرسال طلب توليد فيديو تجريبي إلى Google Veo 3.1 API...');
  
  try {
    const operation = await ai.models.generateVideos({
      model: 'models/veo-3.1-fast-generate-preview',
      prompt: 'Cinematic slow-motion shot of a wooden judge gavel striking a block with authority, brass scales of justice in background, golden warm lighting, 4k photorealistic',
      config: {
        aspectRatio: '16:9',
        durationSeconds: 5
      }
    });

    console.log('✅ تم بدء عملية التوليد بنجاح (Operation)!');
    console.log('📌 اسم العملية:', operation.name);
    console.log('⏳ العملية قيد المعالجة السحابية الآن...');
    return operation;
  } catch (err) {
    console.error('❌ خطأ أثناء استدعاء Veo API:', err.message);
    if (err.status) console.error('Status:', err.status);
    if (err.errorDetails) console.error('Details:', JSON.stringify(err.errorDetails, null, 2));
  }
}

testVeo();
