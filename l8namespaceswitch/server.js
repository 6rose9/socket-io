import { Server } from "socket.io";
import express from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { namespaces } from "./data/namespace.js";

// create express app
const app = new express();
const port = 3000;

// ### __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ### static folder
app.use(express.static(path.join(__dirname, "public"))); // now you can run http://localhost:3000/index.html

// ### home page route
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ### admin page route
app.get('/admin', (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
})

// ### namespaces route
app.get("/ns", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "ns.html"));
})

// ### start express server
const expressServer = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

//------------------------------------------------------------------------------------

// ### initialize socket.io after express server listen
// const io = new Server(expressServer);
const io = new Server(expressServer, {
    cors: {
        origin: `http:localhost:${port}`,
        methods: ["GET", "POST"]
    }
})

// ### default namespace
io.on("connection", (socket) => {
    console.log(`New client connected to / : ${socket.id}`);

    socket.emit("welcome", { ns: "/", message: "welcome to default namespace" });
    socket.emit("nsList", namespaces);

    socket.on("defautns", (payload) => {
        console.log("Client Message", payload);
        io.emit("broadcast", payload);
    });
});

// ### custom namespace "/admin"
const adminNs = io.of("/admin");
adminNs.on("connection", (socket) => {
    console.log(`New client connected to /admin : ${socket.id}`);

    socket.emit("welcome", { ns: "/admin", message: "welcome to admin namespace" });

    socket.on("adminns", (payload) => {
        console.log("Client Message", payload);
        adminNs.emit("broadcast-admin", payload);
    });
});

// ### switch namespaces
namespaces.forEach(ns => {
    
    const thisNs = io.of(ns.endpoint);

    thisNs.on("connection", currentSocket => {
        console.log(`Connected to ${ns.endpoint} : ${currentSocket.id}`);

        // send welcome message to clients
        thisNs.emit("welcome", {
            ns: ns.endpoint,
            msg: `Welcome event from ${ns.endpoint}: client _ ${currentSocket.id}`
        });

        // receive from switched namespace
        currentSocket.on("currentNs", payload => {
            console.log(`${payload.ns} sends message: ${payload.text}`);

            // send message to all clients in the namespace
            thisNs.emit("broadcastNsMessage", {
                ns: ns.endpoint,
                text: payload.text,
                sender: currentSocket.id
            });
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
