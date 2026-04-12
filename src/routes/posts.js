const express = require("express");
const router = express.Router();

const posts = require("../data/posts");

// GET /api/posts/
router.get("/", (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.json(posts);
    }

    const filteredPosts = posts.filter(post =>
        post.keywords.includes(keyword.toLowerCase())
    );

    res.json(filteredPosts);
});

//Get /api/posts/:postId
router.get("/:postId", (req, res) => {
    const postId = Number(req.params.postId);

    const post = posts.find((p) => p.id === postId);

    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
});

//Post /api/posts
router.post("/", (req, res) => {
    const {title, date, content, keywords} = req.body;

    if (!title || !date || !content) {
        return res.status(400).json({
            message: "title, date, and content are required"
        });
    }
    const maxId = Math.max(...posts.map(p => p.id), 0);
    const newPost = {
        id: posts.length ? maxId + 1 : 1,
        title, date, content,
        keywords: Array.isArray(keywords) ? keywords : []
    };
    posts.push(newPost);
    res.status(201).json(newPost);
});

// DELETE /api/posts/:postId
router.delete("/:postId", (req, res) => {
    const postId = Number(req.params.postId);
    const postIndex = posts.findIndex((p) => p.id === postId);

    if (postIndex === -1) {
        return res.status(404).json({ message: "Post not found" });
    }
    const deletedPost = posts.splice(postIndex, 1);
    res.json({
        message: "Post deleted successfully",
        post: deletedPost[0]
    });
});

module.exports = router;