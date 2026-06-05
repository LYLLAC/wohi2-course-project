const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed"), false);
    }
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

function formatQuestion(question, currentUserId = null) {
    return {
        id: question.id,
        question: question.question,
        answer: question.answer,
        imageUrl: question.imageUrl ? `/uploads/${path.basename(question.imageUrl)}` : null,
        keywords: question.keywords.map((k) => k.name),
        userName: question.user?.name || null,
        likesCount: question._count?.likes ?? 0,
        likedByUser: currentUserId ? question.likes?.some(l => l.userId === currentUserId) : false,
        user: undefined,
        _count: undefined
    };
}
router.use(authenticate);

// GET /questions 
// List all questions 
router.get("/", async (req, res) => {
    const { keyword, search } = req.query;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let where = {};
    
    if (keyword) {
        where.keywords = { some: { name: keyword } };
    }
    
    if (search) {
        where.question = { contains: search };
    }

    const [questions, total] = await prisma.$transaction([
        prisma.question.findMany({
            where,
            include: { 
                keywords: true, 
                user: true,
                likes: true,
                _count: { select: { likes: true } }
            },
            orderBy: { id: "asc" },
            skip,
            take: limit
        }),
        prisma.question.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
        data: questions.map(q => formatQuestion(q, req.user.userId)),
        page,
        limit,
        total,
        totalPages
    });
});

// GET /questions/:questionId
// Show a specific questions
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { 
            keywords: true, 
            user: true,
            likes: true,
            _count: { select: { likes: true } }
        },
    });

    if (!question) {
        return res.status(404).json({ 
            message: "Question not found" 
        });
    }

    res.json(formatQuestion(question, req.user.userId));
});

// POST /questions
// Create a new question
router.post("/", upload.single("image"), async (req, res) => {
    const { question, answer, keywords } = req.body;

    if (!question || !answer) {
        return res.status(400).json({ 
            msg: "question and answer are mandatory" 
        });
    }

    let keywordsArray = [];
    if (keywords) {
        keywordsArray = Array.isArray(keywords) 
            ? keywords 
            : typeof keywords === "string" 
                ? keywords.split(",").map(k => k.trim()) 
                : [];
    }

    const newQuestion = await prisma.question.create({
        data: {
            question,
            answer,
            userId: req.user.userId,
            imageUrl: req.file ? req.file.path : null,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw }, 
                    create: { name: kw },
                })), 
            },
        },
        include: { 
            keywords: true, 
            user: true,
            _count: { select: { likes: true } }
        },
    });

    res.status(201).json(formatQuestion(newQuestion, req.user.userId));
});

// PUT /questions/:questionId
// Edit a question
router.put("/:questionId", isOwner, upload.single("image"), async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { question, answer, keywords } = req.body;
    
    const existingQuestion = await prisma.question.findUnique({ 
        where: { id: questionId } 
    });
    
    if (!existingQuestion) {
        return res.status(404).json({ message: "Question not found" });
    }

    if (!question || !answer) {
        return res.status(400).json({ msg: "question and answer are mandatory" });
    }

    let keywordsArray = [];
    if (keywords) {
        keywordsArray = Array.isArray(keywords) 
            ? keywords 
            : typeof keywords === "string" 
                ? keywords.split(",").map(k => k.trim()) 
                : [];
    }

    let updatedImageUrl = existingQuestion.imageUrl;
    if (req.file) {
        updatedImageUrl = req.file.path;
    }

    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
            question,
            answer,
            imageUrl: updatedImageUrl,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { 
            keywords: true, 
            user: true,
            likes: true,
            _count: { select: { likes: true } }
        },
    });
    
    res.json(formatQuestion(updatedQuestion, req.user.userId));
});

// DELETE /questions/:questionId
// Delete a question
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { keywords: true, user: true },
    });

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.question.delete({ where: { id: questionId } });

    res.json({
        message: "Question deleted successfully",
        question: formatQuestion(question, req.user.userId),
    });
});

// POST /api/questions/:questionId/like
router.post("/:questionId/like", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const userId = req.user.userId;

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return res.status(404).json({ error: "Question not found" });

    const existingLike = await prisma.like.findUnique({
        where: { userId_questionId: { userId, questionId } }
    });

    if (existingLike) {
        await prisma.like.delete({
            where: { userId_questionId: { userId, questionId } }
        });
        return res.json({ message: "Question unliked successfully" });
    } else {
        await prisma.like.create({
            data: { userId, questionId }
        });
        return res.json({ message: "Question liked successfully" });
    }
});

//POST /api/questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const userId = req.user.userId;
    const { answer } = req.body;

    if (!answer) {
        return res.status(400).json({ error: "Answer submission is required" });
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return res.status(404).json({ error: "Question not found" });

    const isCorrect = question.answer.trim().toLowerCase() === answer.trim().toLowerCase();

    const attempt = await prisma.attempt.create({
        data: {
            userId,
            questionId,
            correct: isCorrect,
            submittedAnswer: answer,
            correctAnswer: question.answer
        }
    });

    res.json({
        id: attempt.id,
        correct: attempt.correct,
        submittedAnswer: attempt.submittedAnswer,
        correctAnswer: attempt.correctAnswer,
        createdAt: attempt.createdAt
    });
});

module.exports = router;