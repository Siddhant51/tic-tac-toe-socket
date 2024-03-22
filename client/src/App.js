import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Lobby from "./pages/Lobby";
import GameBoard from "./pages/GameBoard";
import io from "socket.io-client";
const socket = io.connect("https://tic-tac-toe-socket-api.vercel.app");

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Lobby socket={socket} />} />
          <Route
            path={`/game/:roomId`}
            element={<GameBoard socket={socket} />}
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
