const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
    {
        question: "What is the 4th letter of the Greek alphabet?",
        answer: "Delta",
        keywords: ["alphabet", "letter"]
    },
    {
        question: "What is acrophobia a fear of?",
        answer: "Heights",
        keywords: ["acrophobia", "fear"]
    },
    {
        question: "What phone company produced the 3310? ",
        answer: "Nokia",
        keywords: ["phone", "company"]
    },
    {
        question: "How many elements are in the periodic table?",
        answer: "118",
        keywords: ["elements", "periodic"]
    },
];

async function main() {
    await prisma.question.deleteMany();
    await prisma.keyword.deleteMany();

    for (const q of seedQuestions) {
        await prisma.question.create({
            data: {
                question: q.question,
                answer: q.answer,
                keywords: {
                    connectOrCreate: q.keywords.map((kw) => ({
                        where: { name: kw },
                        create: { name: kw },
                    })),
                },
            },
        });
    }

    console.log("Seed quiz inserted successfully");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());