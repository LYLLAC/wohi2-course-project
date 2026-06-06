const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");

router.use(authenticate);

// GET /api/users/leaderboard
// Returns top 5 users with the most correct attempts
router.get("/leaderboard", async (req, res, next) => {
    try {
        const leaderboard = await prisma.user.findMany({
            take: 5,
            orderBy: {
                attempts: {
                    _count: "desc"
                }
            },
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        attempts: {
                            where: { correct: true }
                        }
                    }
                }
            }
        });

        const result = leaderboard
            .map(u => ({
                id: u.id,
                name: u.name,
                correctAttempts: u._count.attempts
            }))
            .sort((a, b) => b.correctAttempts - a.correctAttempts);

        res.json(result);
    } catch (err) { next(err); }
});

module.exports = router;