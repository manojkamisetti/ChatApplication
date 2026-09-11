
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Connected users
const users = new Map();

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    // =========================
    // JOIN CHAT
    // =========================

    socket.on("join", (username) => {

        username = String(username || "Guest")
            .trim()
            .substring(0, 20);

        if (!username) {
            username = "Guest";
        }

        users.set(socket.id, username);

        sendUsers();

        socket.broadcast.emit("systemMessage", {
            message: `${username} joined the chat`
        });
    });


    // =========================
    // TEXT CHAT
    // =========================

    socket.on("chatMessage", (message) => {

        const username = users.get(socket.id);

        if (!username) return;

        message = String(message || "")
            .trim()
            .substring(0, 500);

        if (!message) return;

        io.emit("chatMessage", {
            username,
            message,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })
        });
    });


    // =========================
    // TYPING
    // =========================

    socket.on("typing", () => {

        const username = users.get(socket.id);

        if (username) {
            socket.broadcast.emit("typing", username);
        }
    });


    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
    });


    // =========================
    // VIDEO CALL
    // =========================

    // Caller asks another user to start a call
    socket.on("call-user", ({ target }) => {

        if (!users.has(target)) return;

        socket.to(target).emit("incoming-call", {
            caller: socket.id,
            callerName: users.get(socket.id)
        });
    });


    // Receiver accepts call
    socket.on("call-accepted", ({ caller }) => {

        socket.to(caller).emit("call-accepted", {
            receiver: socket.id
        });
    });


    // WebRTC offer
    socket.on("offer", ({ target, offer }) => {

        socket.to(target).emit("offer", {
            caller: socket.id,
            offer
        });
    });


    // WebRTC answer
    socket.on("answer", ({ target, answer }) => {

        socket.to(target).emit("answer", {
            answer
        });
    });


    // ICE candidate
    socket.on("ice-candidate", ({ target, candidate }) => {

        socket.to(target).emit("ice-candidate", {
            candidate
        });
    });


    // End call
    socket.on("end-call", ({ target }) => {

        if (target) {
            socket.to(target).emit("call-ended");
        }
    });


    // =========================
    // DISCONNECT
    // =========================

    socket.on("disconnect", () => {

        const username = users.get(socket.id);

        if (username) {

            users.delete(socket.id);

            sendUsers();

            socket.broadcast.emit("systemMessage", {
                message: `${username} left the chat`
            });

            // Tell anyone connected to this user
            socket.broadcast.emit("user-disconnected", {
                socketId: socket.id
            });
        }

        console.log("Disconnected:", socket.id);
    });


    function sendUsers() {

        const userList = [];

        users.forEach((username, socketId) => {

            userList.push({
                id: socketId,
                username
            });

        });

        io.emit("users", userList);
    }

});


server.listen(PORT, () => {

    console.log(`Chat server running on port ${PORT}`);

});

