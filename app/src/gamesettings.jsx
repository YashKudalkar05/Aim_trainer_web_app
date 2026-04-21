import { createContext, useContext, useState } from "react";
import * as THREE from "three";
import { setMasterVolume, getMasterVolume } from "./sounds";

const GameSettingsContext = createContext();

const GAME_CONFIGS = {
  valorant: { label: "Valorant", yaw: 0.07, fov: 103 },
  cs2:      { label: "CS2",      yaw: 0.022, fov: 106 },
  apex:     { label: "Apex Legends", yaw: 0.022, fov: 110 },
  overwatch2: { label: "Overwatch 2", yaw: 0.0066, fov: 103 },
  rainbow6: { label: "Rainbow Six Siege", yaw: 0.00572, fov: 90 },
};

export { GAME_CONFIGS };

export function GameSettingsProvider({ children }) {
  const [sensitivity, setSensitivity] = useState(1);
  const [game, setGame] = useState("valorant");
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(getMasterVolume());

  // FOV is derived from game selection, not manually set
  const fov = GAME_CONFIGS[game].fov;

  function applyMouseLook(e, yawRef, pitchRef) {
    const gameMultiplier = GAME_CONFIGS[game].yaw;
    const radiansPerCount = sensitivity * gameMultiplier * (Math.PI / 180);
    yawRef.current -= e.movementX * radiansPerCount;
    pitchRef.current -= e.movementY * radiansPerCount;
    pitchRef.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchRef.current));
  }

  function createBaseScene(mountEl) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 15, 30); // subtle depth fog

    const aspect = mountEl.clientWidth / mountEl.clientHeight;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.shadowMap.enabled = true;
    mountEl.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2e });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(60, 60);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2e });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 8;
    scene.add(ceil);

    // Back wall
    const backWallGeo = new THREE.PlaneGeometry(60, 10);
    const backWallMat = new THREE.MeshStandardMaterial({ color: 0x22223a });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, 1, -25);
    scene.add(backWall);

    // Left wall
    const leftWallGeo = new THREE.PlaneGeometry(60, 10);
    const leftWallMat = new THREE.MeshStandardMaterial({ color: 0x22223a });
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-15, 1, -10);
    scene.add(leftWall);

    // Right wall
    const rightWallGeo = new THREE.PlaneGeometry(60, 10);
    const rightWallMat = new THREE.MeshStandardMaterial({ color: 0x22223a });
    const rightWall = new THREE.Mesh(rightWallGeo, rightWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(15, 1, -10);
    scene.add(rightWall);

    // Floor grid
    const gridHelper = new THREE.GridHelper(60, 30, 0x2a2a4a, 0x2a2a4a);
    gridHelper.position.y = -4.99;
    scene.add(gridHelper);

    return { scene, camera, renderer };
  }

  function computeStats(scoreRef, missesRef, reactionTimesRef, selectedDuration) {
    const avgReactionMs = reactionTimesRef.current.length
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 0;
    const total = scoreRef.current + missesRef.current;
    const accuracy = total > 0 ? Math.round((scoreRef.current / total) * 100) : 0;
    return { score: scoreRef.current, accuracy, avgReactionMs, duration: selectedDuration };
  }

  return (
    <GameSettingsContext.Provider value={{
      sensitivity, setSensitivity,
      game, setGame,
      fov,
      duration, setDuration,
      volume, setVolume,
      applyMouseLook,
      createBaseScene,
      computeStats,
    }}>
      {children}
    </GameSettingsContext.Provider>
  );
}

export function useGameSettings() {
  return useContext(GameSettingsContext);
}

export function GameSettingsControls() {
  const { sensitivity, setSensitivity, game, setGame, fov, volume, setVolume } = useGameSettings();
  const [localSens, setLocalSens] = useState(sensitivity);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalSens(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) setSensitivity(num);
  };

  const handleBlur = () => {
    if (localSens === "" || isNaN(parseFloat(localSens))) {
      setLocalSens(1);
      setSensitivity(1);
    }
  };

  return (
    <div style={{ marginBottom: "24px", textAlign: "left" }}>
      <div style={{ marginBottom: "16px", textAlign: "left" }}>
        <label>Volume: {Math.round(volume * 100)}%</label>
        <input
          type="range"
          min="0" max="1" step="0.01"
          value={volume}
          onChange={e => {
            const val = parseFloat(e.target.value);
            setVolume(val);       // <-- now works
            setMasterVolume(val); // optional: update sound system
          }}
          style={{ width: "100%" }}
        />
      </div>

      
      <div style={{ marginBottom: "16px" }}>
        <label>Game</label>
        <select
          value={game}
          onChange={e => setGame(e.target.value)}
          style={{ width: "100%", marginTop: "4px", padding: "6px" }}
        >
          {Object.entries(GAME_CONFIGS).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
          FOV auto-set to {fov}° for {GAME_CONFIGS[game].label}
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label>Sensitivity: {sensitivity}</label>
        <input
          type="number"
          min="0.01"
          max="10"
          step="0.01"
          value={localSens}
          onChange={handleChange}
          onBlur={handleBlur}
          style={{ width: "100%", marginTop: "4px", marginBottom: "8px" }}
        />
        <input
          type="range"
          min="0.01"
          max="10"
          step="0.01"
          value={sensitivity}
          onChange={e => setSensitivity(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}