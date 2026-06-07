const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");
beforeEach(resetDb);

describe("questions tests", () => {
    it("returns 401 without a token", async () => {
        const res = await request(app).get("/api/questions");
        expect(res.status).toBe(401);
    });

    it("returns 404 for unknown questions", async () => {
        const token = await registerAndLogin("q404@test.io", "Q404", "editor");
        const res = await request(app).get("/api/questions/99999")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Question not found");
    });

    it("returns 400 for invalid questions body", async () => {
        const token = await registerAndLogin("a@test.io", "A", "editor");
        const res = await request(app).post("/api/questions")
            .set("Authorization", `Bearer ${token}`)
            .send({ question: "" });
        expect(res.status).toBe(400);
    });

    it("returns 403 when editing someone else's question", async () => {
        const aliceToken = await registerAndLogin("alice@test.io", "Alice", "editor");
        const question = await createQuestion(aliceToken, {
            question: "Alice's question",
            answer: "Answer A"
        });

        const bobToken = await registerAndLogin("bob@test.io", "Bob", "editor");
        const res = await request(app).put(`/api/questions/${question.id}`)
            .set("Authorization", `Bearer ${bobToken}`)
            .send({ question: "hijacked", answer: "hacked answer" });

        expect(res.status).toBe(403);

        const after = await prisma.question.findUnique({ where: { id: question.id } });
        expect(after.question).toBe("Alice's question");
    });

    it("returns up to 10 random questions", async () => {
        const token = await registerAndLogin("a@test.io", "A", "editor");

        for (let i = 0; i < 12; i++) {
            await createQuestion(token, { question: `Q${i}`, answer: `A${i}` });
        }

        const res = await request(app)
            .get("/api/questions/random")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(10);
    });

    it("returns top 5 leaderboard users", async () => {
        const aliceToken = await registerAndLogin("alice@test.io", "Alice", "editor");
        const bobToken   = await registerAndLogin("bob@test.io",   "Bob",   "editor");
        const carolToken = await registerAndLogin("carol@test.io", "Carol", "editor");

        const q = await createQuestion(aliceToken, { question: "Q", answer: "A" });

        await request(app).post(`/api/questions/${q.id}/play`)
            .set("Authorization", `Bearer ${aliceToken}`).send({ answer: "A" });
        await request(app).post(`/api/questions/${q.id}/play`)
            .set("Authorization", `Bearer ${aliceToken}`).send({ answer: "A" });
        await request(app).post(`/api/questions/${q.id}/play`)
            .set("Authorization", `Bearer ${bobToken}`).send({ answer: "A" });

        const res = await request(app)
            .get("/api/users/leaderboard")
            .set("Authorization", `Bearer ${aliceToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeLessThanOrEqual(5);
        expect(res.body[0].name).toBe("Alice");
        expect(res.body[0].correctAttempts).toBe(2);
        expect(res.body[1].name).toBe("Bob");
        expect(res.body[1].correctAttempts).toBe(1);
    });

    it("supports multiple choice questions", async () => {
        const token = await registerAndLogin("a@test.io", "A", "editor");

        const res = await request(app)
            .post("/api/questions")
            .set("Authorization", `Bearer ${token}`)
            .send({
                question: "What is the capital of France?",
                answer: "Paris",
                choices: "Paris,London,Berlin,Madrid"
            });

        expect(res.status).toBe(201);
        expect(res.body.choices).toEqual(["Paris", "London", "Berlin", "Madrid"]);

        const play1 = await request(app)
            .post(`/api/questions/${res.body.id}/play`)
            .set("Authorization", `Bearer ${token}`)
            .send({ answer: "Paris" });
        expect(play1.body.correct).toBe(true);

        const play2 = await request(app)
            .post(`/api/questions/${res.body.id}/play`)
            .set("Authorization", `Bearer ${token}`)
            .send({ answer: "London" });
        expect(play2.body.correct).toBe(false);

        const play3 = await request(app)
            .post(`/api/questions/${res.body.id}/play`)
            .set("Authorization", `Bearer ${token}`)
            .send({ answer: "Tokyo" });
        expect(play3.status).toBe(400);
    });

    it("players cannot create questions", async () => {
        const playerToken = await registerAndLogin("player@test.io", "Player", "player");
        const res = await request(app).post("/api/questions")
            .set("Authorization", `Bearer ${playerToken}`)
            .send({ question: "Q", answer: "A" });
        expect(res.status).toBe(403);
    });

    it("admins can edit other users questions", async () => {
        const editorToken = await registerAndLogin("editor@test.io", "Editor", "editor");
        const adminToken  = await registerAndLogin("admin@test.io",  "Admin",  "admin");

        const question = await createQuestion(editorToken, {
            question: "Original", answer: "Original Answer"
        });

        const res = await request(app).put(`/api/questions/${question.id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ question: "Updated by admin", answer: "Updated Answer" });

        expect(res.status).toBe(200);
        expect(res.body.question).toBe("Updated by admin");
    });

    it("editors cannot edit other users questions", async () => {
        const alice = await registerAndLogin("alice2@test.io", "Alice2", "editor");
        const bob   = await registerAndLogin("bob2@test.io",   "Bob2",   "editor");

        const question = await createQuestion(alice, { question: "Alice Q", answer: "A" });

        const res = await request(app).put(`/api/questions/${question.id}`)
            .set("Authorization", `Bearer ${bob}`)
            .send({ question: "Stolen", answer: "Stolen" });

        expect(res.status).toBe(403);
    });

    it("players cannot edit questions", async () => {
        const editorToken = await registerAndLogin("editor3@test.io", "Editor3", "editor");
        const playerToken = await registerAndLogin("player2@test.io", "Player2", "player");

        const question = await createQuestion(editorToken, { question: "Q", answer: "A" });

        const res = await request(app).put(`/api/questions/${question.id}`)
            .set("Authorization", `Bearer ${playerToken}`)
            .send({ question: "hacked", answer: "hacked" });

        expect(res.status).toBe(403);
    });
});