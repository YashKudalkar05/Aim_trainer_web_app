import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameSettings } from "./gamesettings";
import { playHit, playShoot, playCountdownBeep, playSessionStart, playSessionEnd, resumeAudio } from "./sounds";

const HEALTH_DRAIN_TIME = 3;
const MIN_DIRECTION_TIME = 1.2; // minimum seconds before direction can change
const MAX_DIRECTION_TIME = 2.5; // maximum seconds before forced direction change
const TARGET_RADIUS = 0.5;
const HEALTH_BAR_WIDTH = 1.2;
const HEALTH_BAR_HEIGHT = 0.12;
const MOVE_SPEED = 3;
const HORIZONTAL_RANGE = 5;      // how far left/right target can travel
const SPAWN_HORIZONTAL = 5;      // spawn x range — tweak this
const SPAWN_VERTICAL = 2.5;      // spawn y range — tweak this
const SPAWN_DEPTH_MIN = -7;      // closest spawn distance
const SPAWN_DEPTH_MAX = -9;      // furthest spawn distance

function randomSpawnPosition() {
  const depth = SPAWN_DEPTH_MIN + Math.random() * (SPAWN_DEPTH_MAX - SPAWN_DEPTH_MIN);
  const x = (Math.random() - 0.5) * SPAWN_HORIZONTAL;
  const y = (Math.random() - 0.5) * SPAWN_VERTICAL;
  return new THREE.Vector3(x, y, depth);
}

export default function Tracking({ token, duration, gameContainerRef, onComplete }) {
  const { applyMouseLook, createBaseScene, computeStats } = useGameSettings();

  const mountRef = useRef(null);
  const timerDisplayRef = useRef(null);
  const countdownDisplayRef = useRef(null);
  const resumeOverlayRef = useRef(null);

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const animIdRef = useRef();
  const timerRef = useRef();
  const countdownTimerRef = useRef();
  const directionTimeRef = useRef(0);      // how long current direction has been active
  const nextChangeTimeRef = useRef(0);     // when to next change direction

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const pointerLockedRef = useRef(false);
  const gameStateRef = useRef("playing");
  const countdownStartedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const timeRemainingRef = useRef(duration);

  // Target state as refs
  const targetMeshRef = useRef(null);
  const healthBarBgRef = useRef(null);
  const healthBarFillRef = useRef(null);
  const targetHealthRef = useRef(1); // 0 to 1
  const targetDirectionRef = useRef(1); // clockwise or counter-clockwise
  const targetPosRef = useRef(new THREE.Vector3());

  const timeOnTargetRef = useRef(0);    // total seconds crosshair was on target
  const trackingScoreRef = useRef(0);   // cumulative health dealt
  const prevHealthRef = useRef(1);      // track health before each frame to calc delta
  
  const score = useRef(0);
  const misses = useRef(0);
  const reactionTimes = useRef([]);
  const lastHitTime = useRef(null);

  // Pause state as refs
  const resumingRef = useRef(false);
  const resumeCountdownRef = useRef(null);

  const pausedRef = useRef(false);
  const canvasRef = useRef(null);

  const [phase, setPhase] = useState("playing");

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

    // Spawn initial target
    spawnTarget(scene);
    lastHitTime.current = performance.now();

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

      console.log("animate running, hasStarted:", hasStartedRef.current, "gameState:", gameStateRef.current, "target:", !!targetMeshRef.current);

      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

      if (hasStartedRef.current && gameStateRef.current === "playing" && !resumingRef.current && !pausedRef.current && targetMeshRef.current) {

        // Update direction timer
        directionTimeRef.current += delta;

        // Change direction if enough time has passed
        if (directionTimeRef.current >= nextChangeTimeRef.current) {
          targetDirectionRef.current *= -1;
          directionTimeRef.current = 0;
          nextChangeTimeRef.current = MIN_DIRECTION_TIME + Math.random() * (MAX_DIRECTION_TIME - MIN_DIRECTION_TIME);
        }

        // Move target linearly
        targetPosRef.current.x += MOVE_SPEED * delta * targetDirectionRef.current;

        // Bounce off edges instead of clipping
        if (targetPosRef.current.x > HORIZONTAL_RANGE / 2) {
          targetPosRef.current.x = HORIZONTAL_RANGE / 2;
          targetDirectionRef.current = -1;
          directionTimeRef.current = 0;
          nextChangeTimeRef.current = MIN_DIRECTION_TIME + Math.random() * (MAX_DIRECTION_TIME - MIN_DIRECTION_TIME);
        } else if (targetPosRef.current.x < -HORIZONTAL_RANGE / 2) {
          targetPosRef.current.x = -HORIZONTAL_RANGE / 2;
          targetDirectionRef.current = 1;
          directionTimeRef.current = 0;
          nextChangeTimeRef.current = MIN_DIRECTION_TIME + Math.random() * (MAX_DIRECTION_TIME - MIN_DIRECTION_TIME);
        }

        targetMeshRef.current.position.copy(targetPosRef.current);

        // Update health bar
        if (healthBarBgRef.current && healthBarFillRef.current) {
          const barY = targetPosRef.current.y + TARGET_RADIUS + 0.3;
          healthBarBgRef.current.position.set(targetPosRef.current.x, barY, targetPosRef.current.z);
          healthBarFillRef.current.position.set(
            targetPosRef.current.x - HEALTH_BAR_WIDTH / 2 * (1 - targetHealthRef.current),
            barY,
            targetPosRef.current.z + 0.01
          );
        }

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const hits = raycaster.intersectObject(targetMeshRef.current);

        if (hits.length > 0) {
          timeOnTargetRef.current += delta;

          targetHealthRef.current -= delta / HEALTH_DRAIN_TIME;
          if (targetHealthRef.current <= 0) {
            targetHealthRef.current = 0;
            // full kill — add remaining health that was dealt this frame
            trackingScoreRef.current += prevHealthRef.current;
            prevHealthRef.current = 1; // reset for next target
            killTarget();
          } else {
            updateHealthBar();
          }
        } else {
          prevHealthRef.current = targetHealthRef.current;
        }
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
          pausedRef.current = true;
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

    const onMouseMove = (e) => {
      if (!pointerLockedRef.current) return;
      applyMouseLook(e, yawRef, pitchRef);
    };
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      clearInterval(timerRef.current);
      clearInterval(countdownTimerRef.current);
      clearInterval(resumeCountdownRef.current);
      timeOnTargetRef.current = 0;


      document.removeEventListener("mousemove", onMouseMove);
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

  function startResumeCountdown() {
    if (resumingRef.current) return; // already resuming
    pausedRef.current = false; // ADD THIS
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

  function spawnTarget(scene) {
    if (targetMeshRef.current) {
      scene.remove(targetMeshRef.current);
      scene.remove(healthBarBgRef.current);
      scene.remove(healthBarFillRef.current);
    }

    const pos = randomSpawnPosition(); // simplified, no camera arg needed
    targetPosRef.current.copy(pos);
    directionTimeRef.current = 0;
    nextChangeTimeRef.current = MIN_DIRECTION_TIME + Math.random() * (MAX_DIRECTION_TIME - MIN_DIRECTION_TIME);
    targetDirectionRef.current = Math.random() > 0.5 ? 1 : -1;

    // Target sphere
    const geo = new THREE.SphereGeometry(TARGET_RADIUS, 16, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0xe74c3c });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    targetMeshRef.current = mesh;

    // Health bar background (grey)
    const bgGeo = new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.position.set(pos.x, pos.y + TARGET_RADIUS + 0.3, pos.z);
    scene.add(bgMesh);
    healthBarBgRef.current = bgMesh;

    // Health bar fill (green)
    const fillGeo = new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    fillMesh.position.set(pos.x, pos.y + TARGET_RADIUS + 0.3, pos.z + 0.01);
    scene.add(fillMesh);
    healthBarFillRef.current = fillMesh;

    targetHealthRef.current = 1;

  }

  function updateHealthBar() {
    if (!healthBarFillRef.current) return;
    const health = targetHealthRef.current;
    healthBarFillRef.current.scale.x = Math.max(health, 0);
  }

  function killTarget() {
    score.current += 1;
    const now = performance.now();
    reactionTimes.current.push(now - lastHitTime.current);
    lastHitTime.current = now;
    prevHealthRef.current = 1;
    playHit();
    spawnTarget(sceneRef.current);
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

  function startGameTimer() {
    hasStartedRef.current = true;
    timeRemainingRef.current = duration;
    if (timerDisplayRef.current) timerDisplayRef.current.textContent = `Time: ${duration}s`;

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
    gameStateRef.current = "done";
    if (document.fullscreenElement) document.exitFullscreen();
    document.exitPointerLock();

    // Add health dealt on current target before game ended
    const currentTargetHealth = targetHealthRef.current;
    const healthDealtOnCurrent = 1 - currentTargetHealth;
    trackingScoreRef.current += healthDealtOnCurrent;

    // Time on target as percentage of total session time
    const timeOnTargetPct = Math.round((timeOnTargetRef.current / duration) * 100);

    const currentTargetDamagePct = Math.round((1 - targetHealthRef.current) * 100);
    const finalTrackingScore = (score.current * 100) + currentTargetDamagePct;

    // ADD THESE:
    console.log("=== SESSION END ===");
    console.log("Total time on target (seconds):", timeOnTargetRef.current.toFixed(2));
    console.log("Time on target %:", timeOnTargetPct);
    console.log("Tracking score (health dealt):", finalTrackingScore);
    console.log("Targets killed:", score.current);
    console.log("Session duration:", duration);
    
    const stats = {
      exercise: 'tracking',
      duration,
      trackingScore: finalTrackingScore,
      timeOnTarget: timeOnTargetPct,
    };

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
          <div ref={timerDisplayRef} style={{ position: "fixed", top: "10px", left: "10px", zIndex: 20, fontSize: "18px", fontWeight: "600", color: "white" }}>
            Time: {duration}s
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