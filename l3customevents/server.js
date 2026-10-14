import { Server } from "socket.io";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// create express app
const app = new express();
const port = 3000;

// ### __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ### static folder
app.use(express.static(path.join(__dirname, "public"))); // now you can run http://localhost:3000/index.html

// ### start express server
const expressServer = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

// ### initialize socket.io after express server listen

// const io = new Server(expressServer);
const io = new Server(expressServer, {
    cors: {
        origin: `http:localhost:${port}`,
        methods: ["GET", "POST"]
    }
})

// ### connect socket.io using connection event
io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // ### emit for creating custom events
    socket.emit("msgfromserver", { data: "welcome to server" });

    socket.on("msgfromClient", data => {
        console.log(`Client Message: `, data);
    })
});

