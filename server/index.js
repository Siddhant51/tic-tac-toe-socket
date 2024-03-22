const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

// Configure CORS more specifically
const corsOptions = {
  origin: "https://tic-tac-toe-socket-sid.vercel.app", // Replace with your client-side URL
  methods: ["GET", "POST"],
};
app.use(cors(corsOptions));

const mongoose = require("mongoose");

const DB = process.env.MONGODB_URL;

mongoose.connect(DB);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

const RoomSchema = new mongoose.Schema({
  roomId: String,
  users: [{ type: String }],
  board: { type: [String], default: ["", "", "", "", "", "", "", "", ""] },
  currentPlayer: String,
  gameOver: { type: Boolean, default: false },
  winner: String,
  score: [{ type: Number }],
});

const Room = mongoose.model("Room", RoomSchema);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://tic-tac-toe-socket-sid.vercel.app", // Replace with your client-side URL
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createRoom", async (roomData) => {
    try {
      console.log(2);
      const existingRoom = await Room.findOne({ roomId: roomData.roomId });
      if (existingRoom) {
        socket.emit("roomExists", roomData.roomId);
        return;
      }

      const newRoom = new Room({
        roomId: roomData.roomId,
        users: [roomData.name],
        currentPlayer: roomData.name,
        gameOver: false,
        winner: null,
        score: [0, 0],
      });

      const savedRoom = await newRoom.save();
      socket.join(savedRoom.roomId);
      socket.emit("roomCreated", savedRoom);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Failed to create room");
    }
  });

  socket.on("joinRoom", async (roomData) => {
    try {
      const room = await Room.findOne({ roomId: roomData.roomId });
      if (!room) {
        // console.log("invalidRoom");
        socket.emit("invalidRoom", roomData.roomId);
        return;
      }

      if (room.users.includes(roomData.name)) {
        socket.join(room.roomId);
        socket.emit("gameStateUpdated", room);
        socket.to(room.roomId).emit("gameStateUpdated", room);
        return;
      }

      if (room.users.length > 1) {
        socket.emit("roomFull", roomData.roomId);
        return;
      }

      room.users.push(roomData.name);
      await room.save();

      socket.join(room.roomId);
      socket.emit("roomJoined", room);
      socket.to(room.roomId).emit("userJoined", roomData.name);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("makeMove", async (roomData) => {
    try {
      const room = await Room.findOne({ roomId: roomData.roomId });
      if (!room) {
        socket.emit("invalidRoom", roomData.roomId);
        return;
      }
      if (room.gameOver) {
        return;
      }

      // Validate move (check if it's a valid move within the game rules)
      if (!isValidMove(roomData.index, room.board)) {
        socket.emit("invalidMove");
        return;
      }

      room.board[roomData.index] =
        roomData.currentPlayer === room.users[0] ? "X" : "O"; // Update board state
      room.currentPlayer =
        room.currentPlayer === room.users[0] ? room.users[1] : room.users[0]; // Switch turns
      const saved = await room.save();

      if (saved) {
        socket.emit("gameStateUpdated", room);
        socket.to(room.roomId).emit("gameStateUpdated", room); // Broadcast updated game state
      }

      const winner = checkWin(room.board);
      if (winner) {
        room.winner = winner === "X" ? room.users[0] : room.users[1];
        room.score[winner === "X" ? 0 : 1]++;
        room.gameOver = true;
        const saved2 = await room.save();
        socket.to(room.roomId).emit("gameWon", saved2); // Broadcast winner to other player
        socket.emit("gameWon", saved2); // Emit event with winner's name
      } else if (checkDraw(room.board)) {
        room.gameOver = true;
        room.winner = null;
        const saved3 = await room.save();
        socket.to(room.roomId).emit("gameDraw"); // Broadcast draw to other player
        socket.emit("gameDraw"); // Emit event for draw scenario
      }

      // Check for win/lose conditions (optional) and emit events accordingly.
    } catch (error) {
      console.error(error);
      socket.emit("error", "Failed to update game state");
    }
  });

  socket.on("handleRematch", (roomId) => {
    console.log("2");
    socket.to(roomId).emit("requestRematch");
  });

  socket.on("acceptRematch", async ({ roomId, name }) => {
    const room = await Room.findOne({ roomId });
    if (!room) {
      socket.emit("invalidRoom", roomId);
      return;
    }
    room.board = ["", "", "", "", "", "", "", "", ""];
    room.winner = null;
    room.currentPlayer = name === room.users[0] ? room.users[1] : room.users[0];
    room.gameOver = false;
    const saved4 = await room.save();

    if (saved4) {
      socket.emit("gameStateUpdated", saved4);
      socket.to(room.roomId).emit("gameStateUpdated", saved4); // Broadcast updated game state
    }
  });

  socket.on("userDisconnected", ({ roomId, name }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("opponentDisconnected", name);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Implement the isValidMove function to check for valid moves on the Tic Tac Toe board
function isValidMove(move, board) {
  // Implement your logic to check if the move is valid based on the game rules (e.g., empty cell)
  return board[move] === "";
}

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWin(board) {
  for (let i = 0; i < winningLines.length; i++) {
    const [a, b, c] = winningLines[i];
    if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return the winning player's symbol (X or O)
    }
  }
  return null; // No winner yet
}

function checkDraw(board) {
  // Check if all cells are filled (no empty cells)
  return board.every((cell) => cell !== "");
}

server.listen(3001, () => {
  console.log("Server listening on port 3001");
});
