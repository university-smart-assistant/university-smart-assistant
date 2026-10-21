const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("University Smart Assistant AI server ishlayapti!");
});

app.post("/ask", async (req, res) => {
  try {
    const question = req.body.question;
    const documents = req.body.documents || [];

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Savol kiriting."
      });
    }

    if (!documents.length) {
      return res.json({
        answer: "Iltimos, avval universitet hujjatlarini tizimga qo‘shing."
      });
    }

    const documentText = documents
      .map((doc, index) =>
        `Hujjat ${index + 1}: ${doc.title || "Nomsiz"}\n${doc.content || ""}`
      )
      .join("\n\n");

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions:
        "Siz universitet uchun savol-javob yordamchisisiz. Faqat foydalanuvchi bergan hujjatlardagi ma'lumotlarga asoslanib, o'zbek tilida qisqa va aniq javob bering. Javob hujjatlarda bo'lmasa, bu haqda ochiq ayting. Ma'lumotni to'qib chiqarmang.",
      input:
        "Universitet hujjatlari:\n" +
        documentText +
        "\n\nTalaba savoli:\n" +
        question
    });

    res.json({
      answer: response.output_text
    });
  } catch (error) {
    console.error("AI xatosi:", error.message);

    res.status(500).json({
      error: "AI javobini olishda xatolik yuz berdi. Server sozlamalarini tekshiring."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi.`);
});
