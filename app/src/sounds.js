// sounds.js — Web Audio API sound effects
// All sounds generated programmatically, no files needed

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// Master volume — default 0.5
let masterVolume = 0.5;

export function setMasterVolume(val) {
  masterVolume = val;
}

export function getMasterVolume() {
  return masterVolume;
}
function playSound({ frequency, type, duration, volume, frequencyEnd, attack, decay }) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = type || "sine";
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  // Optional frequency sweep
  if (frequencyEnd) {
    oscillator.frequency.exponentialRampToValueAtTime(
      frequencyEnd,
      audioCtx.currentTime + duration
    );
  }

  // Attack
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(
    (volume || 0.3)* masterVolume,
    audioCtx.currentTime + (attack || 0.005)
  );

  // Decay
  gainNode.gain.linearRampToValueAtTime(
    0,
    audioCtx.currentTime + duration - (decay || 0.01)
  );

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}



// Resume context on first user interaction (browser requirement)
export function resumeAudio() {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// Shoot — short sharp click
export function playShoot() {
  playSound({
    frequency: 800,
    frequencyEnd: 100,
    type: "triangle",
    duration: 0.08,
    volume: 0.15,
    attack: 0.001,
    decay: 0.02,
  });
}

// Target hit — satisfying high ping
export function playHit() {
  playSound({
      frequency: 300,
      frequencyEnd: 300,
      type: "triangle",
      duration: 0.12,
      volume: 0.25,
      attack: 0.01,
      decay: 0.1,
    });
}

// Countdown beep — clean tick
export function playCountdownBeep(isFinal = false) {
  playSound({
    frequency: isFinal ? 1000 : 600,
    type: "sine",
    duration: isFinal ? 0.2 : 0.1,
    volume: 0.2,
    attack: 0.001,
    decay: 0.05,
  });
}

// Session start — rising tone
export function playSessionStart() {
  playSound({
    frequency: 400,
    frequencyEnd: 800,
    type: "sine",
    duration: 0.3,
    volume: 0.2,
    attack: 0.01,
    decay: 0.05,
  });
  setTimeout(() => {
    playSound({
      frequency: 600,
      frequencyEnd: 1200,
      type: "sine",
      duration: 0.3,
      volume: 0.2,
      attack: 0.01,
      decay: 0.05,
    });
  }, 150);
}

// Session end — descending tone
export function playSessionEnd() {
  playSound({
    frequency: 800,
    frequencyEnd: 400,
    type: "sine",
    duration: 0.3,
    volume: 0.2,
    attack: 0.01,
    decay: 0.05,
  });
  setTimeout(() => {
    playSound({
      frequency: 600,
      frequencyEnd: 300,
      type: "sine",
      duration: 0.4,
      volume: 0.2,
      attack: 0.01,
      decay: 0.1,
    });
  }, 200);
}