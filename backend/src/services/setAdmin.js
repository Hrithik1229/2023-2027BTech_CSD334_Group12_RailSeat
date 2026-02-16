import User from "../models/user.model.js";

const setAdmin = async () => {
    try {
        const username = "Admin";
        const email = "admin@gmail.com";

        const user = await User.findOne({ where: { username } });

        if (!user) {
            console.log("User 'Admin' not found.");
            process.exit(1);
        }

        user.email = email;
        user.role = 'admin';
        await user.save();

        console.log(`Successfully updated user '${username}' to admin with email '${email}'.`);
        process.exit(0);
    } catch (error) {
        console.error("Error setting admin:", error);
        process.exit(1);
    }
};

setAdmin();
