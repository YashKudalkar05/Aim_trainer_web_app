import { createRoot } from "react-dom/client";
import { GameSettingsProvider } from "./gamesettings";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <GameSettingsProvider>
    <App />
  </GameSettingsProvider>
);