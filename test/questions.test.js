const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");
beforeEach(resetDb);

describe("questions tests", () => {
    it("returns 401 without a token", async () => {
        const res = await request(app).get("/api/questions");
        expect(res.status).toBe(401);
    });

    it("returns 404 for unknown questions", async () => {
        const token = await registerAndLogin();
        const res = await request(app).get("/api/questions/99999")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Question not found");
    });

    it("returns 400 for invalid questions body", async () => {
        const token = await registerAndLogin();
        const res = await request(app).post("/api/questions")
            .set("Authorization", `Bearer ${token}`)
            .send({ question: "" });
        expect(res.status).toBe(400);
    });

    it("returns 403 when editing someone else's question", async () => {
        const aliceToken = await registerAndLogin("alice@test.io", "Alice");
        const question = await createQuestion(aliceToken, {
            question: "Alice's question",
            answer: "Answer A"
        });

        const bobToken = await registerAndLogin("bob@test.io", "Bob");
        const res = await request(app).put(`/api/questions/${question.id}`)
            .set("Authorization", `Bearer ${bobToken}`)
            .send({
                question: "hijacked",
                answer: "hacked answer"
            });

        expect(res.status).toBe(403);

        const after = await prisma.question.findUnique({ where: { id: question.id } });
        expect(after.question).toBe("Alice's question");
    });
});
