let gameActive = false;
let countdownActive = false;
let multiplier = 1.0;
let crashMultiplier = 0;
let playerData = [];
let gameHistory = [];
let interval;
let countdownInterval;

const multiplierDisplay = document.getElementById("multiplier-display");
const rocket = document.getElementById("rocket");
const smokeContainer = document.getElementById("smoke-container");
const gameStatus = document.getElementById("game-status");
const playerTable = document.getElementById("player-table");
const betInput = document.getElementById("bet-amount");
const autoCashoutInput = document.getElementById("auto-cashout");
const placeBetButton = document.getElementById("place-bet");
const cashoutButton = document.getElementById("cashout");
const historyBar = document.getElementById("history-bar");
const rocketSound = document.getElementById("rocket-sound");
const explosionSound = document.getElementById("explosion-sound");

// Generate smoke
function generateSmoke() {
  const smoke = document.createElement("div");
  smoke.classList.add("smoke");
  smokeContainer.appendChild(smoke);
  setTimeout(() => smoke.remove(), 2000); // Remove smoke puff after 2 seconds
}

// Calculate crash point
function calculateCrashMultiplier() {
  const roll = Math.random() * 100;
  if (roll <= 60) return (Math.random() * 4 + 1).toFixed(2); // 60% chance for 1x to 5x
  if (roll <= 70) return (Math.random() * 15 + 5).toFixed(2); // 10% chance for 5x to 20x
  if (roll <= 75) return (Math.random() * 80 + 20).toFixed(2); // 5% chance for 20x to 100x
  if (roll <= 77) return (Math.random() * 900 + 100).toFixed(2); // 2% chance for 100x to 1000x
  return 1.01; // Default fallback
}

// Update crash history
function updateCrashHistory(crashPoint) {
  if (gameHistory.length >= 10) {
    gameHistory.shift(); // Remove the oldest entry to maintain only 10 results
  }
  gameHistory.push(parseFloat(crashPoint));

  // Clear the history bar
  historyBar.innerHTML = "";

  // Create history items dynamically
  gameHistory.forEach(point => {
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");

    // Determine the color based on the crash point
    if (point < 2) {
      historyItem.classList.add("red");
    } else if (point < 10) {
      historyItem.classList.add("green");
    } else if (point < 20) {
      historyItem.classList.add("light-blue");
    } else {
      historyItem.classList.add("yellow");
    }

    historyItem.textContent = `${point.toFixed(2)}x`;
    historyBar.appendChild(historyItem);
  });
}

// Start game
function startGame() {
  gameActive = true;
  countdownActive = false; // Disable countdown
  multiplier = 1.0;
  crashMultiplier = calculateCrashMultiplier();
  gameStatus.textContent = "Game is active!";
  multiplierDisplay.textContent = "1.00x";
  rocket.style.bottom = "0px";
  rocket.style.transition = "bottom 0.1s linear";
  cashoutButton.disabled = false;
  placeBetButton.disabled = true; // Disable placing new bets when the game starts

  // Play rocket launch sound in a loop
  rocketSound.volume = 0.2; // Set volume to 20%
  rocketSound.loop = true; // Enable looping
  rocketSound.currentTime = 0; // Reset audio
  rocketSound.play();

  interval = setInterval(() => {
    if (multiplier >= crashMultiplier) {
      crashGame();
      return;
    }

    // Update multiplier and rocket position
    multiplier += multiplier < 10 ? 0.01 : 0.05; // Faster multiplier after 10x
    multiplierDisplay.textContent = `${multiplier.toFixed(2)}x`;

    // Keep the rocket within the game area, slowing movement after 10x
    if (multiplier < 10) {
      rocket.style.bottom = `${(multiplier - 1) * 20}px`;
    } else {
      rocket.style.bottom = `${200 + (multiplier - 10) * 10}px`; // Slower upward movement
    }

    generateSmoke();

    playerData.forEach(player => {
      if (player.status === "active" && multiplier >= player.autoCashout) {
        cashOut(player, "auto");
      }
    });
  }, 100);
}

// Crash game
function crashGame() {
  clearInterval(interval);
  gameActive = false;
  gameStatus.textContent = `Crashed at ${crashMultiplier}x`;
  smokeContainer.innerHTML = ""; // Clear all smoke

  // Stop rocket sound immediately
  rocketSound.pause();
  rocketSound.currentTime = 0; // Reset rocket sound

  // Play explosion sound
  explosionSound.volume = 0.3; // Set volume to 30%
  explosionSound.currentTime = 0; // Reset explosion audio
  explosionSound.play();

  // Stop explosion sound after 2 seconds
  setTimeout(() => {
    explosionSound.pause();
    explosionSound.currentTime = 0; // Reset explosion sound
  }, 2000);

  // Update crash history
  updateCrashHistory(crashMultiplier);

  // Mark all players as lost
  playerData.forEach(player => {
    if (player.status === "active") {
      player.status = "lost";
      player.profit = -player.betAmount;
    }
  });

  updatePlayerTable();

  // Clear player bets for the next game
  playerData = [];
  setTimeout(() => {
    startCountdown();
  }, 1000); // Delay before the countdown starts
}

// Start countdown for the next game
function startCountdown() {
  let countdown = 10;
  gameStatus.textContent = `Next game starts in ${countdown} seconds`;
  countdownActive = true;

  // Enable placing new bets during countdown
  placeBetButton.disabled = false;

  countdownInterval = setInterval(() => {
    countdown -= 1;
    gameStatus.textContent = `Next game starts in ${countdown} seconds`;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      placeBetButton.disabled = true; // Lock bets before starting the game
      resetGame(); // Reset game state and start the next game
    }
  }, 1000);
}

// Reset game
function resetGame() {
  updatePlayerTable(); // Clear player table for the new game
  multiplier = 1.0;
  crashMultiplier = 0;
  rocket.style.bottom = "0px";
  cashoutButton.disabled = true; // Disable cashout button
  gameActive = false;
  countdownActive = false;

  // Start the game automatically, even if no bets exist
  startGame();
}

// Place Bet
placeBetButton.addEventListener("click", () => {
  if (gameActive) {
    gameStatus.textContent = "❌ Bets are locked. Wait for the next game.";
    return;
  }

  const betAmount = parseFloat(betInput.value);
  const autoCashout = parseFloat(autoCashoutInput.value);

  if (isNaN(betAmount) || isNaN(autoCashout)) {
    gameStatus.textContent = "❌ Invalid input!";
    return;
  }

  playerData.push({
    betAmount,
    autoCashout,
    profit: 0,
    status: "active",
  });

  updatePlayerTable();
  gameStatus.textContent = `✅ Bet placed: $${betAmount} (Auto Cashout: ${autoCashout}x)`;

  if (!countdownActive && !gameActive) {
    // Start the countdown if this is the first bet
    startCountdown();
  }
});

// Cash Out
cashoutButton.addEventListener("click", () => {
  if (!gameActive) return;

  const player = playerData.find(p => p.status === "active");
  if (!player) return;

  cashOut(player, "manual");
});

function cashOut(player, type) {
  player.status = "cashed_out";
  player.profit = (player.betAmount * multiplier).toFixed(2);
  gameStatus.textContent = `✅ Cashed out at ${multiplier.toFixed(2)}x! Won $${player.profit}`;
  updatePlayerTable();
}

// Update Player Table
function updatePlayerTable() {
  playerTable.innerHTML = "";
  playerData.forEach(player => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>$${player.betAmount.toFixed(2)}</td>
      <td>${player.status === "active" ? "-" : `${multiplier.toFixed(2)}x`}</td>
      <td style="color: ${player.profit < 0 ? "red" : "limegreen"};">$${player.profit}</td>
    `;
    playerTable.appendChild(row);
  });
}
