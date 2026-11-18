const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("University Smart Assistant AI ishlayapti!");
});

async function startServer() {
  const { GoogleGenAI } = await import("@google/genai");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  app.post("/ask", async (req, res) => {
    try {
      const question = String(req.body.question || "").trim();
      const documents = Array.isArray(req.body.documents)
        ? req.body.documents : [];
      const history = Array.isArray(req.body.history)
        ? req.body.history : [];

      if (!question) {
        return res.status(400).json({
          error: "Savol kiriting."
        });
      }

      const systemInstruction = `
Siz University Smart Assistant nomli aqlli yordamchisiz.

Siz ChatGPT kabi tabiiy suhbatlashing.

QOIDALAR:
- Salom desa: Salom! Yaxshimisiz? Sizga qanday yordam bera olaman? deb javob bering.
- Oddiy suhbatlashing.
- Informatika, ingliz tili, dasturlash va boshqa mavzularda yordam bering.
- O'zbek tilida sodda javob yozing.
- Oldingi suhbatlarni hisobga oling.
- Universitet haqidagi aniq ma'lumotlarda hujjatlarga tayaning.
- Hujjatlarda yo'q universitet ma'lumotlarini to'qimang.
`;

      const documentText = documents.slice(0, 40).map((doc, i) =>
        `Hujjat ${i + 1}: ${doc.title || ""}
Turi: ${doc.type || ""}
${doc.content || ""}`
      ).join("\n\n").slice(0, 30000);

      const safeHistory = history
        .filter(x => x &&
          (x.role === "user" || x.role === "model") &&
          typeof x.text === "string")
        .slice(-12)
        .map(x => ({
          role: x.role,
          parts: [{ text: x.text.slice(0, 4000) }]
        }));

      const contents = [
        ...safeHistory,
        {
          role: "user",
          parts: [{
            text: `
UNIVERSITET HUJJATLARI:
${documentText || "Hozircha hujjatlar kiritilmagan."}

FOYDALANUVCHI SAVOLI:
${question}
`
          }]
        }
      ];

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 1200
        }
      });

      res.json({
        answer: result.text || "Javob topilmadi."
      });

    } catch (error) {
      console.error("Gemini xatosi:", error);

      res.status(500).json({
        error: "AI javob berishda xatolik yuz berdi."
      });
    }
  });

  app.listen(PORT, () => {
    console.log("Server ishga tushdi: " + PORT);
  });
}

startServer().catch(error => {
  console.error(error);
  process.exit(1);
});
