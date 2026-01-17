
// User model has been removed.
// These are placeholder functions to prevent crashes if routes are still hit.

export const getAllUsers = async (req, res) => {
    res.status(410).json({ error: "User resource is gone" });
};

export const getUserById = async (req, res) => {
    res.status(410).json({ error: "User resource is gone" });
};

export const createUser = async (req, res) => {
    res.status(410).json({ error: "User resource is gone" });
};

export const updateUser = async (req, res) => {
    res.status(410).json({ error: "User resource is gone" });
};

export const deleteUser = async (req, res) => {
    res.status(410).json({ error: "User resource is gone" });
};
