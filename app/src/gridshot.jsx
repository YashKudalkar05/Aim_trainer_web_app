import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameSettings } from "./gamesettings";
import { playHit, playShoot, playCountdownBeep, playSessionStart, playSessionEnd, resumeAudio } from "./sounds";

const GRID_COLS = 5;
const GRID_ROWS = 5;
const GRID_SPACING = 2;
const GRID_DEPTH = -12;
const TARGETS_VISIBLE = 4;
const TARGET_RADIUS = 1;


export default function Gridshot({ token, duration, gameContainerRef, onComplete }) {
  const { applyMouseLook, createBaseScene, computeStats } = useGameSettings();

  const mountRef = useRef(null);
  const timerDisplayRef = useRef(null);
  const countdownDisplayRef = useRef(null);
  const resumeOverlayRef = useRef(null);

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const targetsRef = useRef([]);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const timerRef = useRef();
  const countdownTimerRef = useRef();
  const animIdRef = useRef();
  const gameStateRef = useRef("playing");
  const countdownStartedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const pointerLockedRef = useRef(false);
  const timeRemainingRef = useRef(duration);
  const canvasRef = useRef(null);
  const shotFiredRef = useRef(false);
  const resumingRef = useRef(false);
  const resumeCountdownRef = useRef(null);

  const score = useRef(0);
  const misses = useRef(0);
  const reactionTimes = useRef([]);
  const lastHitTime = useRef(null);

  const [phase, setPhase] = useState("playing");

  useEffect(() => {
    if (phase !== "playing") return;
    console.log("useEffect running, mountRef:", mountRef.current);

    const { scene, camera, renderer } = createBaseScene(mountRef.current);
    console.log("scene created:", scene, "camera:", camera, "renderer:", renderer);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    canvasRef.current = renderer.domElement;
    const canvas = renderer.domElement;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);
    handleResize(); 
    document.addEventListener("fullscreenchange", handleResize);

    spawnTargets(scene, TARGETS_VISIBLE);
    lastHitTime.current = performance.now();

    // Request fullscreen then auto pointer lock
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
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

      // Process shot if fired
      if (shotFiredRef.current) {
        shotFiredRef.current = false;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const meshes = targetsRef.current.map(t => t.mesh);
        const hits = raycaster.intersectObjects(meshes);

        if (hits.length > 0) {
          const hitMesh = hits[0].object;
          const idx = targetsRef.current.findIndex(t => t.mesh === hitMesh);
          if (idx !== -1) {
            playHit();
            const hitPos = { col: targetsRef.current[idx].gridX, row: targetsRef.current[idx].gridY };
            sceneRef.current.remove(targetsRef.current[idx].mesh);
            targetsRef.current.splice(idx, 1);
            score.current += 1;
            const now = performance.now();
            reactionTimes.current.push(now - lastHitTime.current);
            lastHitTime.current = now;
            spawnTargets(sceneRef.current, 1, hitPos);
          }
        } else {
          playShoot();
          misses.current += 1;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Pointer lock change
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement;
      if (locked) {
        resumeAudio();
        pointerLockedRef.current = true;
        if (resumeOverlayRef.current) resumeOverlayRef.current.style.display = "none";

        if (!countdownStartedRef.current && !hasStartedRef.current) {
          // First time locking — start initial countdown
          countdownStartedRef.current = true;
          startCountdown();
        } else if (hasStartedRef.current && gameStateRef.current === "playing") {
          // Resuming after pause — start resume countdown
          startResumeCountdown();
        }
      } else {
        pointerLockedRef.current = false;
        if (gameStateRef.current === "playing" && hasStartedRef.current) {
          // Pause the game timer
          clearInterval(timerRef.current);
          // Clear any resume countdown in progress
          if (resumeCountdownRef.current) {
            clearInterval(resumeCountdownRef.current);
            resumingRef.current = false;
          }
          if (resumeOverlayRef.current) resumeOverlayRef.current.style.display = "flex";
          // Exit fullscreen on ESC
          if (document.fullscreenElement) document.exitFullscreen();
        }
      }
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    // Resume click
    const onResumeClick = async () => {
      if (!pointerLockedRef.current) {
        try {
          await canvas.requestPointerLock({ unadjustedMovement: true });
        } catch (e) {
          canvas.requestPointerLock();
        }
      }
    };
    canvas.addEventListener("click", onResumeClick);

    // Mouse move
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
      if (resumingRef.current) return;
      shotFiredRef.current = true;
    };
    document.addEventListener("mousedown", onShoot);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      clearInterval(timerRef.current);
      clearInterval(countdownTimerRef.current);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onShoot);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("fullscreenchange", handleResize);
      canvas.removeEventListener("click", onResumeClick);
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      targetsRef.current = [];
    };
  }, [phase]);

  function startResumeCountdown() {
    if (resumingRef.current) return; // already resuming
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
        // Resume game timer from where it left off
        timerRef.current = setInterval(() => {
          timeRemainingRef.current -= 1;
          if (timerDisplayRef.current) {
            timerDisplayRef.current.textContent = `Time: ${timeRemainingRef.current}s`;
          }
          if (timeRemainingRef.current <= 0) {
            clearInterval(timerRef.current);
            endGame();
          }
        }, 1000);
      }
    }, 1000);
  }

  function spawnTargets(scene, count, excludePos = null) {
    console.log("spawnTargets called, count:", count, "scene:", scene, "available targets before:", targetsRef.current.length);
    
    const occupied = new Set(
      targetsRef.current.map(t => `${t.gridX},${t.gridY}`)
    );

    if (excludePos) {
      occupied.add(`${excludePos.col},${excludePos.row}`);
    }

    const available = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (!occupied.has(`${col},${row}`)) {
          available.push({ col, row });
        }
      }
    }

    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    for (let i = 0; i < count && i < available.length; i++) {
      const { col, row } = available[i];
      const x = (col - (GRID_COLS - 1) / 2) * GRID_SPACING;
      const y = (row - (GRID_ROWS - 1) / 2) * GRID_SPACING;

      const geo = new THREE.SphereGeometry(TARGET_RADIUS, 16, 16);
      const mat = new THREE.MeshPhongMaterial({ color: 0xe74c3c });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, GRID_DEPTH);
      scene.add(mesh);
      console.log("target added at:", x, y, GRID_DEPTH, "total targets:", targetsRef.current.length);
      targetsRef.current.push({ mesh, gridX: col, gridY: row });
    }
  }

  function startCountdown() {
    let count = 3;
    if (countdownDisplayRef.current) {
      countdownDisplayRef.current.style.display = "block";
      countdownDisplayRef.current.textContent = count;
    }

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        playCountdownBeep(false); // regular beep
        if (countdownDisplayRef.current) {
          countdownDisplayRef.current.textContent = count;
        }
      } else {
        clearInterval(countdownTimerRef.current);
        playCountdownBeep(true); // final higher beep
        playSessionStart();

        if (countdownDisplayRef.current) {
          countdownDisplayRef.current.style.display = "none";
        }
        startGameTimer();
      }
    }, 1000);
  }

  function startGameTimer() {
    hasStartedRef.current = true;
    timeRemainingRef.current = duration;

    if (timerDisplayRef.current) {
      timerDisplayRef.current.textContent = `Time: ${duration}s`;
    }

    timerRef.current = setInterval(() => {
      timeRemainingRef.current -= 1;
      if (timerDisplayRef.current) {
        timerDisplayRef.current.textContent = `Time: ${timeRemainingRef.current}s`;
      }
      if (timeRemainingRef.current <= 0) {
        clearInterval(timerRef.current);
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    gameStateRef.current = "done";
    document.exitPointerLock();
    const stats = computeStats(score, misses, reactionTimes, duration);

    clearInterval(resumeCountdownRef.current);
    playSessionEnd();
    setPhase("done");
    onComplete({ ...stats, exercise: 'flicking' });
  }

  return (
    <div>
      {phase === "playing" && (
        <>
          <div
            ref={mountRef}
            style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 10, cursor: "none" }}
          />

          <div
            ref={timerDisplayRef}
            style={{ position: "fixed", top: "10px", left: "10px", zIndex: 20, fontSize: "18px", fontWeight: "600", color: "white" }}
          >
            Time: {duration}s
          </div>

          <div
            ref={countdownDisplayRef}
            style={{
              display: "none",
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 25, fontSize: "96px", fontWeight: "bold", color: "white",
              pointerEvents: "none"
            }}
          />

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