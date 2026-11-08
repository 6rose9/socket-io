import { Server } from "socket.io";
import { createRoomHandler } from "./room.js";
import { createTypingTracker } from "./typing.js";

let io;

export const initSocket = (expressServer, port) => {
    
    if (io) return io;

    io = new Server(expressServer, {
        cors: {
            origin: `http://localhost:${port}`,
            methods: ["GET", "POST"]
        }
    });

    const typingTracker = createTypingTracker(io);
    const registerRoomHandlers = createRoomHandler(io, typingTracker);

    io.on("connection", (socket) => {
        socket.data.currentRoom = socket.data.currentRoom ?? socket.id;

        registerRoomHandlers(socket);

        socket.on("client-start-typing", ({ room } = {}) => {
            typingTracker.startTyping(socket, room);
        });

        socket.on("client-stop-typing", ({ room } = {}) => {
            typingTracker.stopTyping(socket, room);
        });

        socket.on("disconnecting", () => {
            for (const room of [...socket.rooms]) {
                if (room !== socket.id) {
                    typingTracker.stopTyping(socket, room);
                }
            }
        });
    });

    return io;
};