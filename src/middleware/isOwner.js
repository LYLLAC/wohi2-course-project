const prisma = require("../lib/prisma");
const { NotFoundError, ForbiddenError } = require("../lib/errors");

async function isOwner(req, res, next) {
    try {
        const id = Number(req.params.questionId);
        const question = await prisma.question.findUnique({
            where: { id },
            include: { keywords: true },
        });

        if (!question) return next(new NotFoundError("Question not found"));

        const isAdmin = req.user.role === "admin";
        const isQuestionOwner = question.userId === req.user.userId;

        if (!isAdmin && !isQuestionOwner) {
            return next(new ForbiddenError("You can only modify your own questions"));
        }

        req.question = question;
        next();
    } catch (err) { next(err); }
}

module.exports = isOwner;