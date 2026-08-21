import express from "express";
import { nanoid } from "nanoid"
import dotenv from "dotenv";
import connectDB from "./src/config/mongo.config.js";
import short_url from "./src/routes/shortUrl.route.js";
import auth_routes from "./src/routes/auth.route.js";
import { redirectFromShortUrl } from "./src/controller/shortUrl.controller.js";
import { errorHandler } from "./src/utils/errorHandler.js";
import cors from "cors";


dotenv.config("./.env");
const app = express();

app.use(cors());    

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/auth", auth_routes);
app.use("/api/create", short_url);
app.get("/:id", redirectFromShortUrl);

app.use(errorHandler);


app.listen(3000, () => {
    connectDB();
    console.log("server is running on http://localhost:3000");
});

