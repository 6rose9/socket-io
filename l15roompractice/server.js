import { Server } from "socket.io";
import express from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// create express app
const app = new express();
const port = 3000;

// ### __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ### static folder
app.use(express.static(path.join(__dirname, "public")));

// ### home page route
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ### start express server
const expressServer = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

//------------------------------------------------------------------------------------

// ### initialize socket.io after express server listen
const io = new Server(expressServer, {
    cors: {
        origin: `http://localhost:${port}`,
        methods: ["GET", "POST"]
    }
});

const typingSocketsByRoom = new Map();
console.log("typing socket by room: ", typingSocketsByRoom); //  Map(0) {}

function emitTypingStatus(room) {
    const typingSockets = typingSocketsByRoom.get(room) ?? new Set();
    io.to(room).emit("server-typing-status", [...typingSockets]);
    console.log("typing socket by room", typingSocketsByRoom); 
//      Map(1) {
//          'room-a' => Set(2) { 'zubt_AWxYra1lTM5AAAF', 'MscLSfyw8SYkevo2AAAE' }
//      }
    if (typingSockets.size === 0) typingSocketsByRoom.delete(room);
}

function stopTyping(socket, room) {
    const typingSockets = typingSocketsByRoom.get(room);
    if (typingSockets?.delete(socket.id)) emitTypingStatus(room);
}

// ### helper function
async function emitUserLiveCount(room) {
    const sockets = await io.in(room).fetchSockets();
    const data = {
        count: sockets.length,
        room
    };
    console.log("livecount: ", data);
    io.to(room).emit("livecount", data);
}

// ### default namespace
io.on("connection", (socket) => {
    socket.data.currentRoom = socket.id;

    // Method 1
    console.log("Before join room: ", socket.rooms);

    // handle client request to join a room
    socket.on('joinroom', async (room, callback) => {
        if (room) {
            const targetRoom = room === "my-notes" ? socket.id : room;

            if (targetRoom !== socket.id) {
                // Switching shared rooms leaves the previous shared room, but My Notes stays joined.
                for (const r of socket.rooms) {
                    if (r !== socket.id) {
                        stopTyping(socket, r);
                        socket.leave(r);
                        await emitUserLiveCount(r);
                    }
                }
            }

            console.log(`${socket.id} selected ${targetRoom}`);

            socket.join(targetRoom);
            socket.data.currentRoom = targetRoom;
            emitTypingStatus(targetRoom);
            // notify client of successful join
            socket.emit('joined', targetRoom === socket.id
                ? "Selected Room: My Notes"
                : `Selected Room: ${targetRoom}`);
            console.log(`Socket ${socket.id} joined ${targetRoom}`);

            console.log("After join room: ", socket.rooms);
            await emitUserLiveCount(targetRoom);

            console.log("---------------------------------------------------");

            // count room members
            const members = await io.in(targetRoom).fetchSockets(); // without await, members is undefined
            const count = members.length;

            console.log("Joined Members count: ", count);

            callback(targetRoom, count);
        }
    });

    // handle client typing indicator
    socket.on("client-start-typing", payload => {
        if (typeof payload?.room !== "string" || !socket.rooms.has(payload.room)) return;

        let typingSockets = typingSocketsByRoom.get(payload.room);
        if (!typingSockets) {
            typingSockets = new Set();
            console.log("typing socket - new set(): ", typingSockets);
            typingSocketsByRoom.set(payload.room, typingSockets);
        }
        typingSockets.add(socket.id);
        emitTypingStatus(payload.room);
    });

    socket.on("client-stop-typing", payload => {
        if (typeof payload?.room === "string") stopTyping(socket, payload.room);
    });

    socket.on("disconnecting", () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) stopTyping(socket, room);
        }
    });

    socket.on("usermessage", (payload) => {
        const room = socket.data.currentRoom;
        console.log("user room: ", room, "user message: ", payload);

        io.to(room).emit("roommessage", {
            "message": payload,
            "sender": socket.id,
            "room": room === socket.id ? "My Notes" : room,
            "date": Date.now()
        });
    });
});
