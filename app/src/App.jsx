import { useState, useEffect, useRef } from "react";
import Gridshot from "./gridshot";
import Results from "./results";
import MainMenu from "./mainmenu";
import Tracking from "./tracking";
import Precision from "./precision";
import Landing from "./landing";

export default function App() {
  const [token, setToken] = useState(null);
  const [stats, setStats] = useState(null);
  const [started, setStarted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedExercise, setSelectedExercise] = useState("gridshot");
  const gameContainerRef = useRef(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("normal");
  const [currentToken, setCurrentToken] = useState(null);
  const [visible, setVisible] = useState(true);
  const [username, setUsername] = useState("Guest");
  const [avatar, setAvatar] = useState(null);
  const defaultAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
      setCurrentToken(t);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setVisible(false);

    const timeout = setTimeout(() => {
      setVisible(true);
    }, 50);

    return () => clearTimeout(timeout);
  }, [started, stats, selectedExercise]);  

  useEffect(() => {
    if (token && token !== "guest") {
      fetch(`http://127.0.0.1:8000/api/user/?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.display_name) setUsername(data.display_name);
          if (data.avatar) setAvatar(data.avatar);
        })
        .catch(err => console.error(err));
    }
  }, [token]);

  if (!token) {
    return <Landing onPlayAsGuest={() => setToken("guest")} />;
  }

  function handleStart({ duration, exercise, difficulty }) {
    setVisible(false);
    setTimeout(() => {
      setSelectedDuration(duration);
      setSelectedExercise(exercise);
      setSelectedDifficulty(difficulty);
      setStarted(true);
      setVisible(true);
    }, 200);
  }

  function handleComplete(s) {
    setVisible(false);
    setTimeout(() => {
      setStats(s);
      setStarted(false);
      setVisible(true);
    }, 200);
  }

  return (
    
    <div
      ref={gameContainerRef}
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f0f1a",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "0.5px" }}>🎯 AimTrainer</span>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {avatar && username !== "Guest" && (
            <img
              src={avatar || defaultAvatar}
              alt="avatar"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          )}

          <span
            style={{
              fontSize: "13px",
              padding: "6px 12px",
              background:
                username === "Guest"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(88, 101, 242, 0.15)",
              border:
                username === "Guest"
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "1px solid rgba(88, 101, 242, 0.3)",
              borderRadius: "999px",
              color:
                username === "Guest"
                  ? "rgba(255,255,255,0.6)"
                  : "#8891f2",
            }}
          >
            {username === "Guest" ? "Guest Mode" : username}
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <div
        style={{
          maxWidth: started ? "100%" : "900px",
          margin: "0 auto",
          padding: started ? "0" : "60px 20px",
          transition: "opacity 0.3s ease",
          opacity: visible ? 1 : 0,
        }}
      >
        {!started && !stats && (
          <>
            <h1
              style={{
                textAlign: "center",
                fontSize: "36px",
                fontWeight: "700",
                marginBottom: "32px",
              }}
            >
              Choose your training
            </h1>

            <MainMenu onStart={handleStart} />
          </>
        )}

        {started && !stats && selectedExercise === "flicking" && (
          <Gridshot
            token={currentToken}
            duration={selectedDuration}
            gameContainerRef={gameContainerRef}
            onComplete={handleComplete}
          />
        )}

        {started && !stats && selectedExercise === "precision" && (
          <Precision
            token={currentToken}
            duration={selectedDuration}
            difficulty={selectedDifficulty}
            gameContainerRef={gameContainerRef}
            onComplete={handleComplete}
          />
        )}

        {started && !stats && selectedExercise === "strafing" && (
          <Tracking
            token={currentToken}
            duration={selectedDuration}
            gameContainerRef={gameContainerRef}
            onComplete={handleComplete}
          />
        )}

        {stats && (
          <Results
            stats={stats}
            token={currentToken}
            onTokenRefresh={(newToken) => {
              setCurrentToken(newToken);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
            onPlayAgain={() => setStats(null)}
          />
        )}
      </div>
    </div>
  );
}