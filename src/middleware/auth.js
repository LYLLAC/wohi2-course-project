const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const SECRET = process.env.JWT_SECRET;
const { UnauthorizedError } = require("../lib/errors");

async function authenticate(req, res, next) {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer "))
        return next(new UnauthorizedError("No token provided"));
    try {
        const payload = jwt.verify(h.split(" ")[1], SECRET, { algorithms: ["HS256"] });

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) return next(new UnauthorizedError("User not found"));
        req.user = { userId: user.id, role: user.role };
        next();
    } catch {
        next(new UnauthorizedError("Invalid or expired token"));
    }
}

module.exports = authenticate;