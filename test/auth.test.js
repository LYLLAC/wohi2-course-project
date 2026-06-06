const { resetDb, request, app, prisma } = require("./helpers");
const bcrypt = require("bcrypt");

beforeEach(async () => {
    await resetDb();
});

it("registers, hashes the password, returns a token", async () => {
    const res = await request(app)
        .post("/api/auth/register")
        .send({
            email: "auth@test.io",
            password: "pw12345",
            name: "A"
        });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));

    const user = await prisma.user.findUnique({ where: { email: "auth@test.io" } });

    expect(user.password).not.toBe("pw12345");
    expect(await bcrypt.compare("pw12345", user.password)).toBe(true);
});