import { useState, useEffect } from "react";

export default function Results({ stats, token, onTokenRefresh, onPlayAgain }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    async function postResults() {
      try {
        if (token === "guest") {
          setSubmitted(false);
          setIsGuest(true);
          return;
        }
        const res = await fetch("http://localhost:8000/api/session/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ...stats }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.log("Session error:", errorData);
          throw new Error("Failed to save session.");
        }
        setSubmitted(true);

        const tokenRes = await fetch("http://localhost:8000/api/token/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ old_token: token }),
        });

        if (tokenRes.ok) {
          const data = await tokenRes.json();
          onTokenRefresh(data.token);
        }

      } catch (err) {
        setError(err.message);
      }
    }
    postResults();
  }, []);

  function renderStats() {
    if (stats.exercise === "flicking") {
      return (
        <>
          <StatCard label="Score" value={stats.score} />
          <StatCard label="Accuracy" value={`${stats.accuracy}%`} />
          <StatCard label="Avg Reaction" value={`${stats.avgReactionMs}ms`} />
        </>
      );
    }

    if (stats.exercise === "tracking") {
      return (
        <>
          <StatCard label="Score" value={stats.trackingScore} />
          <StatCard label="Time on Target" value={`${stats.timeOnTarget}%`} />
        </>
      );
    }

    if (stats.exercise === "precision") {
      const total = stats.score + stats.misses;
      const accuracy = total > 0 ? Math.round((stats.score / total) * 100) : 0;
      return (
        <>
          <StatCard label="Score" value={stats.score} />
          <StatCard label="Misses" value={stats.misses} />
          <StatCard label="Accuracy" value={`${accuracy}%`} />
          <StatCard label="Difficulty" value={stats.difficulty} capitalize />
        </>
      );
    }
  }

  function exerciseLabel() {
    if (stats.exercise === "flicking") return "🔥 Flicking";
    if (stats.exercise === "tracking") return "📡 Target Tracking";
    if (stats.exercise === "precision") return "🎯 Precision";
    return stats.exercise;
  }

  return (
    <div style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "8px" }}>Session Complete</h2>
      <p style={{ color: "#888", marginBottom: "24px" }}>
        {exerciseLabel()}
        {stats.exercise !== "precision" && ` · ${stats.duration}s`}
        {stats.exercise === "precision" && ` · ${stats.difficulty} · 30 targets`}
      </p>

      <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "12px", marginBottom: "32px" }}>
        {renderStats()}
      </div>

      {isGuest && (
        <p style={{ color: "#8891f2", marginTop: "16px" }}>
          Add the Discord bot to save your stats and track your progress over time.
        </p>
      )}
      
      {submitted && (
        <p style={{ color: "#27ae60" }}>
          ✓ Stats saved! Use <strong>/mystats</strong> in Discord to view your history.
        </p>
      )}
      {error && <p style={{ color: "#e74c3c" }}>⚠ {error}</p>}

      <button onClick={onPlayAgain} style={{ marginTop: "24px", padding: "10px 28px" }}>
        Play Again
      </button>
    </div>
  );
}

function StatCard({ label, value, capitalize }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 24px", border: "1px solid #eee",
      borderRadius: "8px", minWidth: "100px"
    }}>
      <span style={{
        fontSize: "28px", fontWeight: "700",
        textTransform: capitalize ? "capitalize" : "none"
      }}>
        {value}
      </span>
      <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>{label}</span>
    </div>
  );
}