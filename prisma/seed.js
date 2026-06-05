const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
    {
        question: "What is the name for a portable computer that folds?",
        answer: "Laptop",
        keywords: ["device"]
    },
    {
        question: "What does CPU stand for?",
        answer: "Central Processing Unit",
        keywords: ["unit"]
    },
    {
        question: "What does URL stand for?",
        answer: "Uniform Resource Locator",
        keywords: ["locator"]
    },
    {
        question: "What does HTTP stand for?",
        answer: "Hypertext Transfer Protocol",
        keywords: ["http"]
    },
];

async function main() {
    await prisma.question.deleteMany();
    await prisma.keyword.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash("1234", 10);
    const user = await prisma.user.create({
        data: {
        email: "admin@example.com",
        password: hashedPassword,
        name: "Admin User",
        },
    });

    console.log("Created user:", user.email);

    for (const item of seedQuestions) {
        await prisma.question.create({
            data: {
                question: item.question, 
                answer: item.answer,
                userId: user.id,
                keywords: {
                    connectOrCreate: item.keywords.map((kw) => ({
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