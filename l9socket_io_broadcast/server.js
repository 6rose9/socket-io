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

    console.log(`New client connected to / : ${socket.id}`);

    socket.on("sendtoserver", payload => {

        console.log("server receive:", payload);

        // 1. instance (everyone including sender)
        io.emit("sendbyinstance", {
            "method": "Send by instance",
            "message": payload
        });

        // 2. parameter ( only sender receive)
        socket.emit("sendbyparameter", {
            "method": "Send by parameter",
            "message": payload
        });

        // 3. broadcast ( everyone except sender)
        socket.broadcast.emit("sendbybroadcast", {
            "method": "Send by broadcast",
            "message": payload
        });
    });

});

// graceful shutdown - ctrl + c - sigint
// close terminal - sighup
process.on("SIGINT", () => {
    console.log("SIGINT received. Shutdown server");
    expressServer.close(() => {
        console.log("Server closed");
        process.exit(0);
    })
});
