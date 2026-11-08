async function emitUserLiveCount(io, room) {
    if (!room) return;

    const sockets = await io.in(room).fetchSockets();
    const data = {
        count: sockets.length,
        room
    };

    io.to(room).emit("livecount", data);
}

// A higher-order function is a function that:

// takes a function as an argument, or
// returns a function

export function createRoomHandler(io, typingTracker) {
    return function registerRoomHandlers(socket) {
        socket.on("joinroom", async (room, callback = () => {}) => {
            if (!room) return;

            const targetRoom = room === "my-notes" ? socket.id : room;

            for (const existingRoom of [...socket.rooms]) {
                if (existingRoom === socket.id) continue;

                typingTracker.stopTyping(socket, existingRoom);
                socket.leave(existingRoom);
                await emitUserLiveCount(io, existingRoom);
            }

            socket.join(targetRoom);
            socket.data.currentRoom = targetRoom;
            typingTracker.emitTypingStatus(targetRoom);

            socket.emit("joined", targetRoom === socket.id
                ? "Selected Room: My Notes"
                : `Selected Room: ${targetRoom}`);

            await emitUserLiveCount(io, targetRoom);

            const members = await io.in(targetRoom).fetchSockets();
            callback(targetRoom, members.length);
        });

        socket.on("usermessage", (payload) => {
            const room = socket.data.currentRoom ?? socket.id;

            if (typeof payload !== "string" || !payload.trim()) return;

            io.to(room).emit("roommessage", {
                message: payload,
                sender: socket.id,
                room: room === socket.id ? "My Notes" : room,
                date: Date.now()
            });
        });
    };
}

