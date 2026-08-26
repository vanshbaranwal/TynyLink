import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    avatar: {
        type: String,
        required: false,
        default: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp",
    },
});


userSchema.methods.comparePassword = async function(password){
    return this.password === password;
};


const User = mongoose.model("User", userSchema);

export default User;