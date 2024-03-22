import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoCloseSharp } from "react-icons/io5";
import { PiCircleBold } from "react-icons/pi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const iconX = <IoCloseSharp style={{ fontSize: "85px" }} />;
const iconO = <PiCircleBold style={{ fontSize: "70px" }} />;

const GameBoard = ({ socket }) => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [players, setPlayers] = useState([]);
  const [board, setBoard] = useState(["", "", "", "", "", "", "", "", ""]);
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [score, setScore] = useState([]);
  const [request, setRequest] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(sessionStorage.getItem("player") || "");

  useEffect(() => {
    socket.on("roomCreated", (data) => {
      toast.success(`Room ${data.roomId} created.`);
    });

    // Handle server responses
    socket.on("gameStateUpdated", (data) => {
      console.log("Game state updated:", data);
      console.log("board", data.board);
      setBoard([...data.board]);
      setPlayers(data.users);
      setCurrentPlayer(data.currentPlayer);
      setGameOver(data.gameOver);
      setWinner(data.winner);
      setScore([...data.score]);
      setRequest(false);
      setMessage(
        data.users.length === 2
          ? data.gameOver
            ? data.winner
              ? data.winner === name
                ? "You Won!"
                : "You Lose!"
              : "Draw!"
            : data.currentPlayer === name
            ? "Your turn"
            : "Opponent's turn"
          : "Waiting for opponent to join room..."
      );
    });

    socket.on("gameWon", (data) => {
      setGameOver(data.gameOver);
      setWinner(data.winner);
      setScore([...data.score]);
      setMessage(data.winner === name ? "You Won!" : "You Lose!");
      {
        data.winner === name
          ? toast.success("You Won!")
          : toast.error("You Lose!");
      }
    });

    socket.on("gameDraw", () => {
      setGameOver(true);
      setWinner("");
      setMessage("Draw");
      toast.error("Game Draw!");
    });

    socket.on("invalidMove", () => {
      toast.error("Invalid move!");
    });

    socket.on("invalidRoom", () => {
      toast.error("invalid Room!");
      navigate("/");
    });

    socket.on("requestRematch", () => {
      console.log("3");
      setRequest(true);
      toast.info("Opponent request's rematch");
    });

    socket.on("opponentDisconnected", (name) => {
      toast.error(`${name} Left`);
    });

    socket.on("error", (message) => {
      toast.error(message);
    });

    console.log(roomId);
    socket.emit("joinRoom", { roomId, name }); // Join room on component mount

    return () => {
      socket.off("gameStateUpdated");
      socket.off("invalidRoom");
      socket.off("invalidMove");
      socket.off("gameDraw");
      socket.off("gameWon");
      socket.off("acceptRematch");
      socket.off("requestRematch");
      socket.off("opponentDisconnected");
    };
  }, []);

  const handleCellClicked = (index) => {
    if (board[index] !== "" || currentPlayer !== name) {
      return; // Don't allow clicking on occupied cells
    }

    console.log(currentPlayer);
    if (players.length === 2) {
      socket.emit("makeMove", { roomId, index, currentPlayer });
    }
  };

  const handleRematch = () => {
    console.log("1");
    socket.emit("handleRematch", roomId);
  };

  const acceptRematch = () => {
    socket.emit("acceptRematch", { roomId, name });
  };

  const exit = () => {
    socket.emit("userDisconnected", { roomId, name });
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="game-board">
      <ToastContainer position="top-center" autoClose={2000} />
      <div className="top">
        <h1 className="title">
          GameBoard: <span className="light">{roomId}</span>
        </h1>
      </div>
      <div className="horizontal">
        <div className="score">
          <h1>{players[0]}(X)</h1>
          <h1 className="light">{score[0]}</h1>
        </div>
        <div className="score">
          <h1>{players[1]}(O)</h1>
          <h1 className="light">{score[1]}</h1>
        </div>
      </div>
      <div className="board">
        {board.map((cell, index) => (
          <div
            onClick={() => handleCellClicked(index)}
            key={index}
            className="cell"
          >
            <div
              className={`${
                cell === "X" ? "dark cell-content" : "light cell-content"
              }`}
            >
              {cell === "X" ? iconX : cell === "O" ? iconO : null}
            </div>
          </div>
        ))}
      </div>
      <div className="message">
        <h2>{message}</h2>
      </div>
      <div className="horizontal bottom">
        <div>
          {!request ? (
            <button onClick={handleRematch} disabled={!gameOver}>
              <h2>Rematch</h2>
            </button>
          ) : (
            <button onClick={acceptRematch}>
              <h2>Accept Rematch</h2>
            </button>
          )}
        </div>
        <div>
          <button onClick={exit}>
            <h2>Exit</h2>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
