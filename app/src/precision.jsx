import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameSettings } from "./gamesettings";
import { playHit, playShoot, playCountdownBeep, playSessionStart, playSessionEnd, resumeAudio } from "./sounds";
// Difficulty settings — tweak these
const DIFFICULTY = {
  easy:   { disappearTime: 2.0, duration: 62 },  // 60s + 2s buffer for last target
  normal: { disappearTime: 1.0, duration: 31 },  // 30s + 1s buffer
  hard:   { disappearTime: 0.5, duration: 15.5 }, // 15s + 0.5s buffer
};

const TOTAL_TARGETS = 30;
const TARGET_RADIUS = 0.3;
const SPAWN_DEPTH_MIN = -6;
const SPAWN_DEPTH_MAX = -10;
const SPAWN_ARC_DEG = 80;
const SPAWN_HEIGHT = 0;
const SPAWN_BUFFER = 0.1;


function randomSpawnPosition() {
  const depth = SPAWN_DEPTH_MIN + Math.random() * (SPAWN_DEPTH_MAX - SPAWN_DEPTH_MIN);
  const halfArc = (SPAWN_ARC_DEG / 2) * (Math.PI / 180);
  const angle = (Math.random() - 0.5) * halfArc * 2;
  const x = Math.tan(angle) * Math.abs(depth);

  // Clamp x so targets never spawn outside visible area
  const maxX = Math.tan(halfArc) * Math.abs(SPAWN_DEPTH_MIN); // use closest depth as limit
  const clampedX = Math.max(-maxX * 0.6, Math.min(maxX * 0.6, x)); // 0.6 keeps it well inside screen

  return new THREE.Vector3(clampedX, SPAWN_HEIGHT, depth);
}

export default function Precision({ token, duration, difficulty, gameContainerRef, onComplete }) {
  const { applyMouseLook, createBaseScene } = useGameSettings();

  const mountRef = useRef(null);
  const countdownDisplayRef = useRef(null);
  const resumeOverlayRef = useRef(null);
  const scoreDisplayRef = useRef(null);

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const animIdRef = useRef();
  const timerRef = useRef();
  const countdownTimerRef = useRef();
  const canvasRef = useRef(null);

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const pointerLockedRef = useRef(false);
  const gameStateRef = useRef("playing");
  const countdownStartedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const timeRemainingRef = useRef(duration);
  const spawnDelayRef = useRef(0);
  const preSpawnedRef = useRef(false);

  // Target state
  const targetMeshRef = useRef(null);
  const targetTimerRef = useRef(0);      // how long current target has been alive
  const targetActiveRef = useRef(false); // is a target currently on screen
  const targetsRemainingRef = useRef(TOTAL_TARGETS);
  const targetsSpawnedRef = useRef(0);
  
  // Stats
  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const pausedRef = useRef(false);
  const resumingRef = useRef(false);
  const resumeCountdownRef = useRef(null);

  const [phase, setPhase] = useState("playing");

  const disappearTime = DIFFICULTY[difficulty]?.disappearTime ?? 1.0;

  useEffect(() => {
    if (phase !== "playing") return;

    const { scene, camera, renderer } = createBaseScene(mountRef.current);
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    const canvas = renderer.domElement;
    canvasRef.current = canvas;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleResize);

    // Request fullscreen + pointer lock
    const requestFullscreen = async () => {
      try {
        await gameContainerRef.current.requestFullscreen();
        await canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {
          canvas.requestPointerLock();
        });
      } catch (e) {
        console.log("fullscreen not available:", e);
      }
    };
    requestFullscreen();

    // Animate
    let lastFrameTime = performance.now();
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

    if (hasStartedRef.current && gameStateRef.current === "playing" && !pausedRef.current && !resumingRef.current) {
        if (targetActiveRef.current && targetMeshRef.current) {
          targetTimerRef.current += delta;

          if (targetTimerRef.current >= disappearTime) {
            removeTarget(scene);
            missesRef.current += 1;
            spawnDelayRef.current = SPAWN_BUFFER;
          }
        } else if (spawnDelayRef.current > 0) {
          spawnDelayRef.current -= delta;
        } else {
          // No active target and no delay — spawn next or end
          if (targetsSpawnedRef.current < TOTAL_TARGETS) {
            console.log("spawning target", targetsSpawnedRef.current + 1, "of", TOTAL_TARGETS);
            spawnTarget(scene);
            targetsSpawnedRef.current += 1;
          } else {
            // All targets spawned and last one is gone — end game
            console.log("all targets spawned, ending game");
            endGame();
          }
        }
      } else if (preSpawnedRef.current && targetActiveRef.current && !hasStartedRef.current) {
        // Pre-spawned target during countdown — freeze timer
        targetTimerRef.current = 0;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Pointer lock
    const requestLock = async () => {
      if (!pointerLockedRef.current) {
        try {
          await canvas.requestPointerLock({ unadjustedMovement: true });
        } catch (e) {
          canvas.requestPointerLock();
        }
      }
    };
    canvas.addEventListener("click", requestLock);

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement;
      if (locked) {
        resumeAudio();
        pointerLockedRef.current = true;
        if (resumeOverlayRef.current) resumeOverlayRef.current.style.display = "none";
        if (!countdownStartedRef.current && !hasStartedRef.current) {
          countdownStartedRef.current = true;
          startCountdown();
        } else if (hasStartedRef.current && gameStateRef.current === "playing") {
          startResumeCountdown();
        }
      } else {
        pointerLockedRef.current = false;
        if (gameStateRef.current === "playing" && hasStartedRef.current) {
          clearInterval(timerRef.current);
          pausedRef.current = true;
          if (resumeCountdownRef.current) {
            clearInterval(resumeCountdownRef.current);
            resumingRef.current = false;
          }
          if (resumeOverlayRef.current) resumeOverlayRef.current.style.display = "flex";
          if (document.fullscreenElement) document.exitFullscreen();
        }
      }
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    const onMouseMove = (e) => {
      if (!pointerLockedRef.current) return;
      applyMouseLook(e, yawRef, pitchRef);
    };
    document.addEventListener("mousemove", onMouseMove);

    // Shoot
    const onShoot = () => {
      if (!pointerLockedRef.current) return;
      if (gameStateRef.current !== "playing") return;
      if (!hasStartedRef.current) return;
      if (!targetActiveRef.current || !targetMeshRef.current) return;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const hits = raycaster.intersectObject(targetMeshRef.current);

        if (hits.length > 0) {
            playHit();
            scoreRef.current += 1;
            if (scoreDisplayRef.current) {
                scoreDisplayRef.current.textContent = `Score: ${scoreRef.current}`;
            }
            const timeLeft = disappearTime - targetTimerRef.current;
            removeTarget(scene);
            spawnDelayRef.current = timeLeft + SPAWN_BUFFER;
        }
        else {playShoot()}
      
    };
    document.addEventListener("click", onShoot);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      clearInterval(timerRef.current);
      clearInterval(resumeCountdownRef.current);
      clearInterval(countdownTimerRef.current);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("click", onShoot);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("fullscreenchange", handleResize);
      canvas.removeEventListener("click", requestLock);
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      targetMeshRef.current = null;
    };
  }, [phase]);

    function spawnTarget(scene) {
        const pos = randomSpawnPosition();
        console.log("SPAWN target at:", pos.x.toFixed(2), pos.y.toFixed(2), pos.z.toFixed(2));
        const geo = new THREE.SphereGeometry(TARGET_RADIUS, 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color: 0xe74c3c });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        scene.add(mesh);
        targetMeshRef.current = mesh;
        targetTimerRef.current = 0;
        targetActiveRef.current = true;
    }

    function removeTarget(scene) {
    console.log("REMOVE target, was active:", targetActiveRef.current);
    if (targetMeshRef.current) {
        scene.remove(targetMeshRef.current);
        targetMeshRef.current.geometry.dispose();
        targetMeshRef.current.material.dispose();
        targetMeshRef.current = null;
    }
    targetActiveRef.current = false;
    targetTimerRef.current = 0;
    }

    function startCountdown() {
    let count = 3;
    if (countdownDisplayRef.current) {
        countdownDisplayRef.current.style.display = "block";
        countdownDisplayRef.current.textContent = count;
    }

    // Pre-spawn first target but freeze its timer
    spawnTarget(sceneRef.current);
    targetsSpawnedRef.current = 1;
    preSpawnedRef.current = true;
    

    countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          playCountdownBeep(false); // regular beep
        if (countdownDisplayRef.current) countdownDisplayRef.current.textContent = count;
        } else {
        clearInterval(countdownTimerRef.current);
        playCountdownBeep(true); // final higher beep
        playSessionStart();

        if (countdownDisplayRef.current) countdownDisplayRef.current.style.display = "none";
        startGameTimer();
        }
    }, 1000);
    }

  function startResumeCountdown() {
    if (resumingRef.current) return;
    pausedRef.current = false;
    resumingRef.current = true;

    let count = 3;
    if (countdownDisplayRef.current) {
      countdownDisplayRef.current.style.display = "block";
      countdownDisplayRef.current.textContent = count;
    }

    resumeCountdownRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        playCountdownBeep(false);
        if (countdownDisplayRef.current) countdownDisplayRef.current.textContent = count;
      } else {
        clearInterval(resumeCountdownRef.current);
        resumingRef.current = false;
        playCountdownBeep(true);
        if (countdownDisplayRef.current) countdownDisplayRef.current.style.display = "none";
        timerRef.current = setInterval(() => {
          timeRemainingRef.current -= 1;
          if (timeRemainingRef.current <= 0) {
            clearInterval(timerRef.current);
            endGame();
          }
        }, 1000);
      }
    }, 1000);
  }

  
  function startGameTimer() {
  hasStartedRef.current = true; 
  }

  function endGame() {
    if (gameStateRef.current === "done") return; // prevent double call
    gameStateRef.current = "done";
    if (document.fullscreenElement) document.exitFullscreen();
    document.exitPointerLock();
    clearInterval(timerRef.current);

    const stats = {
      exercise: 'precision',
      difficulty,
      score: scoreRef.current,
      misses: missesRef.current,
    };

    console.log("=== PRECISION SESSION END ===");
    console.log("Score:", scoreRef.current);
    console.log("Misses:", missesRef.current);
    console.log("Total:", scoreRef.current + missesRef.current);
    console.log("Difficulty:", difficulty);
    console.log("===== DEBUG =====");
    console.log("targetsSpawned:", targetsSpawnedRef.current);
    console.log("score:", scoreRef.current);
    console.log("misses:", missesRef.current);
    console.log("total:", scoreRef.current + missesRef.current);
    preSpawnedRef.current = false;
    targetsSpawnedRef.current = 0;
    clearInterval(resumeCountdownRef.current);
    playSessionEnd();
    setPhase("done");
    onComplete(stats);
  }

  return (
    <div>
      {phase === "playing" && (
        <div ref={mountRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 10, cursor: "none" }} />
      )}

      {phase === "playing" && (
        <>
          <div ref={scoreDisplayRef} style={{ position: "fixed", top: "10px", right: "10px", zIndex: 20, fontSize: "18px", fontWeight: "600", color: "white" }}>
            Score: 0
          </div>

          <div ref={countdownDisplayRef} style={{ display: "none", position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 25, fontSize: "96px", fontWeight: "bold", color: "white", pointerEvents: "none" }} />

          {/* Crosshair */}
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 15, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "-8px", left: "50%", width: "2px", height: "8px", background: "white", transform: "translateX(-50%)" }} />
            <div style={{ position: "absolute", bottom: "-8px", left: "50%", width: "2px", height: "8px", background: "white", transform: "translateX(-50%)" }} />
            <div style={{ position: "absolute", left: "-8px", top: "50%", width: "8px", height: "2px", background: "white", transform: "translateY(-50%)" }} />
            <div style={{ position: "absolute", right: "-8px", top: "50%", width: "8px", height: "2px", background: "white", transform: "translateY(-50%)" }} />
          </div>

          <div
            ref={resumeOverlayRef}
            onClick={async () => {
              try {
                await gameContainerRef.current.requestFullscreen();
                await canvasRef.current.requestPointerLock({ unadjustedMovement: true }).catch(() => {
                  canvasRef.current.requestPointerLock();
                });
              } catch (e) {
                console.log(e);
              }
            }}
            style={{
              display: "none",
              position: "fixed", top: 0, left: 0,
              width: "100vw", height: "100vh",
              zIndex: 30,
              backgroundColor: "rgba(0,0,0,0.7)",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer"
            }}
          >
            <h2 style={{ fontSize: "32px", marginBottom: "12px" }}>Paused</h2>
            <p style={{ fontSize: "16px", color: "#aaa" }}>Click to resume</p>
          </div>
        </>
      )}

      {phase === "done" && <p>Loading results...</p>}
    </div>
  );
}