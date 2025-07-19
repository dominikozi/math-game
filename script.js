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
let numberOfEquations = 20;
let countdownDuration = 2000;
let useZigzag = false;
let drawRectangles = true;
let loadingActive = false;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const config = {
  '+': { aMin: 1, aMax: 20, bMin: 1, bMax: 15 },
  '-': { aMin: 4, aMax: 23, bMinGap: 3 },
  '*': { aMin: 1, aMax: 12, bMin: 1, bMax: 12 },
  '/': { quotientMin: 2, quotientMax: 10, bMin: 1, bMax: 10 }
};

const GAME_CONSTANTS = {
  EXPLOSION_FRAMES: 10,
  PARTICLE_SPACING: 16,
  RECT_PADDING: 4,
  FONT_SIZE: 20,
};

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
  logConfig();

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

  for (let i = 0; i < numberOfEquations; i++) {
    textQueue.push(generateMathProblem());
  }

  startGenericCountdown("countdown-bar-wrapper", "countdown-bar", () => {
    document.getElementById("countdown-bar-wrapper").style.display = "none";
    gameRunning = true;
    requestAnimationFrame(draw);
  });
}

function logConfig(){
  console.log("=== GAME SETTINGS ===");
  console.log(`spawn delay: ${spawnDelay}`);
  console.log(`falling speed: ${fallingSpeed}`);
  console.log(`number of equasions: ${numberOfEquations}`);

  console.log("=== EQUATION CONFIG ===");
  console.log(`Addition:    aMin=${config['+'].aMin}, aMax=${config['+'].aMax}, bMin=${config['+'].bMin}, bMax=${config['+'].bMax}`);
  console.log(`Subtraction: aMin=${config['-'].aMin}, aMax=${config['-'].aMax}, bMinGap=${config['-'].bMinGap}`);
  console.log(`Multiplication: aMin=${config['*'].aMin}, aMax=${config['*'].aMax}, bMin=${config['*'].bMin}, bMax=${config['*'].bMax}`);
  console.log(`Division: quotientMin=${config['/'].quotientMin}, quotientMax=${config['/'].quotientMax}, bMin=${config['/'].bMin}, bMax=${config['/'].bMax}`);
}

function endGame() {
  gameRunning = false;
  showScreen("end-screen");

  startGenericCountdown("end-countdown-bar-wrapper", "end-countdown-bar", () => {
    showScreen("start-screen");
  });
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMathProblem() {
  const operators = ['+', '-', '*', '*', '/'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let a, b, display, result;

  switch (operator) {
    case '+':
      a = rand(config['+'].aMin, config['+'].aMax);
      b = rand(config['+'].bMin, config['+'].bMax);
      result = a + b;
      display = `${a} + ${b}`;
      break;
    case '-':
      a = rand(config['-'].aMin, config['-'].aMax);
      b = rand(1, a - config['-'].bMinGap);
      result = a - b;
      display = `${a} - ${b}`;
      break;
    case '*':
      a = rand(config['*'].aMin, config['*'].aMax);
      b = rand(config['*'].bMin, config['*'].bMax);
      result = a * b;
      display = `${a} × ${b}`;
      break;
    case '/':
      const quotient = rand(config['/'].quotientMin, config['/'].quotientMax);
      b = rand(config['/'].bMin, config['/'].bMax);
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

    const trajectory = y => (canvas.width/2) + amplitude * Math.sin(y * frequency + phase);

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

    const startX = (canvas.width/2) + Math.random() * 250; 

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
      const alpha = 1 - obj.explodeFrame / GAME_CONSTANTS.EXPLOSION_FRAMES;
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "yellow";
      ctx.fillText(obj.text, 0, 0);
      ctx.restore();

      obj.explodeFrame += 1;
      if (obj.explodeFrame > GAME_CONSTANTS.EXPLOSION_FRAMES) {
        obj.exploding = false;
        obj.visible = false;
      }
    } else {
      ctx.fillStyle = "white";

      if (drawRectangles) {
        ctx.font = "16px 'Courier New', monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = obj.color || "white";

        const padding = GAME_CONSTANTS.RECT_PADDING;
        const textMetrics = ctx.measureText(obj.text);
        const textWidth = textMetrics.width;
        const textHeight = GAME_CONSTANTS.FONT_SIZE;

        const maxX = canvas.width - textWidth - padding * 2;
        x = Math.min(x, maxX);

        const drawX = x;
        const drawY = obj.y;

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX - padding, drawY - padding, textWidth + 2 * padding, textHeight + 2 * padding);
      }

      ctx.fillText(obj.text, x, obj.y);
      obj.y += obj.speed;
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

    startGenericCountdown("win-countdown-bar-wrapper", "win-countdown-bar", () => {
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
    if(loadingActive) return;
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

function createParticles(text, x, y) {
  const spacing = GAME_CONSTANTS.PARTICLE_SPACING;
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
});

let isCustom = false;

document.getElementById("settings-button").addEventListener("click", () => {
  document.getElementById("settings-popup").classList.remove("hidden");
  
  document.getElementById("settings-config").classList.add("hidden");
  document.getElementById("settings-inputs").classList.remove("hidden");
});

document.getElementById("custom-settings").addEventListener("click", () => {
  isCustom = !isCustom;
  if(isCustom){
    document.getElementById("settings-config").classList.remove("hidden");
    document.getElementById("settings-inputs").classList.add("hidden");
  }else{
    document.getElementById("settings-config").classList.add("hidden");
    document.getElementById("settings-inputs").classList.remove("hidden");
  }
});

document.getElementById("default-settings").addEventListener("click", () => {
  document.getElementById("config-addition-a-min").value = 1;
  document.getElementById("config-addition-a-max").value = 20;
  document.getElementById("config-addition-b-min").value = 1;
  document.getElementById("config-addition-b-max").value = 15;

  document.getElementById("config-sub-a-min").value = 4;
  document.getElementById("config-sub-a-max").value = 23;
  document.getElementById("config-sub-min-gap").value = 3;

  document.getElementById("config-multi-a-min").value = 1;
  document.getElementById("config-multi-a-max").value = 12;
  document.getElementById("config-multi-b-min").value = 1;
  document.getElementById("config-multi-b-max").value = 12;

  document.getElementById("config-div-quotient-min").value = 2;
  document.getElementById("config-div-quotient-max").value = 10;
  document.getElementById("config-div-b-min").value = 1;
  document.getElementById("config-div-b-max").value = 10;

  document.getElementById("input-spawn-delay").value = 900;
  document.getElementById("input-falling-speed").value = 0.6;
  document.getElementById("input-number-equations").value = 20;
});

document.getElementById("apply-settings").addEventListener("click", () => {
  spawnDelay = clampAndUpdate("input-spawn-delay", 1, 5000);
  fallingSpeed = clampAndUpdate("input-falling-speed", 0.1, 5, true);
  numberOfEquations = clampAndUpdate("input-number-equations", 1, 100);

  document.getElementById("settings-popup").classList.add("hidden");

  config['+'].aMin = clampAndUpdate("config-addition-a-min", 1, 5000);
  config['+'].aMax = clampAndUpdate("config-addition-a-max", 1, 5000);
  config['+'].bMin = clampAndUpdate("config-addition-b-min", 1, 5000);
  config['+'].bMax = clampAndUpdate("config-addition-b-max", 1, 5000);

  config['-'].aMin = clampAndUpdate("config-sub-a-min", 1, 5000);
  config['-'].aMax = clampAndUpdate("config-sub-a-max", 1, 5000);
  config['-'].bMinGap = clampAndUpdate("config-sub-min-gap", 1, 5000);

  config['*'].aMin = clampAndUpdate("config-multi-a-min", 1, 100);
  config['*'].aMax = clampAndUpdate("config-multi-a-max", 1, 100);
  config['*'].bMin = clampAndUpdate("config-multi-b-min", 1, 100);
  config['*'].bMax = clampAndUpdate("config-multi-b-max", 1, 100);

  config['/'].quotientMin = clampAndUpdate("config-div-quotient-min", 1, 100, true);
  config['/'].quotientMax = clampAndUpdate("config-div-quotient-max", 1, 100, true);
  config['/'].bMin = clampAndUpdate("config-div-b-min", 1, 100, true);
  config['/'].bMax = clampAndUpdate("config-div-b-max", 1, 100, true);
});

function clampAndUpdate(inputId, min, max, isFloat = false) {
  const input = document.getElementById(inputId);
  const rawValue = isFloat ? parseFloat(input.value) : parseInt(input.value);
  const clamped = Math.max(min, Math.min(max, rawValue));
  input.value = clamped;
  return clamped;
}

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


function startGenericCountdown(wrapperId, barId, callback) {
  loadingActive = true;
  const wrapper = document.getElementById(wrapperId);
  const bar = document.getElementById(barId);

  wrapper.style.display = "block";
  bar.style.width = "100%";

  let duration = countdownDuration;
  let start = null;

  function animate(timestamp) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.max(0, 1 - elapsed / duration);
    bar.style.width = `${progress * 100}%`;

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      bar.style.width = "0%";
      wrapper.style.display = "none";
      loadingActive = false;
      callback();
    }
  }

  requestAnimationFrame(animate);
}

document.getElementById("settings-close").addEventListener("click", () => {
  document.getElementById("settings-popup").classList.add("hidden");
});