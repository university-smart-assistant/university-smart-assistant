
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
                `Model: ${model}, urinish: ${attempt}`
            );

            const result = await ai.models.generateContent({
                model,
                contents: prompt
            });

            if (!result.text) {
                throw new Error("AI javob qaytarmadi.");
            }

            return result.text;

        } catch (error) {
            lastError = error;

            console.error(
                `${model} xatosi:`,
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

SIZNING VAZIFALARINGIZ:

1. Barcha savollarga yordam berish.
2. Salomlashishga samimiy javob berish.
3. Umumiy bilim, fanlar, ingliz tili,
   matematika, informatika va dasturlash
   savollariga javob berish.
4. Universitet haqidagi savollarga ham
   hujjatlar bo‘lmasa javob berishga harakat qilish.
5. Avval universitet hujjatlaridan ma'lumot qidiring.
6. Hujjatda javob bo‘lmasa, umumiy bilimlaringiz
   asosida tushuntirish bering.
7. Jizzakh Sambhram University haqida
   foydalanuvchiga yordam bering.
8. Kontrakt summasi, stipendiya miqdori,
   imtihon sanasi va rasmiy qoidalarni
   bilmasangiz, ularni o‘ylab topmang.
9. Noma'lum ma'lumotni aniq fakt sifatida ko‘rsatmang.
10. O‘zbek tilida sodda, batafsil va tushunarli yozing.

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

            } catch (error) {
                console.log(
                    "Birinchi model ishlamadi. Ikkinchi model tekshiriladi."
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
                "Yakuniy AI xatosi:",
                error
            );

            return res.status(503).json({
                error: "AI vaqtincha javob bera olmayapti. Iltimos, qayta urinib ko‘ring."
            });
        }
    });

    app.listen(PORT, () => {
        console.log(
            `Server ${PORT} portda ishga tushdi.`
        );
    });
}

startServer().catch(error => {
    console.error(
        "Serverni ishga tushirish xatosi:",
        error
    );

    process.exit(1);
});
