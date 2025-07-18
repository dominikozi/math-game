const canvas = document.getElementById("main-canvas");
const ctx = canvas.getContext("2d");
const answerInput = document.getElementById("answer-input");

let gameRunning = false;
let textQueue = [];
let textObjects = [];
let particles = [];
let lastSpawn = 0;
let spawnDelay = 900;
let fallingSpeed = 0.6;
let numberOfEquasions = 20;
const halfOfWidth = 300;
const countdownDuration = 3000;
let useZigzag = false;

function showScreen(id) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById("start-screen").style.display = "none";
  document.getElementById("game-container").style.display = "none";
  document.getElementById("end-screen").style.display = "none";
  document.getElementById("win-screen").style.display = "none";

  document.getElementById(id).style.display = "flex";
}

function startGame() {
  showScreen("game-container");
  console.log(`spawn delay: ${spawnDelay}`);
  console.log(`falling speed: ${fallingSpeed}`);
  console.log(`number of equasions: ${numberOfEquasions}`);

  textQueue = [];
  textObjects = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  lastSpawn = 0;
  gameRunning = false;

  answerInput.value = "";
  answerInput.focus();

  const barWrapper = document.getElementById("countdown-bar-wrapper");
  const bar = document.getElementById("countdown-bar");
  barWrapper.style.display = "block";
  bar.style.width = "100%";

  for (let i = 0; i < numberOfEquasions; i++) {
    textQueue.push(generateMathProblem());
  }

  startCountdown(() => {
    document.getElementById("countdown-bar-wrapper").style.display = "none";
    gameRunning = true;
    requestAnimationFrame(draw);
  });
}


function endGame() {
  gameRunning = false;
  showScreen("end-screen");

  startEndCountdown(() => {
    showScreen("start-screen");
  });
}

function generateMathProblem() {
  const operators = ['+', '-', '*', '*', '/'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let a, b, display, result;

  switch (operator) {
    case '+':
      a = Math.floor(Math.random() * 39) + 2;
      b = Math.floor(Math.random() * 39) + 1;
      result = a + b;
      display = `${a} + ${b}`;
      break;
    case '-':
      a = Math.floor(Math.random() * 39) + 2;
      b = Math.floor(Math.random() * (a - 1)) + 1;
      result = a - b;
      display = `${a} - ${b}`;
      break;
    case '*':
      a = Math.floor(Math.random() * 13) + 1;
      b = Math.floor(Math.random() * 13) + 1;
      result = a * b;
      display = `${a} × ${b}`;
      break;
    case '/':
      b = Math.floor(Math.random() * 12) + 2;
      const quotient = Math.floor(Math.random() * 12) + 1;
      a = b * quotient;
      result = quotient;
      display = `${a} / ${b}`;
      break;
  }

  return {
    text: display,
    result: result,
    operator: operator,
    operands: [a, b]
  };
}

function createFallingText(problemObj) {
  if (useZigzag) {
    const phase = Math.random() * Math.PI * 2;
    const amplitude = 80 + Math.random() * 60;
    const frequency = 0.015 / fallingSpeed;

    const trajectory = y => halfOfWidth + amplitude * Math.sin(y * frequency + phase);

    textObjects.push({
      ...problemObj,
      y: 0,
      trajectory,
      speed: fallingSpeed,
      visible: false,
      exploding: false,
      explodeFrame: 0,
      type: "zigzag"
    });
  } else {
    const angleDeg = -Math.random() * 30; 
    const angleRad = angleDeg * Math.PI / 180;
    const dx = Math.tan(angleRad); 

    const startX = 300 + Math.random() * 250; 

    textObjects.push({
      ...problemObj,
      x: startX,
      y: 0,
      dx: dx,
      speed: fallingSpeed,
      visible: false,
      exploding: false,
      explodeFrame: 0,
      type: "angled"
    });
  }
}


function draw(timestamp) {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";

  for (const obj of textObjects) {
    if (!obj.visible && !obj.exploding) continue;

    let x;

    if (obj.type === "zigzag") {
      x = obj.trajectory(obj.y);
      obj.y += obj.speed;
    } else if (obj.type === "angled") {
      x = obj.x;
      obj.y += obj.speed;
      obj.x += obj.dx * obj.speed;
      if (obj.x < 0) obj.x = 0;
      if (obj.x > canvas.width - 50) obj.x = canvas.width - 50;
    }

    if (obj.exploding) {
      ctx.save();
      ctx.translate(x, obj.y);
      const scale = 1 + obj.explodeFrame * 0.1;
      const alpha = 1 - obj.explodeFrame / 10;
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "yellow";
      ctx.fillText(obj.text, 0, 0);
      ctx.restore();

      obj.explodeFrame += 1;
      if (obj.explodeFrame > 10) {
        obj.exploding = false;
        obj.visible = false;
      }
    } else {
      ctx.fillStyle = "white";
      ctx.fillText(obj.text, x, obj.y);
      obj.y += obj.speed;

      if (obj.y > canvas.height + 20) {
        console.log(`Missed equation: ${obj.text} = ${obj.result}`);
        endGame();
        return;
      }
    }

    if (obj.y > canvas.height + 20) {
      console.log(`Missed equation: ${obj.text} = ${obj.result}`);
      endGame();
      return;
    }
  }

  if (textQueue.length > 0 && timestamp - lastSpawn > spawnDelay) {
    const problem = textQueue.shift();
    createFallingText(problem);
    textObjects[textObjects.length - 1].visible = true;
    lastSpawn = timestamp;
  }

  if (textQueue.length === 0 && textObjects.every(obj => !obj.visible)) {
    gameRunning = false;
    showScreen("win-screen");

    startWinCountdown(() => {
      showScreen("start-screen");
    });
    return;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
  const p = particles[i];
  ctx.fillStyle = `rgba(255, 255, 0, ${p.alpha})`;
  ctx.fillText(p.char, p.x, p.y);
  p.y += p.dy;
  p.alpha -= 0.02;

  if (p.alpha <= 0 || p.y > canvas.height + 50) {
    particles.splice(i, 1); 
  }
}

  requestAnimationFrame(draw);
}

answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const value = parseInt(answerInput.value.trim());
    console.log(value);
    if (isNaN(value)) return;

    let foundMatch = false;

    for (const obj of textObjects) {
      if (obj.visible && obj.result === value) {
        const x = obj.type === "zigzag" ? obj.trajectory(obj.y) : obj.x;
        createParticles(obj.text, x, obj.y);
        obj.visible = false;
        foundMatch = true;
      }
    }

    if (!foundMatch) {
      const lowest = textObjects
        .filter(obj => obj.visible)
        .reduce((lowest, obj) => (!lowest || obj.y > lowest.y ? obj : lowest), null);

      if (lowest) {
        console.log(`Wrong answer: ${lowest.text} = ${lowest.result}`);
      }

      endGame();
      return;
    }

    answerInput.value = "";
  }
});

function startCountdown(callback) {
  const bar = document.getElementById("countdown-bar");
  let duration = countdownDuration;
  let start = null;

  function animateBar(timestamp) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.max(0, 1 - elapsed / duration);
    bar.style.width = `${progress * 100}%`;

    if (elapsed < duration) {
      requestAnimationFrame(animateBar);
    } else {
      bar.style.width = "0%";
      document.getElementById("countdown-bar-wrapper").style.display = "none";
      callback(); // start the game
    }
  }

  bar.style.width = "100%";
  requestAnimationFrame(animateBar);
}

function startEndCountdown(callback) {
  const wrapper = document.getElementById("end-countdown-bar-wrapper");
  const bar = document.getElementById("end-countdown-bar");

  wrapper.style.display = "block";
  bar.style.width = "100%";

  let duration = countdownDuration;
  let start = null;

  function animateEndBar(timestamp) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.max(0, 1 - elapsed / duration);
    bar.style.width = `${progress * 100}%`;

    if (elapsed < duration) {
      requestAnimationFrame(animateEndBar);
    } else {
      bar.style.width = "0%";
      wrapper.style.display = "none";
      callback();
    }
  }

  requestAnimationFrame(animateEndBar);
}

function startWinCountdown(callback) {
  const wrapper = document.getElementById("win-countdown-bar-wrapper");
  const bar = document.getElementById("win-countdown-bar");

  wrapper.style.display = "block";
  bar.style.width = "100%";

  let duration = countdownDuration;
  let start = null;

  function animateWinBar(timestamp) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.max(0, 1 - elapsed / duration);
    bar.style.width = `${progress * 100}%`;

    if (elapsed < duration) {
      requestAnimationFrame(animateWinBar);
    } else {
      bar.style.width = "0%";
      wrapper.style.display = "none";
      callback();
    }
  }

  requestAnimationFrame(animateWinBar);
}

function createParticles(text, x, y) {
  const spacing = 16;
  for (let i = 0; i < text.length; i++) {
    particles.push({
      char: text[i],
      x: x + i * spacing,
      y: y,
      dy: 1 + Math.random() * 2,
      alpha: 1
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("start-button").addEventListener("click", startGame);

  document.getElementById("toggle-mode-button").addEventListener("click", () => {
    useZigzag = !useZigzag;
    const modeText = useZigzag ? "mode: zigzag" : "mode: angled";
    document.getElementById("toggle-mode-button").textContent = modeText;
  });

  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = parseInt(answerInput.value.trim());
      if (isNaN(value)) return;

      let foundMatch = false;

      for (const obj of textObjects) {
        if (obj.visible && obj.result === value) {
          const x = obj.type === "zigzag" ? obj.trajectory(obj.y) : obj.x;
          createParticles(obj.text, x, obj.y);
          obj.visible = false;
          foundMatch = true;
        }
      }

      if (!foundMatch) {
        const lowest = textObjects
          .filter(obj => obj.visible)
          .reduce((lowest, obj) => (!lowest || obj.y > lowest.y ? obj : lowest), null);

        if (lowest) {
          console.log(`Wrong answer: ${lowest.text} = ${lowest.result}`);
        }

        endGame();
        return;
      }

      answerInput.value = "";
    }
  });
});

document.getElementById("settings-button").addEventListener("click", () => {
  document.getElementById("settings-popup").classList.remove("hidden");
});

document.getElementById("close-settings").addEventListener("click", () => {
  document.getElementById("settings-popup").classList.add("hidden");
});

document.getElementById("apply-settings").addEventListener("click", () => {
  spawnDelay = parseInt(document.getElementById("input-spawn-delay").value);
  fallingSpeed = parseFloat(document.getElementById("input-falling-speed").value);
  numberOfEquasions = parseInt(document.getElementById("input-number-equations").value);
  
  document.getElementById("settings-popup").classList.add("hidden");
});

const popup = document.getElementById("settings-popup");
const header = document.getElementById("settings-header");

let offsetX = 0, offsetY = 0;
let isDragging = false;

header.addEventListener("mousedown", (e) => {
  isDragging = true;
  const rect = popup.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  popup.style.left = `${e.clientX - offsetX}px`;
  popup.style.top = `${e.clientY - offsetY}px`;
  popup.style.transform = "none";
});