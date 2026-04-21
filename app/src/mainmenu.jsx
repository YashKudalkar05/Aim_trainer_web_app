import { useState } from "react";
import { GameSettingsControls, useGameSettings } from "./gamesettings";

const EXERCISES = {
  warmup: [
    {
      id: "flicking",
      label: "Flicking",
      description: "Click targets on a fixed grid as fast as you can. Best for warming up hand-eye coordination.",
    },
  ],
  precision: [
    {
      id: "precision",
      label: "Precision",
      description: "Targets spawn and disappear quickly. Click them before they vanish. Trains fast target acquisition.",
    },
  ],
  tracking: [
    {
      id: "strafing",
      label: "Target Tracking",
      description: "A target moves left and right randomly, simulating an enemy strafing. Trains smooth tracking.",
    },
  ],
};

const CATEGORY_LABELS = {
  warmup: "🔥 Warmup",
  precision: "🎯 Precision",
  tracking: "📡 Tracking",
};

const DIFFICULTY_OPTIONS = ["easy", "normal", "hard"];

export default function MainMenu({ onStart }) {
  const { duration, setDuration, sensitivity, setSensitivity, volume, setVolume } = useGameSettings();
  const [selectedExercise, setSelectedExercise] = useState("flicking");
  const [selectedDifficulty, setSelectedDifficulty] = useState("normal");

  const handleStart = (selectedDuration) => {
    setDuration(selectedDuration);
    onStart({
      duration: selectedDuration,
      exercise: selectedExercise,
      difficulty: selectedDifficulty,
    });
  };

  const showDifficulty = selectedExercise === "precision";

  return (
    <div style={{
      maxWidth: "600px",
      margin: "0 auto",
      padding: "30px 20px",
      background: "rgba(255,255,255,0.03)",
      borderRadius: "12px",
      boxShadow: "0 0 20px rgba(0,0,0,0.4)",
      textAlign: "center",
    }}>
      <h2 style={{ marginBottom: "6px", fontSize: "28px" }}>AimTrainer</h2>
      <p style={{ color: "#aaa", marginBottom: "24px" }}>Select your game and settings to begin</p>

      {/* Sensitivity Input + Slider */}
    <div style={{ marginBottom: "20px", textAlign: "left" }}>
      <label style={{ fontSize: "13px", color: "#888", marginRight: "8px" }}>
        Sensitivity:
      </label>

      {/* Inline number input */}
      <input
        type="number"
        min="0.01"
        max="10"
        step="0.01"
        value={sensitivity}  // local state for typing
        onChange={e => setSensitivity(e.target.value)} // allow empty field
        onBlur={() => {
          const val = parseFloat(sensitivity);
          if (isNaN(val) || val <= 0) {
            
            setSensitivity(1);
          } else {
            setSensitivity(val);
          }
        }}
        style={{
          width: "60px",
          padding: "4px 6px",
          borderRadius: "4px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "#0f0f1a",
          color: "white",
          textAlign: "center",
          marginRight: "12px",
        }}
      />
      <div>
      {/* Slider */}
      <input
        type="range"
        min="0.01"
        max="10"
        step="0.01"
        value={sensitivity}
        onChange={e => setSensitivity(parseFloat(e.target.value))}
        style={{
          width: "100%",
          flex: 1,
          height: "6px",
          borderRadius: "3px",
          background: "rgba(255,255,255,0.1)",
          appearance: "none",
        }}
      />
      </div>
    </div>

      {/* Volume Slider */}
      <div style={{ marginBottom: "24px", textAlign: "left" }}>
        <label style={{ fontSize: "13px", color: "#888" }}>Volume: {volume}</label>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={e => setVolume(e.target.value)}
          style={{
            width: "100%",
            marginTop: "6px",
            height: "6px",
            borderRadius: "3px",
            background: "rgba(255,255,255,0.1)",
            appearance: "none",
          }}
        />
      </div>

      {/* Exercises */}
      {Object.entries(EXERCISES).map(([category, exercises]) => (
        <div key={category} style={{ marginBottom: "20px", textAlign: "left" }}>
          <h3 style={{ marginBottom: "10px", fontSize: "14px", color: "#888", textTransform: "uppercase" }}>
            {CATEGORY_LABELS[category]}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {exercises.map(exercise => (
              <div
                key={exercise.id}
                onClick={() => !exercise.comingSoon && setSelectedExercise(exercise.id)}
                style={{
                  padding: "14px 16px",
                  border: `2px solid ${selectedExercise === exercise.id ? "#5859f2" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "10px",
                  cursor: exercise.comingSoon ? "default" : "pointer",
                  opacity: exercise.comingSoon ? 0.5 : 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: selectedExercise === exercise.id ? "rgba(88, 89, 242, 0.1)" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div style={{ fontWeight: "600", color: "#fff" }}>{exercise.label}</div>
                  <div style={{ fontSize: "13px", color: "#aaa", marginTop: "2px" }}>{exercise.description}</div>
                </div>
                {exercise.comingSoon && (
                  <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "12px", whiteSpace: "nowrap" }}>
                    Coming Soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Difficulty */}
      {showDifficulty && (
        <div style={{ marginBottom: "24px", textAlign: "left" }}>
          <h3 style={{ marginBottom: "10px", fontSize: "14px", color: "#888", textTransform: "uppercase" }}>⚡ Difficulty</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            {DIFFICULTY_OPTIONS.map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: `2px solid ${selectedDifficulty === diff ? "#5859f2" : "#ddd"}`,
                  borderRadius: "8px",
                  background: selectedDifficulty === diff ? "#5859f2" : "#fff",
                  color: selectedDifficulty === diff ? "#fff" : "#333",
                  cursor: "pointer",
                  fontWeight: selectedDifficulty === diff ? "700" : "400",
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                }}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Buttons */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "10px" }}>
        {selectedExercise === "precision" ? (
          <button onClick={() => handleStart(null)} style={{
            padding: "12px 28px",
            fontSize: "15px",
            borderRadius: "8px",
            border: "none",
            background: "#5859f2",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600",
            transition: "background 0.2s",
          }}>Start</button>
        ) : (
          <>
            <button onClick={() => handleStart(30)} style={{
              padding: "12px 28px",
              fontSize: "15px",
              borderRadius: "8px",
              border: "none",
              background: "#5859f2",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
              transition: "background 0.2s",
            }}>30 Seconds</button>
            <button onClick={() => handleStart(60)} style={{
              padding: "12px 28px",
              fontSize: "15px",
              borderRadius: "8px",
              border: "none",
              background: "#5859f2",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
              transition: "background 0.2s",
            }}>60 Seconds</button>
          </>
        )}
      </div>
    </div>
  );
}