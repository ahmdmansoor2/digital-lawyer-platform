import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const currentFilename = typeof __filename !== "undefined" ? __filename : fileURLToPath(import.meta.url);
const currentDirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(currentFilename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set high limits to accept large base64 scanned documents/images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize server-side Gemini client
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = geminiApiKey
    ? new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // In-memory store for print jobs to bypass iframe storage-partitioning limitations
  const printJobs = new Map<string, { html: string; title: string; createdAt: number }>();

  // Cleanup stale print jobs (older than 10 minutes) every minute
  setInterval(() => {
    const now = Date.now();
    for (const [id, job] of printJobs.entries()) {
      if (now - job.createdAt > 10 * 60 * 1000) {
        printJobs.delete(id);
      }
    }
  }, 60 * 1000);

  // Endpoint to save a transient print job
  app.post("/api/print/save", (req, res) => {
    const { html, title } = req.body;
    if (!html) {
      return res.status(400).json({ error: "لم يتم تحديد محتوى للطباعة" });
    }
    const jobId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    printJobs.set(jobId, {
      html,
      title: title || "مستند",
      createdAt: Date.now()
    });
    res.json({ jobId });
  });

  // Endpoint to fetch a transient print job
  app.get("/api/print/get/:jobId", (req, res) => {
    const { jobId } = req.params;
    const job = printJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: "عفواً، انتهت صلاحية جلسة الطباعة هذه أو لم تكن موجودة. يرجى إعادة محاولة الطباعة." });
    }
    res.json({ html: job.html, title: job.title });
  });

  // AI OCR and Legal Document Classification Route
  app.post("/api/gemini/ocr", async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({
          error: "المساعد الذكي لم يتم تهيئته. يرجى تفعيل مفتاح GEMINI_API_KEY في الإعدادات.",
        });
      }

      const { dataUrl, mimeType } = req.body;
      if (!dataUrl) {
        return res.status(400).json({ error: "لم يتم تقديم محتوى مستند ممسوح ضوئياً." });
      }

      // Parse the base64 payload
      const base64Data = dataUrl.split(",")[1] || dataUrl;
      const fileMime = mimeType || dataUrl.split(";")[0].split(":")[1] || "image/jpeg";

      // Precise prompt for Egyptian legal documents classification and structured OCR
      const prompt = `قم بقراءة هذا المستند القانوني المصري بالكامل بدقة متناهية (OCR) واستخراج كافة البيانات المطلوبة باللغة العربية الفصحى.
توقع واستخرج الحقول التالية بدقة:
1. نص المستند الكامل والمكتوب باللغة العربية بأسلوب قانوني فليغ (extractedText).
2. اسم مقترح ملائم للمستند بالعربية يعبر عن موضوعه (docName).
3. نوع المستند بالعربية، ويجب أن يكون أحد هذه الأنواع حصراً: "عريضة دعوى"، "حكم قضائي"، "توكيل رسمي"، "مذكرة دفاع"، أو "أخرى" (docType).
4. أسماء الخصوم أو الأطراف أو الموكلين المذكورين في الوثيقة (parties).
5. أي تواريخ هامة مذكورة بالوثيقة مثل تاريخ الجلسة أو الإعلان أو الحكم (dates).
6. رقم الدعوى أو القضية أو الملف القضائي التابع للمحكمة إن وجد (caseNumber).
7. ملخص تنفيذي موجز لمضمون المستند وأهم الإجراءات الواردة به (summary).`;

      // Multimodal Gemini content generation
      const docPart = {
        inlineData: {
          mimeType: fileMime,
          data: base64Data,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [docPart, { text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedText: {
                type: Type.STRING,
                description: "The complete transcribed Arabic text of the document with proper formatting."
              },
              docName: {
                type: Type.STRING,
                description: "A short professional Arabic title for the document."
              },
              docType: {
                type: Type.STRING,
                description: "Document type: must be 'عريضة دعوى', 'حكم قضائي', 'توكيل رسمي', 'مذكرة دفاع', or 'أخرى'."
              },
              parties: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of parties, clients, or defendants names mentioned."
              },
              dates: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of key dates mentioned in the document."
              },
              caseNumber: {
                type: Type.STRING,
                description: "The case number, docket ID or court file reference if found."
              },
              summary: {
                type: Type.STRING,
                description: "A clean Arabic summary of the document contents."
              }
            },
            required: ["extractedText", "docName", "docType"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("لم يرجع ذكاء Gemini أي نصوص للمستند ممسوح ضوئياً.");
      }

      const parsedResult = JSON.parse(resultText);
      res.json(parsedResult);
    } catch (error: any) {
      console.error("Gemini OCR server error:", error);
      res.status(500).json({ error: error.message || "فشل معالجة المستند عبر ذكاء اصطناعي Gemini" });
    }
  });

  // Serve static client bundle or route via Vite middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
