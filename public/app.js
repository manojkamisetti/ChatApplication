const socket = io();

let username = "";

const loginScreen = document.getElementById("loginScreen");
const chatApp = document.getElementById("chatApp");

const usernameInput = document.getElementById("usernameInput");
const joinButton = document.getElementById("joinButton");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const messages = document.getElementById("messages");
const userList = document.getElementById("userList");

const typingIndicator = document.getElementById("typingIndicator");
const onlineCount = document.getElementById("onlineCount");


// Join chat
joinButton.addEventListener("click", joinChat);

usernameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        joinChat();
    }
});


function joinChat() {

    username = usernameInput.value.trim();

    if (!username) {
        usernameInput.focus();
        return;
    }

    username = username.substring(0, 20);

    socket.emit("join", username);

    loginScreen.classList.add("hidden");
    chatApp.classList.remove("hidden");

    messageInput.focus();
}


// Send message
messageForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) return;

    socket.emit("chatMessage", message);

    messageInput.value = "";

    socket.emit("stopTyping");

    messageInput.focus();
});


// Receive message
socket.on("chatMessage", (data) => {

    const messageElement = document.createElement("div");

    const isMine = data.username === username;

    messageElement.className =
        `message ${isMine ? "mine" : "other"}`;

    const content = document.createElement("div");
    content.className = "message-content";

    // textContent prevents HTML injection
    content.textContent = data.message;

    const info = document.createElement("div");
    info.className = "message-info";

    info.textContent =
        `${isMine ? "You" : data.username} • ${data.time}`;

    messageElement.appendChild(content);
    messageElement.appendChild(info);

    messages.appendChild(messageElement);

    scrollToBottom();
});


// System message
socket.on("systemMessage", (data) => {

    const element = document.createElement("div");

    element.className = "system-message";

    element.textContent = data.message;

    messages.appendChild(element);

    scrollToBottom();
});


// User list
socket.on("users", (users) => {

    userList.innerHTML = "";

    users.forEach((user) => {

        const element = document.createElement("div");

        element.className = "user";

        const avatar = document.createElement("div");

        avatar.className = "user-avatar";

        avatar.textContent =
            user.charAt(0).toUpperCase();

        const name = document.createElement("div");

        name.className = "user-name";

        name.textContent =
            user === username ? `${user} (You)` : user;

        const dot = document.createElement("div");

        dot.className = "user-dot";

        element.appendChild(avatar);
        element.appendChild(name);
        element.appendChild(dot);

        userList.appendChild(element);
    });

    onlineCount.textContent =
        `${users.length} online`;
});


// Typing
let typingTimeout;

messageInput.addEventListener("input", () => {

    if (messageInput.value.trim()) {

        socket.emit("typing");

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            socket.emit("stopTyping");
        }, 1000);

    } else {

        socket.emit("stopTyping");
    }
});


socket.on("typing", (user) => {

    typingIndicator.textContent =
        `${user} is typing...`;
});


socket.on("stopTyping", () => {

    typingIndicator.textContent = "";
});


function scrollToBottom() {

    messages.scrollTop = messages.scrollHeight;
}