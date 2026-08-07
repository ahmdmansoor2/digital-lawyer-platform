<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/de553af2-90ff-4f91-a95c-d319110fa346

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Daily automation (GitHub Actions)

- 📝 **الناشر الذكي** — مقالات + ترندات جوجل (كل 3 ساعات).
- 🎬 **ريلز فيسبوك** — فيديوهات قصيرة يومياً + رفعها على قناة فيروز YouTube.
- 🃏 **بطاقات تعليمية** — `card-publisher.cjs` يحوّل أعلى ترند جوجل لبطاقة 1200×628 منشورة على فيسبوك (10:00 القاهرة). تجربة يدوية: `node scripts/facebook-publisher/card-publisher.cjs --dry-run`
- 🩺 **مراقبة يومية** — تقارير صحية صباحاً ومساءً.
