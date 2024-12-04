const supabase = require("../utils/supabase");

// const getAllUsers = async (req, res) => {
//   const { data, error } = await supabase.from("users").select("*");

//   if (error) return res.status(400).json({ error: error.message });
//   res.status(200).json(data);
// };

// const getUserById = async (req, res) => {
//   const { id } = req.params;

//   const { data, error } = await supabase
//     .from("users")
//     .select("*")
//     .eq("id", id)
//     .single();

//   if (error) return res.status(400).json({ error: error.message });
//   res.status(200).json(data);
// };

// const updateUser = async (req, res) => {
//   const { id } = req.params;
//   const updates = req.body;

//   const { error } = await supabase.from("users").update(updates).eq("id", id);

//   if (error) return res.status(400).json({ error: error.message });
//   res.status(200).json({ message: "User updated" });
// };

// const deleteUser = async (req, res) => {
//   const { id } = req.params;

//   const { error } = await supabase.from("users").delete().eq("id", id);

//   if (error) return res.status(400).json({ error: error.message });
//   res.status(200).json({ message: "User deleted" });
// };

// module.exports = { getAllUsers, getUserById, updateUser, deleteUser };

const getUserProfile = async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, fullname, email, role, phone, bio, imageUrl")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

const getAllUsers = async (req, res) => {
  try {
    // Ambil semua user
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, fullname, email, role, imageUrl, createdAt");

    if (userError) throw userError;

    // Ambil status terbaru untuk semua user
    const { data: statusData, error: statusError } = await supabase
      .from("user_status")
      .select("userId, status")
      .in(
        "userId",
        users.map((user) => user.id)
      );

    if (statusError) throw statusError;

    // Gabungkan data user dengan status
    const usersWithStatus = users.map((user) => ({
      ...user,
      status:
        statusData.find((status) => status.userId === user.id)?.status ||
        "offline",
    }));

    res.status(200).json(usersWithStatus);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Memeriksa apakah pengguna mempunyai izin untuk memperbarui
  if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: "Unauthorized to update this user" });
  }

  // Hapus kolom sensitif dari pembaruan
  delete updates.password;
  // Hanya izinkan perubahan peran melalui titik akhir admin terpisah
  delete updates.role;

  const { error } = await supabase.from("users").update(updates).eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "User updated successfully" });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  // Hanya admin yang dapat menghapus pengguna
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized to delete users" });
  }

  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "User deleted successfully" });
};

module.exports = {
  getAllUsers,
  getUserProfile,
  updateUser,
  deleteUser,
};
