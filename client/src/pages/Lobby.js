import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GiPerspectiveDiceSixFacesRandom } from "react-icons/gi";
import { MdContentCopy } from "react-icons/md";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Lobby = ({ socket }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  // Function to generate a 6-7 character room ID
  const generateRoomId = () => {
    const length = Math.floor(Math.random() * 2) + 6; // Randomly choose between 6 and 7 characters
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    setRoomId(result);
    toast.success("Room ID generated");
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text) => {
    if (roomId) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Room ID copied to clipboard");
      });
    } else {
      toast.error("Please generate a Room Id first");
    }
  };

  useEffect(() => {
    // Handle server responses
    socket.on("roomCreated", (data) => {
      console.log("Room created:", data);
      toast.success(`Room ${roomId} created.`);
      navigate(`/game/${data.roomId}`);
    });

    socket.on("roomExists", (roomId) => {
      toast.error(`Room ${roomId} already exists.`);
    });

    socket.on("roomJoined", (data) => {
      console.log("Joined room:", data);
      navigate(`/game/${data.roomId}`);
    });

    socket.on("invalidRoom", (roomId) => {
      toast.error(`Room ${roomId} is invalid.`);
    });

    socket.on("roomFull", (roomId) => {
      toast.error(`Room ${roomId} is full.`);
    });

    socket.on("error", (message) => {
      toast.error(message);
    });

    return () => {
      socket.off("roomCreated");
      socket.off("roomJoined");
      socket.off("roomExists");
      socket.off("invalidRoom");
      socket.off("roomFull");
      socket.off("error");
    };
  }, []);

  const handleCreateRoom = () => {
    if (!name || !roomId) {
      toast.error("Please fill all the fields");
    } else {
      sessionStorage.setItem("player", name);
      socket.emit("createRoom", { roomId, name });
    }
  };

  const handleJoinRoom = () => {
    if (!name || !roomId) {
      toast.error("Please fill all the fields");
    } else {
      sessionStorage.setItem("player", name);
      socket.emit("joinRoom", { roomId, name });
    }
  };

  return (
    <div className="lobby">
      <ToastContainer position="top-center" autoClose={2000} />
      <h1>Lobby</h1>
      <div className="inputs">
        <input
          type="text"
          value={name}
          placeholder="Player name..."
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="inputs">
        <input
          type="text"
          value={roomId}
          placeholder="Room id..."
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={() => copyToClipboard(roomId)}>
          <MdContentCopy className="copy" />
        </button>
        <button onClick={() => generateRoomId()}>
          <GiPerspectiveDiceSixFacesRandom className="generate" />
        </button>
      </div>
      <div className="horizontal bottom">
        <button onClick={handleCreateRoom}>
          <h2>Create Room</h2>
        </button>
        <button onClick={handleJoinRoom}>
          <h2>Join Room</h2>
        </button>
      </div>
    </div>
  );
};

export default Lobby;
