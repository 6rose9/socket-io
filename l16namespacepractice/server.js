import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initSocket } from "./socket/main.js";

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

export const expressServer = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

initSocket(expressServer, port);