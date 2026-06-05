const app = require("./app");
const logger = require("./lib/logger");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, "server listening");
});

async function shutdown() {
    await prisma.$disconnect();
    server.close(() => process.exit(0));
}
process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);
