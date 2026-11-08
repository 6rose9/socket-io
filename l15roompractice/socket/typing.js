export function createTypingTracker(io) {
    const typingSocketsByRoom = new Map();

    const emitTypingStatus = (room) => {
        if (!room) return;

        const typingSockets = typingSocketsByRoom.get(room) ?? new Set();
        io.to(room).emit("server-typing-status", [...typingSockets]);

        if (typingSockets.size === 0) {
            typingSocketsByRoom.delete(room);
        }
    };

    const startTyping = (socket, room) => {
        if (typeof room !== "string" || !socket.rooms.has(room)) return;

        let typingSockets = typingSocketsByRoom.get(room);

        if (!typingSockets) {
            typingSockets = new Set();
            typingSocketsByRoom.set(room, typingSockets);
        }

        typingSockets.add(socket.id);
        emitTypingStatus(room);
    };

    const stopTyping = (socket, room) => {
        if (typeof room !== "string") return;

        const typingSockets = typingSocketsByRoom.get(room);

        if (typingSockets?.delete(socket.id)) {
            emitTypingStatus(room);
        }
    };

    return {
        startTyping,
        stopTyping,
        emitTypingStatus
    };
}