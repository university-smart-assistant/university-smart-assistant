
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("GEMINI_API_KEY topilmadi!");
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey });

    app.post("/ask", async (req, res) => {
        try {
            const question = req.body.question;
            const documents = req.body.documents || [];
            const history = req.body.history || [];

            if (!question || !question.trim()) {
                return res.status(400).json({
                    error: "Iltimos, savol kiriting."
                });
            }

            if (!Array.isArray(documents) || !Array.isArray(history)) {
                return res.status(400).json({
                    error: "Yuborilgan ma'lumot formati noto‘g‘ri."
                });
            }

            const documentText = documents
                .map((doc, index) =>
                    `Hujjat ${index + 1}: ${doc.title || "Nomsiz"}\n${doc.content || ""}`
                )
                .join("\n\n")
                .slice(0, 30000);

            const historyText = history
                .slice(-12)
                .map(item => {
                    const role = item.role === "model" ? "AI" : "Foydalanuvchi";
                    return `${role}: ${item.text || ""}`;
                })
                .join("\n");

            const prompt = `
Siz University Smart Assistant nomli aqlli universitet yordamchisisiz.

VAZIFALARINGIZ:
1. Foydalanuvchining salomlashishiga samimiy javob bering.
2. Umumiy savollarga tushunarli va foydali javob bering.
3. Universitet haqidagi savollarga mavjud hujjatlar asosida javob bering.
4. Hujjatlarda javob bo‘lmasa, buni ochiq ayting.
5. O‘zbek tilida sodda va tushunarli yozing.
6. Savolga bevosita javob bering.

UNIVERSITET HUJJATLARI:
${documentText || "Hozircha universitet hujjatlari kiritilmagan."}

OLDINGI SUHBAT:
${historyText || "Suhbat yangi boshlandi."}

FOYDALANUVCHINING HOZIRGI SAVOLI:
${question}
`;

            const result = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: prompt
            });

            const answer = result.text;

            if (!answer) {
                return res.json({
                    answer: "Hozircha javob topilmadi. Qayta urinib ko‘ring."
                });
            }

            res.json({ answer });

        } catch (error) {
            console.error("Gemini xatosi:", error);

            res.status(500).json({
                error: "AI javob berishda xatolik yuz berdi."
            });
        }
    });

    app.listen(PORT, () => {
        console.log(`Server ${PORT} portda ishga tushdi.`);
    });
}

startServer().catch(error => {
    console.error("Serverni ishga tushirishda xatolik:", error);
    process.exit(1);
});
