const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("University Smart Assistant Gemini server ishlayapti!");
});

async function startServer() {
  const { GoogleGenAI } = await import("@google/genai");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  app.post("/ask", async (req, res) => {
    try {
      const question = req.body.question;
      const documents = req.body.documents || [];

      if (!question || !question.trim()) {
        return res.status(400).json({
          error: "Iltimos, savol kiriting."
        });
      }

      if (!Array.isArray(documents) || documents.length === 0) {
        return res.json({
          answer: "Iltimos, avval universitet hujjatlarini tizimga qo‘shing."
        });
      }

      const documentText = documents.map((doc, index) => {
        return `Hujjat ${index + 1}: ${doc.title || "Nomsiz"}
${doc.content || ""}`;
      }).join("\n\n");

      const prompt = `
Siz University Smart Assistant nomli universitet yordamchisisiz.

Faqat quyida berilgan universitet hujjatlariga asoslanib javob bering.
O‘zbek tilida, sodda va tushunarli javob yozing.
Agar javob hujjatlarda mavjud bo‘lmasa, buni ochiq ayting.
Hech qanday ma'lumotni o‘zingizdan to‘qib chiqarmang.

UNIVERSITET HUJJATLARI:
${documentText.slice(0, 30000)}

TALABA SAVOLI:
${question}
`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      res.json({
        answer: result.text || "Hozircha javob topilmadi."
      });

    } catch (error) {
      console.error("Gemini xatosi:", error.message);

      res.status(500).json({
        error: "AI javobini olishda xatolik yuz berdi."
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishga tushdi.`);
  });
}

startServer().catch(error => {
  console.error("Serverni ishga tushirish xatosi:", error);
  process.exit(1);
});
