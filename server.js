
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

// Matnni so'zlarga ajratish
function getWords(text) {
    return (text.toLowerCase().match(/[a-zа-яёўғқҳ0-9]+/gi) || [])
        .filter(word => word.length > 2);
}

// Hujjatlarni kichik qismlarga ajratish
function splitIntoChunks(documents) {
    const chunks = [];

    documents.slice(0, 20).forEach((doc, index) => {
        const content = String(doc.content || "");
        const size = 1000;
        const overlap = 150;

        for (let i = 0; i < content.length; i += size - overlap) {
            const part = content.slice(i, i + size);

            if (part.trim()) {
                chunks.push({
                    title: doc.title || "Nomsiz hujjat",
                    fileName: doc.fileName || doc.title || "Noma'lum fayl",
                    type: doc.type || "Boshqa",
                    content: part,
                    documentIndex: index
                });
            }
        }
    });

    return chunks;
}

// Savolga mos hujjat qismlarini topish
function searchChunks(question, chunks) {
    const questionWords = [...new Set(getWords(question))];

    const scored = chunks.map(chunk => {
        const text = chunk.content.toLowerCase();
        let score = 0;

        questionWords.forEach(word => {
            if (text.includes(word)) {
                score += 1;
            }
        });

        const titleWords = getWords(
            chunk.title + " " + chunk.fileName
        );

        questionWords.forEach(word => {
            if (titleWords.includes(word)) {
                score += 2;
            }
        });

        return { ...chunk, score };
    });

    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
}

async function generateAnswer(ai, model, prompt) {
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(`AI modeli: ${model}, urinish: ${attempt}`);

            const result = await ai.models.generateContent({
                model: model,
                contents: prompt
            });

            if (!result.text) {
                throw new Error("AI javob qaytarmadi.");
            }

            return result.text;

        } catch (error) {
            lastError = error;
            console.error(error.message);

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

    const ai = new GoogleGenAI({ apiKey });

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
                    error: "Ma'lumot formati noto'g'ri."
                });
            }

            // Hujjatlarni qismlarga ajratish
            const chunks = splitIntoChunks(documents);

            // Savolga mos qismlarni qidirish
            const foundChunks = searchChunks(question, chunks);

            const documentText = foundChunks.length
                ? foundChunks.map((chunk, index) =>
                    `MANBA ${index + 1}:
Hujjat: ${chunk.title}
Fayl: ${chunk.fileName}
Turi: ${chunk.type}
Matn:
${chunk.content}`
                ).join("\n\n")
                : "Savolga mos hujjat qismi topilmadi.";

            const historyText = history
                .slice(-12)
                .map(item => {
                    const role =
                        item.role === "model" ? "AI" : "Foydalanuvchi";

                    return `${role}: ${item.text || ""}`;
                })
                .join("\n");

            const prompt = `
Siz University Smart Assistant nomli
aqlli universitet yordamchisisiz.

VAZIFALARINGIZ:
1. Foydalanuvchining savoliga tushunarli javob bering.
2. Avvalo topilgan hujjat qismlaridan foydalaning.
3. Hujjatdagi ma'lumotni o'zgartirib yubormang.
4. Hujjatda yo'q rasmiy ma'lumotni o'ylab topmang.
5. Hujjatda javob bo'lmasa, buni ochiq ayting.
6. Umumiy bilim asosida javob bersangiz,
   uni umumiy ma'lumot deb belgilang.
7. Javobni o'zbek tilida sodda va batafsil yozing.
8. Foydalanilgan hujjat nomini javob oxirida ko'rsating.

TOPILGAN HUJJAT QISMLARI:
${documentText}

OLDINGI SUHBAT:
${historyText || "Suhbat yangi boshlandi."}

FOYDALANUVCHINING SAVOLI:
${question}

JAVOB QOIDASI:
Agar hujjatdan foydalansangiz, oxirida:
Manba: [fayl nomi]

Agar hujjatdan mos ma'lumot topilmasa:
"Hujjatlar ichidan bu savolga mos ma'lumot topilmadi"
deb yozing. Keyin umumiy bilim asosida yordam berishingiz mumkin.
`;

            let answer;

            try {
                answer = await generateAnswer(
                    ai,
                    "gemini-3.8-flash",
                    prompt
                );
            } catch (error) {
                console.log("Zaxira model sinab ko'rilmoqda.");

                answer = await generateAnswer(
                    ai,
                    "gemini-3.6-flash",
                    prompt
                );
            }

            return res.json({
                answer: answer,
                sources: foundChunks.map(chunk => chunk.fileName)
            });

        } catch (error) {
            console.error("AI XATOSI:", error.message);

            return res.status(503).json({
                error: "AI vaqtincha javob bera olmayapti. Keyinroq urinib ko'ring."
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
    console.error("SERVER XATOSI:", error.message);
    process.exit(1);
});
