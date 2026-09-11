
const socket = io();

let username = "";
let mySocketId = "";

let localStream = null;
let peerConnection = null;

let currentCallTarget = null;
let incomingCaller = null;


// =========================
// ELEMENTS
// =========================

const loginScreen =
    document.getElementById("loginScreen");

const chatApp =
    document.getElementById("chatApp");

const usernameInput =
    document.getElementById("usernameInput");

const joinButton =
    document.getElementById("joinButton");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const messages =
    document.getElementById("messages");

const userList =
    document.getElementById("userList");

const typingIndicator =
    document.getElementById("typingIndicator");

const onlineCount =
    document.getElementById("onlineCount");

const incomingCall =
    document.getElementById("incomingCall");

const callerName =
    document.getElementById("callerName");

const acceptCall =
    document.getElementById("acceptCall");

const rejectCall =
    document.getElementById("rejectCall");

const videoCall =
    document.getElementById("videoCall");

const localVideo =
    document.getElementById("localVideo");

const remoteVideo =
    document.getElementById("remoteVideo");

const closeVideo =
    document.getElementById("closeVideo");

const endCallButton =
    document.getElementById("endCallButton");

const muteButton =
    document.getElementById("muteButton");

const cameraButton =
    document.getElementById("cameraButton");

const callStatus =
    document.getElementById("callStatus");


// =========================
// WEBRTC CONFIG
// =========================

const rtcConfig = {

    iceServers: [

        {
            urls: "stun:stun.l.google.com:19302"
        },

        {
            urls: "stun:stun1.l.google.com:19302"
        }

    ]

};


// =========================
// LOGIN
// =========================

joinButton.addEventListener(
    "click",
    joinChat
);


usernameInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {
            joinChat();
        }

    }
);


function joinChat() {

    username =
        usernameInput.value.trim();

    if (!username) {

        usernameInput.focus();

        return;
    }

    username =
        username.substring(0, 20);

    socket.emit(
        "join",
        username
    );

    loginScreen.classList.add(
        "hidden"
    );

    chatApp.classList.remove(
        "hidden"
    );

    messageInput.focus();
}


// =========================
// SOCKET ID
// =========================

socket.on(
    "connect",
    () => {

        mySocketId = socket.id;

    }
);


// =========================
// TEXT CHAT
// =========================

messageForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        const message =
            messageInput.value.trim();

        if (!message) return;

        socket.emit(
            "chatMessage",
            message
        );

        messageInput.value = "";

        socket.emit(
            "stopTyping"
        );

        messageInput.focus();
    }
);


socket.on(
    "chatMessage",
    (data) => {

        const element =
            document.createElement("div");

        const mine =
            data.username === username;

        element.className =
            `message ${mine ? "mine" : "other"}`;


        const content =
            document.createElement("div");

        content.className =
            "message-content";

        content.textContent =
            data.message;


        const info =
            document.createElement("div");

        info.className =
            "message-info";

        info.textContent =
            `${mine ? "You" : data.username} • ${data.time}`;


        element.appendChild(content);

        element.appendChild(info);

        messages.appendChild(element);

        scrollToBottom();
    }
);


socket.on(
    "systemMessage",
    (data) => {

        const element =
            document.createElement("div");

        element.className =
            "system-message";

        element.textContent =
            data.message;

        messages.appendChild(element);

        scrollToBottom();
    }
);


// =========================
// USER LIST
// =========================

socket.on(
    "users",
    (users) => {

        userList.innerHTML = "";

        users.forEach(
            (user) => {

                const element =
                    document.createElement("div");

                element.className =
                    "user";


                const avatar =
                    document.createElement("div");

                avatar.className =
                    "user-avatar";

                avatar.textContent =
                    user.username
                        .charAt(0)
                        .toUpperCase();


                const name =
                    document.createElement("div");

                name.className =
                    "user-name";

                name.textContent =
                    user.id === mySocketId
                        ? `${user.username} (You)`
                        : user.username;


                const dot =
                    document.createElement("div");

                dot.className =
                    "user-dot";


                element.appendChild(
                    avatar
                );

                element.appendChild(
                    name
                );

                element.appendChild(
                    dot
                );


                // Don't show call button for yourself
                if (
                    user.id !== mySocketId
                ) {

                    const videoButton =
                        document.createElement("button");

                    videoButton.className =
                        "video-button";

                    videoButton.textContent =
                        "📹";

                    videoButton.title =
                        `Call ${user.username}`;


                    videoButton.addEventListener(
                        "click",
                        () => {

                            startCall(
                                user.id,
                                user.username
                            );

                        }
                    );


                    element.appendChild(
                        videoButton
                    );
                }


                userList.appendChild(
                    element
                );

            }
        );


        onlineCount.textContent =
            `${users.length} online`;
    }
);


// =========================
// TYPING
// =========================

let typingTimeout;

messageInput.addEventListener(
    "input",
    () => {

        if (
            messageInput.value.trim()
        ) {

            socket.emit(
                "typing"
            );

            clearTimeout(
                typingTimeout
            );

            typingTimeout =
                setTimeout(
                    () => {

                        socket.emit(
                            "stopTyping"
                        );

                    },
                    1000
                );

        } else {

            socket.emit(
                "stopTyping"
            );
        }
    }
);


socket.on(
    "typing",
    (user) => {

        typingIndicator.textContent =
            `${user} is typing...`;

    }
);


socket.on(
    "stopTyping",
    () => {

        typingIndicator.textContent =
            "";

    }
);


// =========================
// START VIDEO CALL
// =========================

async function startCall(
    target,
    targetName
) {

    if (peerConnection) {

        alert(
            "You are already in a call."
        );

        return;
    }


    currentCallTarget =
        target;


    try {

        await getMedia();


        showVideoScreen();

        callStatus.textContent =
            `Calling ${targetName}...`;


        socket.emit(
            "call-user",
            {
                target
            }
        );


    } catch (error) {

        console.error(error);

        alert(
            "Camera and microphone permission is required."
        );

        cleanupCall();
    }
}


// =========================
// INCOMING CALL
// =========================

socket.on(
    "incoming-call",
    (data) => {

        incomingCaller =
            data.caller;

        callerName.textContent =
            data.callerName;

        incomingCall.classList.remove(
            "hidden"
        );
    }
);


// =========================
// ACCEPT CALL
// =========================

acceptCall.addEventListener(
    "click",
    async () => {

        incomingCall.classList.add(
            "hidden"
        );


        currentCallTarget =
            incomingCaller;


        try {

            await getMedia();

            showVideoScreen();

            callStatus.textContent =
                "Connecting...";


            socket.emit(
                "call-accepted",
                {
                    caller: incomingCaller
                }
            );


        } catch (error) {

            console.error(error);

            alert(
                "Camera and microphone permission is required."
            );

            cleanupCall();
        }

    }
);


// =========================
// REJECT CALL
// =========================

rejectCall.addEventListener(
    "click",
    () => {

        incomingCall.classList.add(
            "hidden"
        );

        incomingCaller = null;

    }
);


// =========================
// CALL ACCEPTED
// =========================

socket.on(
    "call-accepted",
    async (data) => {

        try {

            currentCallTarget =
                data.receiver;


            await createPeerConnection(
                data.receiver
            );


            const offer =
                await peerConnection
                    .createOffer();


            await peerConnection
                .setLocalDescription(
                    offer
                );


            socket.emit(
                "offer",
                {
                    target:
                        data.receiver,

                    offer
                }
            );


            callStatus.textContent =
                "Connecting...";


        } catch (error) {

            console.error(
                "Offer error:",
                error
            );

            endCall();
        }
    }
);


// =========================
// RECEIVE OFFER
// =========================

socket.on(
    "offer",
    async (data) => {

        try {

            currentCallTarget =
                data.caller;


            await createPeerConnection(
                data.caller
            );


            await peerConnection
                .setRemoteDescription(
                    new RTCSessionDescription(
                        data.offer
                    )
                );


            const answer =
                await peerConnection
                    .createAnswer();


            await peerConnection
                .setLocalDescription(
                    answer
                );


            socket.emit(
                "answer",
                {
                    target:
                        data.caller,

                    answer
                }
            );


            callStatus.textContent =
                "Connected";


        } catch (error) {

            console.error(
                "Answer error:",
                error
            );

            endCall();
        }
    }
);


// =========================
// RECEIVE ANSWER
// =========================

socket.on(
    "answer",
    async (data) => {

        try {

            await peerConnection
                .setRemoteDescription(
                    new RTCSessionDescription(
                        data.answer
                    )
                );


            callStatus.textContent =
                "Connected";


        } catch (error) {

            console.error(
                "Answer handling error:",
                error
            );
        }
    }
);


// =========================
// ICE CANDIDATES
// =========================

socket.on(
    "ice-candidate",
    async (data) => {

        try {

            if (
                peerConnection &&
                data.candidate
            ) {

                await peerConnection
                    .addIceCandidate(
                        new RTCIceCandidate(
                            data.candidate
                        )
                    );
            }

        } catch (error) {

            console.error(
                "ICE error:",
                error
            );
        }
    }
);


// =========================
// CREATE PEER CONNECTION
// =========================

async function createPeerConnection(
    target
) {

    if (peerConnection) {

        peerConnection.close();

    }


    peerConnection =
        new RTCPeerConnection(
            rtcConfig
        );


    // Local tracks
    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                (track) => {

                    peerConnection
                        .addTrack(
                            track,
                            localStream
                        );

                }
            );
    }


    // Remote tracks
    peerConnection.ontrack =
        (event) => {

            remoteVideo.srcObject =
                event.streams[0];

            document
                .getElementById(
                    "videoPlaceholder"
                )
                .classList.add(
                    "hidden"
                );
        };


    // ICE
    peerConnection.onicecandidate =
        (event) => {

            if (
                event.candidate
            ) {

                socket.emit(
                    "ice-candidate",
                    {
                        target,

                        candidate:
                            event.candidate
                    }
                );
            }
        };


    peerConnection.onconnectionstatechange =
        () => {

            const state =
                peerConnection
                    .connectionState;


            if (
                state === "connected"
            ) {

                callStatus.textContent =
                    "Connected";

            }


            if (
                state === "disconnected" ||
                state === "failed" ||
                state === "closed"
            ) {

                cleanupCall();

            }

        };
}


// =========================
// CAMERA + MICROPHONE
// =========================

async function getMedia() {

    localStream =
        await navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: true
            });


    localVideo.srcObject =
        localStream;
}


// =========================
// VIDEO SCREEN
// =========================

function showVideoScreen() {

    videoCall.classList.remove(
        "hidden"
    );

}


// =========================
// MUTE
// =========================

muteButton.addEventListener(
    "click",
    () => {

        if (!localStream) return;

        const audioTrack =
            localStream
                .getAudioTracks()[0];

        if (!audioTrack) return;

        audioTrack.enabled =
            !audioTrack.enabled;


        muteButton.textContent =
            audioTrack.enabled
                ? "🎤"
                : "🔇";
    }
);


// =========================
// CAMERA
// =========================

cameraButton.addEventListener(
    "click",
    () => {

        if (!localStream) return;

        const videoTrack =
            localStream
                .getVideoTracks()[0];

        if (!videoTrack) return;

        videoTrack.enabled =
            !videoTrack.enabled;


        cameraButton.textContent =
            videoTrack.enabled
                ? "📹"
                : "🚫";
    }
);


// =========================
// END CALL
// =========================

endCallButton.addEventListener(
    "click",
    endCall
);


closeVideo.addEventListener(
    "click",
    endCall
);


function endCall() {

    if (currentCallTarget) {

        socket.emit(
            "end-call",
            {
                target:
                    currentCallTarget
            }
        );
    }

    cleanupCall();
}


// =========================
// REMOTE END CALL
// =========================

socket.on(
    "call-ended",
    () => {

        cleanupCall();

        alert(
            "The call has ended."
        );
    }
);


// =========================
// USER DISCONNECTED
// =========================

socket.on(
    "user-disconnected",
    (data) => {

        if (
            currentCallTarget ===
            data.socketId
        ) {

            cleanupCall();
        }
    }
);


// =========================
// CLEANUP
// =========================

function cleanupCall() {

    if (peerConnection) {

        peerConnection.close();

        peerConnection = null;
    }


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                (track) => {

                    track.stop();

                }
            );

        localStream = null;
    }


    localVideo.srcObject =
        null;

    remoteVideo.srcObject =
        null;


    videoCall.classList.add(
        "hidden"
    );


    incomingCall.classList.add(
        "hidden"
    );


    currentCallTarget =
        null;

    incomingCaller =
        null;


    muteButton.textContent =
        "🎤";

    cameraButton.textContent =
        "📹";

    callStatus.textContent =
        "Video Call";


    document
        .getElementById(
            "videoPlaceholder"
        )
        .classList.remove(
            "hidden"
        );
}


// =========================
// SCROLL
// =========================

function scrollToBottom() {

    messages.scrollTop =
        messages.scrollHeight;
}

