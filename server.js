
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("University Smart Assistant AI ishlayapti!");
});

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

async function generateAnswer(ai, model, prompt) {
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(
                `AI modeli: ${model}, urinish: ${attempt}`
            );

            const result = await ai.models.generateContent({
                model: model,
                contents: prompt
            });

            if (!result.text) {
                throw new Error("AI javob qaytarmadi.");
            }

            console.log(`Muvaffaqiyatli javob: ${model}`);

            return result.text;

        } catch (error) {
            lastError = error;

            console.error(
                `Model ${model} xatosi:`,
                error.message
            );

            if (attempt < 2) {
                await sleep(2000);
            }
        }
    }

    throw lastError;
}

async function startServer() {
    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY topilmadi!");
    }

    const ai = new GoogleGenAI({
        apiKey: apiKey
    });

    app.post("/ask", async (req, res) => {
        try {
            const question = req.body.question;
            const documents = req.body.documents || [];
            const history = req.body.history || [];

            if (
                typeof question !== "string" ||
                !question.trim()
            ) {
                return res.status(400).json({
                    error: "Iltimos, savol kiriting."
                });
            }

            if (
                !Array.isArray(documents) ||
                !Array.isArray(history)
            ) {
                return res.status(400).json({
                    error: "Ma'lumot formati noto‘g‘ri."
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
                    const role =
                        item.role === "model"
                            ? "AI"
                            : "Foydalanuvchi";

                    return `${role}: ${item.text || ""}`;
                })
                .join("\n");

            const prompt = `
Siz University Smart Assistant nomli
aqlli universitet yordamchisisiz.

ASOSIY VAZIFALARINGIZ:

1. Barcha savollarga yordam berish.
2. Salomlashishga samimiy javob berish.
3. Ingliz tili, matematika, informatika,
   dasturlash va boshqa fanlardan yordam berish.
4. Universitet haqidagi savollarga javob berish.
5. Avval universitet hujjatlaridan ma'lumot qidiring.
6. Hujjatda javob bo'lmasa, umumiy bilimlaringiz
   asosida tushunarli javob bering.
7. Hujjatlar bo'lmasa ham savollarga javob bering.
8. Jizzakh Sambhram University haqida yordam bering.
9. Kontrakt summasi, stipendiya miqdori,
   imtihon sanalari va rasmiy qoidalarni
   bilmasangiz, ularni o'ylab topmang.
10. Noma'lum ma'lumotni aniq fakt sifatida ko'rsatmang.
11. O'zbek tilida sodda va batafsil yozing.

UNIVERSITET HUJJATLARI:
${documentText || "Hozircha hujjatlar yuklanmagan. Umumiy bilimlaringiz asosida javob bering."}

OLDINGI SUHBAT:
${historyText || "Suhbat yangi boshlandi."}

FOYDALANUVCHINING SAVOLI:
${question}
`;

            let answer;

            try {
                answer = await generateAnswer(
                    ai,
                    "gemini-3.8-flash",
                    prompt
                );

            } catch (firstError) {
                console.log(
                    "Birinchi model javob bermadi. Zaxira model sinab ko‘riladi."
                );

                answer = await generateAnswer(
                    ai,
                    "gemini-3.6-flash",
                    prompt
                );
            }

            return res.json({
                answer: answer
            });

        } catch (error) {
            console.error(
                "YAKUNIY AI XATOSI:",
                error.message
            );

            return res.status(503).json({
                error: "AI vaqtincha javob bera olmayapti. Iltimos, birozdan keyin qayta urinib ko‘ring."
            });
        }
    });

    app.listen(PORT, () => {
        console.log(
            `University Smart Assistant serveri ${PORT} portda ishlayapti.`
        );
    });
}

startServer().catch(error => {
    console.error(
        "SERVER ISHGA TUSHISH XATOSI:",
        error.message
    );

    process.exit(1);
});
