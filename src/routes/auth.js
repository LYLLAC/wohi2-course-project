const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const SECRET = process.env.JWT_SECRET;
const { ValidationError, ConflictError, UnauthorizedError } = require("../lib/errors");

const VALID_ROLES = ["admin", "editor", "player"];

//POST /register
router.post("/register", async (req, res, next) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            throw new ValidationError("Email, password and name are required");
        }

        const assignedRole = role && VALID_ROLES.includes(role) ? role : "player";

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw new ConflictError("Email already registered");

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name, role: assignedRole },
        });

        const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
        res.status(201).json({ message: "User registered successfully", token });
    } catch (err){
        console.error("REGISTRATION ERROR:", err);
        next(err); 
    }
});

//POST /login
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