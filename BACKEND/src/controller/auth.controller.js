import { cookieOptions } from "../config/config.js";
import { registerUser, loginUser } from "../services/auth.service.js";
import wrapAsync from "../utils/trycatchWrapper.js";

export const register_user = wrapAsync(async(req, res) => {
    const { name, email, password } = req.body;
    const token = await registerUser(name, email, password);
    
    req.user = user;
    res.cookie("accessToken", token, cookieOptions);
    res.status(200).json({ message: "login successful" });
});


export const login_user = wrapAsync(async (req, res) => {
    const { email, password } = req.body;
    const { token, user } = await loginUser(email, password);
    
    req.user = user;
    res.cookie("accessToken", token, cookieOptions);
    res.status(200).json({ user: user, message: "login success" });
});