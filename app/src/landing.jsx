export default function Landing({ onPlayAsGuest }) {
  const features = [
    { icon: "🎯", title: "Gridshot", desc: "Click targets as fast as possible. Trains raw clicking speed and target acquisition." },
    { icon: "🔥", title: "Precision", desc: "Targets spawn and disappear quickly. Trains flick accuracy under pressure." },
    { icon: "👁️", title: "Tracking", desc: "Follow a moving target with your crosshair. Trains smooth tracking aim." },
    { icon: "📊", title: "Discord Stats", desc: "Track your progress over time. View your stats directly in Discord after every session." },
    { icon: "⚡", title: "Zero Friction", desc: "No download, no install, no login. Open a link and start training in seconds." },
    { icon: "🎮", title: "Game Accurate", desc: "Supports Valorant, CS2, Apex and more. Sensitivity matched to your game." },
  ];

  const steps = [
    { number: "01", title: "Add the bot to your server", desc: "Click the button below to add AimTrainer to your Discord server." },
    { number: "02", title: "Run /aimtrain in Discord", desc: "The bot sends you a private link with a unique session token." },
    { number: "03", title: "Train and improve", desc: "Complete the exercise and your stats are saved automatically." },
    { number: "04", title: "Check your progress", desc: "Run /mystats in Discord to see your improvement over time." },
  ];

  const discordUrl = "https://discord.com/oauth2/authorize?client_id=1483468060349436076&scope=bot&permissions=2048";

  const discordBtnStyle = {
    display: "inline-flex", alignItems: "center", gap: "8px",
    padding: "14px 28px",
    background: "#5865F2",
    borderRadius: "8px",
    color: "white",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px"
  };

  const DiscordIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f0f1a", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "0.5px" }}>🎯 AimTrainer</span>
        <button onClick={onPlayAsGuest} style={{ padding: "8px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "white", cursor: "pointer", fontSize: "14px" }}>
          Play as Guest
        </button>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 40px 80px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", padding: "4px 14px", background: "rgba(88, 101, 242, 0.15)", border: "1px solid rgba(88, 101, 242, 0.3)", borderRadius: "20px", fontSize: "13px", color: "#8891f2", marginBottom: "24px" }}>
          Discord-integrated aim training
        </div>

        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: "800", lineHeight: "1.1", marginBottom: "24px", background: "linear-gradient(135deg, #ffffff 0%, #8891f2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Warm up your aim<br />before every match
        </h1>

        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", lineHeight: "1.7", maxWidth: "560px", margin: "0 auto 40px" }}>
          Browser-based aim training that lives inside Discord. No downloads, no logins — just click a link and start training.
        </p>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href={discordUrl} target="_blank" rel="noreferrer" style={discordBtnStyle}>
            <DiscordIcon /> Add to Discord
          </a>
          <button onClick={onPlayAsGuest} style={{ padding: "14px 28px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "600", fontSize: "16px" }}>
            Play as Guest →
          </button>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "32px", fontWeight: "700", marginBottom: "12px" }}>Everything you need to warm up</h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", marginBottom: "48px", fontSize: "16px" }}>Three targeted exercises covering every aspect of FPS aim</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {features.map((f, i) => (
            <div key={i} style={{ padding: "28px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "17px", fontWeight: "600", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: "1.6" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 40px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "32px", fontWeight: "700", marginBottom: "12px" }}>How it works</h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", marginBottom: "48px", fontSize: "16px" }}>From Discord to training in under 30 seconds</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "24px", padding: "28px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" }}>
              <span style={{ fontSize: "32px", fontWeight: "800", color: "rgba(88, 101, 242, 0.4)", minWidth: "48px", lineHeight: "1" }}>{s.number}</span>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: "600", marginBottom: "6px" }}>{s.title}</h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: "1.6" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: "center", padding: "80px 40px 100px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "16px" }}>Ready to improve your aim?</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "32px", fontSize: "16px" }}>Free, no account required. Just add the bot and start training.</p>
        <a href={discordUrl} target="_blank" rel="noreferrer" style={discordBtnStyle}>
          <DiscordIcon /> Add to Discord
        </a>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "24px", borderTop: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
        AimTrainer — Free browser-based FPS aim training
      </footer>

    </div>
  );
}