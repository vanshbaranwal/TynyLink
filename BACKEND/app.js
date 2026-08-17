import express from "express";
import { nanoid } from "nanoid"


const app = express();

app.get("/api/create", (req, res) => {
    res.send(nanoid(6));
});

app.listen(3000, () => {
    console.log("server is running on http://localhost:3000");
});

