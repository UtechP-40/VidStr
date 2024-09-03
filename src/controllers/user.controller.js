import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "ok"
    })
    // const { name, email, password, confirmPassword, photo } = req.body;

    // if (!name || !email || !password || !confirmPassword) {
    //     throw new APIError(400, "All fields are required");
    // }

    // const userExists = await User.findOne({ email });
    
})

export { registerUser };