import { createUser, findUserByEmail } from "../dao/user.dao.js";
import { BadRequestError, ConflictError, UnauthorizedError } from "../utils/errorHandler.js";
import { signToken } from "../utils/helper.js";


export const registerUser = async(name, email, password) => {
    const user = await findUserByEmail(email);

    if(user) throw new ConflictError("user already exists");

    const newUser = await createUser(name, email, password);
    const token = signToken({ id: newUser._id });
    return { token, user: newUser };
};

export const loginUser = async (email, password) => {
    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        password.length === 0
    ) {
        throw new BadRequestError("Email and password are required");
    }

    const user = await findUserByEmail(email.trim(), true);

    if (!user || !(await user.comparePassword(password))) {
        throw new UnauthorizedError("Invalid credentials");
    }

    const token = signToken({ id: user._id });
    return { token, user };
};