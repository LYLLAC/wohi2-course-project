const express = require('express');

const app = express();
const postsRouter = require("./routes/posts");
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());
app.use("/api/posts", postsRouter);
app.use((req, res) => {
    res.json({msg: "Not found"});
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
