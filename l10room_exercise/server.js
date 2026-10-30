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
})

// ### default namespace
io.on("connection", (socket) => {

    console.log("Before join room", socket.rooms);

    // handle client request to join a room
    socket.on('joinroom', (room) => {
        if (room) {

            // leave all previous room except it's own room ( every socket has it socket.id room)
            for (const r of socket.rooms) {
                if (r !== socket.id) socket.leave(r);
            }

            console.log("Leave rooms...");

            socket.join(room);
            // notify client of successful join
            socket.emit('joined', `Selected Room: ${room}`);
            console.log(`Socket ${socket.id} joined ${room}`);

            console.log("After join room", socket.rooms);
        }
    });

    console.log("---------------------------------------------------");
});
