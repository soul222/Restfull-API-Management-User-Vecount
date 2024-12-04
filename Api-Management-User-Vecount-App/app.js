require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// Real-time user status with Socket.io
const onlineUsers = new Map();

// io.on("connection", (socket) => {
//   socket.on("user-online", (userId) => {
//     onlineUsers.set(userId, socket.id);
//     io.emit("users-status", [...onlineUsers.keys()]);
//   });

//   socket.on("disconnect", () => {
//     onlineUsers.forEach((value, key) => {
//       if (value === socket.id) {
//         onlineUsers.delete(key);
//       }
//     });
//     io.emit("users-status", [...onlineUsers.keys()]);
//   });
// });

// code baru

io.on("connection", (socket) => {
  socket.on("user-online", async (userId) => {
    onlineUsers.set(userId, socket.id);
    await supabase
      .from("user_status")
      .upsert({ userId, status: "online", updatedAt: new Date() }); 

    io.emit("users-status", [...onlineUsers.keys()]);
  });

  socket.on("disconnect", async () => {
    onlineUsers.forEach(async (value, key) => {
      if (value === socket.id) {
        onlineUsers.delete(key);
        await supabase
          .from("user_status")
          .update({ status: "offline", updatedAt: new Date() })
          .eq("userId", key); // Set user status to offline
      }
    });
    io.emit("users-status", [...onlineUsers.keys()]);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
