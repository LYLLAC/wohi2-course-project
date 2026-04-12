const express = require("express");
const router = express.Router();

const questions = require("../data/questions");

// GET /api/questions/
router.get("/", (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.json(questions);
    }

    const filteredQuestions = questions.filter(q =>
        q.keywords.includes(keyword.toLowerCase())
    );

    res.json(filteredQuestions);
});

//Get /api/questions/:questionId
router.get("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = questions.find((q) => q.id === questionId);

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    res.json(question);
});

//Post /api/questions
router.post("/", (req, res) => {
    const {question, answer, keywords} = req.body;

    if (!question || !answer) {
        return res.status(400).json({
            message: "question and answer are required"
        });
    }
    const maxId = Math.max(...questions.map(q => q.id), 0);
    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        question, answer,
        keywords: Array.isArray(keywords) ? keywords : []
    };
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
});

//PUT /api/questions/:questionId
router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const { question, answer, keywords } = req.body;

    const questionToUpdate = questions.find((q) => q.id === questionId);

    if (!questionToUpdate) {
        return res.status(404).json({ message: "Question not found" });
    }

    if (!question || !answer) {
        return res.status(400).json({
            message: "question and answer are required"
        });
    }

    questionToUpdate.question = question;
    questionToUpdate.answer = answer;
    questionToUpdate.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(questionToUpdate);
});


// DELETE /api/questions/:questionId
router.delete("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const questionIndex = questions.findIndex((q) => q.id === questionId);

    if (questionIndex === -1) {
        return res.status(404).json({ message: "Question not found" });
    }
    const deletedQuestion = questions.splice(questionIndex, 1);
    res.json({
        message: "Question deleted successfully",
        question: deletedQuestion[0]
    });
});

module.exports = router;