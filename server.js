const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Store connected users in memory
const users = new Map();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User joins
    socket.on("join", (username) => {
        username = String(username || "Guest").trim().substring(0, 20);

        if (!username) {
            username = "Guest";
        }

        users.set(socket.id, username);

        // Send current user list
        io.emit("users", Array.from(users.values()));

        // Notify everyone
        socket.broadcast.emit("systemMessage", {
            message: `${username} joined the chat`
        });
    });

    // Receive chat message
    socket.on("chatMessage", (message) => {
        const username = users.get(socket.id);

        if (!username) return;

        message = String(message || "").trim();

        if (!message) return;

        // Limit message length
        message = message.substring(0, 500);

        io.emit("chatMessage", {
            username,
            message,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })
        });
    });

    // Typing indicator
    socket.on("typing", () => {
        const username = users.get(socket.id);

        if (username) {
            socket.broadcast.emit("typing", username);
        }
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
    });

    // User disconnects
    socket.on("disconnect", () => {
        const username = users.get(socket.id);

        if (username) {
            users.delete(socket.id);

            io.emit("users", Array.from(users.values()));

            socket.broadcast.emit("systemMessage", {
                message: `${username} left the chat`
            });
        }

        console.log("User disconnected:", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});