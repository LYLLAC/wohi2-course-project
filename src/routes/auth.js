const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const SECRET = process.env.JWT_SECRET;
const { ValidationError, ConflictError, UnauthorizedError } = require("../lib/errors");

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            throw new ValidationError("Email, password and name are required");
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw new ConflictError("Email already registered");

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
        });

        const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
        res.status(201).json({ message: "User registered successfully", token });
    } catch (err) { next(err); }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ValidationError("email and password are required");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new UnauthorizedError("Invalid credentials");

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new UnauthorizedError("Invalid credentials");

        const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
        res.json({ token });
    } catch (err) { next(err); }
});

module.exports = router;