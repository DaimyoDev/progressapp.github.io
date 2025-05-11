document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements (Existing) ---
  const backToTrackerBtn = document.getElementById("back-to-tracker-btn");
  const gameSetupView = document.getElementById("game-setup-view");
  const gamePlayView = document.getElementById("game-play-view");
  const difficultySelect = document.getElementById("difficulty-select");
  const daysInput = document.getElementById("days-input");
  const hoursInput = document.getElementById("hours-input");
  const minutesInput = document.getElementById("minutes-input");
  const numBotsSelect = document.getElementById("num-bots-select");
  const raceProjectSelect = document.getElementById("race-project-select");
  const startGameBtn = document.getElementById("start-game-btn");
  const timerDisplay = document.getElementById("timer-display");
  const playerProgressElement = document.getElementById("player-progress");
  const playerProgressText = document.getElementById("player-progress-text");
  const aiRacersDynamicArea = document.getElementById("ai-racers-dynamic-area");
  const gameStatusDisplay = document.getElementById("game-status");
  const playAgainControls = document.getElementById("play-again-controls");
  const playAgainBtn = document.getElementById("play-again-btn");
  const playerProjectWorkArea = document.getElementById(
    "player-project-work-area"
  );
  const playerRaceProjectTitle = document.getElementById(
    "player-race-project-title"
  );
  const raceMilestonesView = document.getElementById("race-milestones-view");
  const raceMilestonesList = document.getElementById("race-milestones-list");
  const raceTasksView = document.getElementById("race-tasks-view");
  const raceCurrentMilestoneTitle = document.getElementById(
    "race-current-milestone-title"
  );
  const raceTasksList = document.getElementById("race-tasks-list");
  const backToRaceMilestonesBtn = document.getElementById(
    "back-to-race-milestones-btn"
  );

  const quitRaceBtn = document.getElementById("quit-race-btn");
  const activeRaceControls = document.getElementById("active-race-controls");

  // --- App Data & State ---
  const DATA_STORAGE_KEY = "productivityTrackerData_v2";
  const THEME_STORAGE_KEY = "productivityTrackerTheme";
  const GAME_STATE_STORAGE_KEY = "productivityRaceGameState_v1";

  let projectsData = [];
  let selectedRaceProjectId = null;
  let currentRaceProject = null;
  let currentRaceMilestoneId = null;

  let gameTimerInterval = null;
  let aiUpdateIntervals = [];
  let saveStateInterval = null;

  let timeLeft = 0;
  let originalTotalDuration = 0;
  let gameEndTimeTimestamp = 0;

  let playerProgress = 0;
  let numActiveAIs = 3;
  let aiProgressElements = [];
  let aiProgressTexts = [];
  let currentAiNames = [];
  let aiProgresses = []; // Holds the current percentage for each AI
  let dynamicAiPacingSettings = {};

  let gameActive = false;
  let selectedDifficulty = "medium";

  const baseDifficultySettings = {
    easy: { intervalTime: 2200, intervalRandomness: 600, pacingFactor: 1.35 },
    medium: { intervalTime: 1600, intervalRandomness: 400, pacingFactor: 1.05 },
    hard: { intervalTime: 1100, intervalRandomness: 300, pacingFactor: 0.8 },
  };
  const botNamePool = [
    "Byte Bandit",
    "Code Corsair",
    "Data Dynamo",
    "Glitch Goblin",
    "Logic Lord",
    "Pixel Prowler",
    "Query Queen",
    "Syntax Samurai",
    "Vector Viper",
    "Kernel Knight",
    "Algorithm Ace",
    "Boolean Baron",
    "Circuit Sage",
    "Debug Dragon",
    "Firewall Phantom",
    "Gigahertz Ghost",
    "Heuristic Hunter",
    "Input Imp",
    "Jargon Juggernaut",
    "Latency Lancer",
    "Recursion Ranger",
    "Stack Star",
    "Thread Titan",
  ];

  const soundAddItem = document.getElementById("sound-add-item");
  const soundCompleteTask = document.getElementById("sound-complete-task");

  // --- Core Functions (Data, Theme, Sound, UI updates - mostly same) ---
  function applyTheme(themeName) {
    document.body.className = "";
    document.body.classList.add(themeName);
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }
  function loadTheme() {
    const S = localStorage.getItem(THEME_STORAGE_KEY);
    S ? applyTheme(S) : applyTheme("theme-dark");
  }
  function playSound(S) {
    if (S) {
      S.currentTime = 0;
      S.play().catch((e) => console.warn("Audio err:", e));
    }
  }
  function loadProjectsData() {
    const d = localStorage.getItem(DATA_STORAGE_KEY);
    projectsData = d ? JSON.parse(d) : [];
  }
  function saveProjectsData() {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(projectsData));
  }
  function calculateProjectProgressPercentage(projectId) {
    const p = projectsData.find((proj) => proj.id === projectId);
    if (!p || p.milestones.length === 0) return 0;
    let tt = 0,
      ct = 0;
    p.milestones.forEach((m) => {
      tt += m.tasks.length;
      ct += m.tasks.filter((t) => t.completed).length;
    });
    return tt === 0 ? 0 : (ct / tt) * 100;
  }
  function updateProgressBarUI(el, txtEl, prog) {
    const p = Math.min(100, Math.max(0, prog));
    el.value = p;
    txtEl.textContent = `${Math.round(p)}%`;
  }
  function formatTime(s) {
    if (s < 0) s = 0;
    const d = Math.floor(s / 86400),
      h = Math.floor((s % 86400) / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = Math.floor(s % 60);
    let str = "";
    if (d > 0) str += `${d}d ${String(h).padStart(2, "0")}:`;
    else if (h > 0) str += `${String(h).padStart(2, "0")}:`;
    return (str += `${String(m).padStart(2, "0")}:${String(sec).padStart(
      2,
      "0"
    )}`);
  }
  function getSelectedTimeInSeconds() {
    const d = parseInt(daysInput.value) || 0,
      h = parseInt(hoursInput.value) || 0,
      m = parseInt(minutesInput.value) || 0;
    return d * 86400 + h * 3600 + m * 60;
  }

  function populateRaceProjectSelector() {
    raceProjectSelect.innerHTML = '<option value="">-- Select --</option>';
    if (projectsData.length === 0) {
      raceProjectSelect.innerHTML += "<option disabled>No projects!</option>";
      return;
    }
    projectsData.forEach((p) => {
      raceProjectSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
  }
  function displayRaceProjectDetails() {
    currentRaceProject = projectsData.find(
      (p) => p.id === selectedRaceProjectId
    );
    if (!currentRaceProject) {
      playerRaceProjectTitle.textContent = "Err:Project Missing";
      return;
    }
    playerRaceProjectTitle.textContent = `Racing: ${currentRaceProject.name}`;
    renderRaceMilestonesList();
    raceMilestonesView.style.display = "block";
    raceTasksView.style.display = "none";
    playerProjectWorkArea.style.display = "block";
  }
  function renderRaceMilestonesList() {
    raceMilestonesList.innerHTML = "";
    if (!currentRaceProject || currentRaceProject.milestones.length === 0) {
      raceMilestonesList.innerHTML = "<p>No milestones.</p>";
      return;
    }
    currentRaceProject.milestones.forEach((m) => {
      const d = document.createElement("div");
      d.textContent = m.name;
      d.dataset.id = m.id;
      d.addEventListener("click", () => {
        currentRaceMilestoneId = m.id;
        renderRaceTasksList();
        raceMilestonesView.style.display = "none";
        raceTasksView.style.display = "block";
      });
      raceMilestonesList.appendChild(d);
    });
  }
  function renderRaceTasksList() {
    raceTasksList.innerHTML = "";
    const mil = currentRaceProject?.milestones.find(
      (m) => m.id === currentRaceMilestoneId
    );
    if (!mil) {
      raceTasksList.innerHTML = "<li>Milestone missing.</li>";
      return;
    }
    raceCurrentMilestoneTitle.textContent = `Milestone: ${mil.name}`;
    if (mil.tasks.length === 0) {
      raceTasksList.innerHTML = "<li>No tasks.</li>";
      return;
    }
    mil.tasks.forEach((task) => {
      const li = document.createElement("li"),
        cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = task.completed;
      cb.dataset.id = task.id;
      const lbl = document.createElement("label");
      lbl.textContent = task.description;
      if (task.completed) lbl.classList.add("completed-task");
      cb.addEventListener("change", () =>
        handleRaceTaskToggle(task.id, mil.id, lbl)
      );
      li.append(cb, lbl);
      raceTasksList.appendChild(li);
    });
  }
  function handleRaceTaskToggle(taskId, milestoneId, lbl) {
    const proj = projectsData.find((p) => p.id === selectedRaceProjectId),
      mil = proj?.milestones.find((m) => m.id === milestoneId),
      task = mil?.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.completed = !task.completed;
    lbl.classList.toggle("completed-task", task.completed);
    if (task.completed) playSound(soundCompleteTask);
    saveProjectsData();
    playerProgress = calculateProjectProgressPercentage(selectedRaceProjectId);
    updateProgressBarUI(
      playerProgressElement,
      playerProgressText,
      playerProgress
    );
    if (playerProgress >= 100 && gameActive) endGame("playerWin");
  }
  backToRaceMilestonesBtn.addEventListener("click", () => {
    raceTasksView.style.display = "none";
    raceMilestonesView.style.display = "block";
    currentRaceMilestoneId = null;
  });
  function createAiPlayerUI(aiIdx, name) {
    const ca = document.createElement("div");
    ca.className = "competitor-area";
    const pbc = document.createElement("div");
    pbc.className = "progress-bar-container";
    const lbl = document.createElement("label");
    lbl.htmlFor = `ai-${aiIdx}-progress`;
    lbl.textContent = `${name}:`;
    const pEl = document.createElement("progress");
    pEl.id = `ai-${aiIdx}-progress`;
    pEl.value = 0;
    pEl.max = 100;
    const pTxt = document.createElement("span");
    pTxt.id = `ai-${aiIdx}-progress-text`;
    pTxt.textContent = "0%";
    pbc.append(lbl, pEl, pTxt);
    ca.appendChild(pbc);
    aiRacersDynamicArea.appendChild(ca);
    return {
      progressElement: pEl,
      progressText: pTxt,
      name: name,
      labelElement: lbl,
    };
  }

  // --- Game State Persistence ---
  function saveGameState() {
    if (!gameActive) {
      localStorage.removeItem(GAME_STATE_STORAGE_KEY);
      return;
    }
    const state = {
      gameActive: true,
      selectedRaceProjectId,
      selectedDifficulty,
      numActiveAIs,
      currentAiNames,
      gameEndTimeTimestamp,
      originalTotalDuration,
      aiProgresses: [...aiProgresses],
      timestampOfSave: Date.now(), // MODIFIED: Store current time
    };
    localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
    console.log(
      "Game state saved at:",
      new Date(state.timestampOfSave).toLocaleTimeString()
    );
  }

  function clearSavedGameState() {
    localStorage.removeItem(GAME_STATE_STORAGE_KEY);
    if (saveStateInterval) clearInterval(saveStateInterval);
    saveStateInterval = null;
    console.log("Saved game state cleared.");
  }

  function calculateAndSetDynamicAiPacing(totalGameDurationSeconds) {
    const baseSettings = baseDifficultySettings[selectedDifficulty];
    const targetAiCompletionSeconds = Math.max(
      10,
      totalGameDurationSeconds * baseSettings.pacingFactor
    );
    const baseAiUpdateIntervalMs = baseSettings.intervalTime;
    const numUpdatesToTarget = Math.max(
      1,
      targetAiCompletionSeconds / (baseAiUpdateIntervalMs / 1000)
    );
    const scaledBaseIncrement = 100 / numUpdatesToTarget;
    const scaledRandomBoostFactor = 0.4;
    dynamicAiPacingSettings = {
      baseIncrement: scaledBaseIncrement,
      randomBoostMagnitude: scaledBaseIncrement * scaledRandomBoostFactor,
      intervalTime: baseAiUpdateIntervalMs, // This is the *base* interval for one AI step
      intervalRandomness: baseSettings.intervalRandomness,
    };
  }

  // --- AI Offline Progress Simulation ---
  function simulateAiOfflineProgress(simulationDurationMs) {
    if (simulationDurationMs <= 0 || !dynamicAiPacingSettings.intervalTime) {
      // console.log("No simulation needed or pacing not set.");
      return;
    }

    console.log(
      `Simulating AI progress for ${(simulationDurationMs / 1000).toFixed(2)}s.`
    );
    for (let i = 0; i < numActiveAIs; i++) {
      if (aiProgresses[i] >= 100) continue; // AI already finished

      const baseIntervalMs = dynamicAiPacingSettings.intervalTime;
      const baseIncrement = dynamicAiPacingSettings.baseIncrement;
      const randomBoostMagnitude = dynamicAiPacingSettings.randomBoostMagnitude;

      if (baseIntervalMs <= 0) {
        console.warn(
          "AI baseIntervalMs is not positive, skipping simulation for AI",
          i
        );
        continue;
      }

      const numberOfUpdates = Math.floor(simulationDurationMs / baseIntervalMs);

      for (let k = 0; k < numberOfUpdates; k++) {
        if (aiProgresses[i] >= 100) break;

        const randP = (Math.random() * 2 - 1) * randomBoostMagnitude;
        const incr = Math.max(0.01, baseIncrement + randP);
        aiProgresses[i] = Math.min(100, aiProgresses[i] + incr);
      }

      if (aiProgresses[i] >= 100) {
        aiProgresses[i] = 100; // Ensure it's capped
        console.log(
          `AI ${
            currentAiNames[i] || "AI " + i
          } reached 100% during offline simulation.`
        );
      }
    }
    console.log("Offline simulation step complete. AI progresses:", [
      ...aiProgresses,
    ]);
  }

  // --- Game Lifecycle Functions ---
  function resetGameUI(isInitialCall = false) {
    gameActive = false;
    clearInterval(gameTimerInterval);
    aiUpdateIntervals.forEach(clearTimeout);
    aiUpdateIntervals = [];
    if (!isInitialCall || !localStorage.getItem(GAME_STATE_STORAGE_KEY)) {
      clearSavedGameState();
    }

    playerProgress = 0;
    updateProgressBarUI(playerProgressElement, playerProgressText, 0);
    aiRacersDynamicArea.innerHTML = "";
    aiProgressElements = [];
    aiProgressTexts = [];
    currentAiNames = [];
    aiProgresses = [];

    timerDisplay.textContent = formatTime(getSelectedTimeInSeconds());
    gameStatusDisplay.textContent = "Configure your race!";
    activeRaceControls.style.display = "none";
    playAgainControls.style.display = "none";

    [
      difficultySelect,
      daysInput,
      hoursInput,
      minutesInput,
      numBotsSelect,
      raceProjectSelect,
      startGameBtn,
    ].forEach((el) => (el.disabled = false));
    startGameBtn.textContent = "Start Race!";
    gameSetupView.style.display = "block";
    gamePlayView.style.display = "none";
    playerProjectWorkArea.style.display = "none";
    raceMilestonesView.style.display = "block";
    raceTasksView.style.display = "none";

    if (isInitialCall) {
      loadProjectsData();
      populateRaceProjectSelector();
    }
    selectedRaceProjectId = null;
    currentRaceProject = null;
    currentRaceMilestoneId = null;
    numActiveAIs = parseInt(numBotsSelect.value) || 3;
  }

  function setupUIForResumedGame(savedState) {
    difficultySelect.value = savedState.selectedDifficulty;
    numBotsSelect.value = savedState.numActiveAIs; // Use numActiveAIs from savedState for consistency in form fields

    const d = Math.floor(savedState.originalTotalDuration / 86400),
      h = Math.floor((savedState.originalTotalDuration % 86400) / 3600),
      m = Math.floor((savedState.originalTotalDuration % 3600) / 60);
    daysInput.value = d;
    hoursInput.value = h;
    minutesInput.value = m;

    [
      difficultySelect,
      daysInput,
      hoursInput,
      minutesInput,
      numBotsSelect,
      raceProjectSelect,
      startGameBtn,
    ].forEach((el) => (el.disabled = true));
    startGameBtn.textContent = "Racing...";
    gameSetupView.style.display = "none";
    gamePlayView.style.display = "block";
    playerProjectWorkArea.style.display = "block";

    aiRacersDynamicArea.innerHTML = "";
    aiProgressElements = [];
    aiProgressTexts = [];

    // Use global numActiveAIs and currentAiNames as they are the source of truth after state loading
    for (let i = 0; i < numActiveAIs; i++) {
      const name = currentAiNames[i] || `Resumed AI ${i + 1}`;
      const ui = createAiPlayerUI(i, name);
      aiProgressElements.push(ui.progressElement);
      aiProgressTexts.push(ui.progressText);
      // MODIFIED: Uses the global `aiProgresses` array, which might have been updated by simulation
      updateProgressBarUI(
        aiProgressElements[i],
        aiProgressTexts[i],
        aiProgresses[i]
      );
    }
  }

  function resumeGame(savedState) {
    // 1. Load state variables
    selectedRaceProjectId = savedState.selectedRaceProjectId;
    selectedDifficulty = savedState.selectedDifficulty;
    numActiveAIs = savedState.numActiveAIs;
    currentAiNames = [...savedState.currentAiNames];
    gameEndTimeTimestamp = savedState.gameEndTimeTimestamp;
    originalTotalDuration = savedState.originalTotalDuration;
    aiProgresses = [...savedState.aiProgresses]; // Load progress as it was saved
    const timestampOfSave = savedState.timestampOfSave;

    // 2. Calculate remaining time
    timeLeft = Math.round((gameEndTimeTimestamp - Date.now()) / 1000);

    // 3. Prepare AI Pacing (needed for simulation)
    calculateAndSetDynamicAiPacing(originalTotalDuration);

    // 4. Simulate AI progress during offline period if game is ongoing
    if (timestampOfSave && timeLeft > 0) {
      // Only simulate if game hasn't ended and there's a save timestamp
      const currentTime = Date.now();
      // Simulate from time of save up to current time, but not beyond gameEndTimeTimestamp
      const simulationCapTime = Math.min(currentTime, gameEndTimeTimestamp);
      const simulationDurationMs = Math.max(
        0,
        simulationCapTime - timestampOfSave
      );

      simulateAiOfflineProgress(simulationDurationMs);
    }
    // Global `aiProgresses` is now updated with simulated progress.

    // 5. Setup UI (will use updated aiProgresses)
    setupUIForResumedGame(savedState);
    raceProjectSelect.value = selectedRaceProjectId;

    gameStatusDisplay.textContent = "Race resumed!";
    activeRaceControls.style.display = "block";
    playAgainControls.style.display = "none";

    currentRaceProject = projectsData.find(
      (p) => p.id === selectedRaceProjectId
    );
    playerProgress = calculateProjectProgressPercentage(selectedRaceProjectId);
    updateProgressBarUI(
      playerProgressElement,
      playerProgressText,
      playerProgress
    );
    if (currentRaceProject) displayRaceProjectDetails();

    timerDisplay.textContent = formatTime(timeLeft);

    if (timeLeft <= 0) {
      // Game might have ended precisely during the offline calculation or is now due
      endGame("timeup");
      return;
    }

    // 6. Start game timer
    gameTimerInterval = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = formatTime(timeLeft);
      if (timeLeft <= 0) endGame("timeup");
    }, 1000);

    // 7. Start AI live updates
    aiUpdateIntervals = [];
    for (let i = 0; i < numActiveAIs; i++) {
      if (aiProgresses[i] < 100) {
        // Only schedule updates for AIs not yet finished
        const scheduleNextAiUpdate = (aiIdx) => {
          if (!gameActive || aiProgresses[aiIdx] >= 100) return;

          const fluct =
            Math.random() * dynamicAiPacingSettings.intervalRandomness * 2 -
            dynamicAiPacingSettings.intervalRandomness;
          const intvl = Math.max(
            200,
            dynamicAiPacingSettings.intervalTime + fluct
          );

          aiUpdateIntervals[aiIdx] = setTimeout(() => {
            if (!gameActive || aiProgresses[aiIdx] >= 100) return;
            const randP =
              (Math.random() * 2 - 1) *
              dynamicAiPacingSettings.randomBoostMagnitude;
            const incr = Math.max(
              0.01,
              dynamicAiPacingSettings.baseIncrement + randP
            );

            aiProgresses[aiIdx] = Math.min(100, aiProgresses[aiIdx] + incr);
            updateProgressBarUI(
              aiProgressElements[aiIdx],
              aiProgressTexts[aiIdx],
              aiProgresses[aiIdx]
            );

            if (aiProgresses[aiIdx] >= 100) endGame("aiWin", aiIdx);
            else scheduleNextAiUpdate(aiIdx);
          }, intvl);
        };
        setTimeout(() => scheduleNextAiUpdate(i), Math.random() * 500 + 100);
      }
    }

    if (saveStateInterval) clearInterval(saveStateInterval);
    saveStateInterval = setInterval(saveGameState, 15000); // Standard 15s interval
    gameActive = true;
  }

  function loadAndAttemptResume() {
    const savedStateJSON = localStorage.getItem(GAME_STATE_STORAGE_KEY);
    if (!savedStateJSON) {
      resetGameUI(true);
      return;
    }
    let savedState;
    try {
      savedState = JSON.parse(savedStateJSON);
    } catch (e) {
      console.error("Bad saved state:", e);
      clearSavedGameState();
      resetGameUI(true);
      return;
    }
    if (
      !savedState ||
      !savedState.gameActive ||
      !savedState.gameEndTimeTimestamp ||
      !savedState.timestampOfSave
    ) {
      // Added timestampOfSave check
      clearSavedGameState();
      resetGameUI(true);
      return;
    }
    const projectExists = projectsData.some(
      (p) => p.id === savedState.selectedRaceProjectId
    );
    if (!projectExists) {
      alert("Project for saved race missing. New setup.");
      clearSavedGameState();
      resetGameUI(true);
      return;
    }

    if (confirm("Unfinished race found. Resume?")) {
      // Load core state variables into global scope first
      selectedRaceProjectId = savedState.selectedRaceProjectId;
      selectedDifficulty = savedState.selectedDifficulty;
      numActiveAIs = savedState.numActiveAIs;
      currentAiNames = [...savedState.currentAiNames];
      originalTotalDuration = savedState.originalTotalDuration;
      gameEndTimeTimestamp = savedState.gameEndTimeTimestamp;
      aiProgresses = [...savedState.aiProgresses]; // Initial AI progresses from save

      // Calculate timeLeft based on current time
      timeLeft = Math.round((gameEndTimeTimestamp - Date.now()) / 1000);

      // Prepare AI Pacing for any potential simulation
      calculateAndSetDynamicAiPacing(originalTotalDuration);

      if (timeLeft <= 0) {
        // Game ended while away
        console.log("Game ended offline. Simulating final AI states.");
        // Simulate AI progress from timestampOfSave up to gameEndTimeTimestamp
        const simulationStartTime = savedState.timestampOfSave;
        const simulationEndTime = gameEndTimeTimestamp; // Game should have ended by now
        const simulationDurationMs = Math.max(
          0,
          simulationEndTime - simulationStartTime
        );

        simulateAiOfflineProgress(simulationDurationMs);
        // aiProgresses array is now updated to reflect the state at game end time

        setupUIForResumedGame(savedState); // This will use the globally updated aiProgresses

        currentRaceProject = projectsData.find(
          (p) => p.id === selectedRaceProjectId
        ); // Ensure currentRaceProject is set
        playerProgress = calculateProjectProgressPercentage(
          selectedRaceProjectId
        );
        updateProgressBarUI(
          playerProgressElement,
          playerProgressText,
          playerProgress
        );

        gameStatusDisplay.textContent = "Race ended offline. Results:";
        endGame("timeup"); // This will determine winner based on final player and AI progresses
      } else {
        // Game is still ongoing, timeLeft > 0
        resumeGame(savedState); // resumeGame will handle its own simulation from save to now
      }
    } else {
      clearSavedGameState();
      resetGameUI(true);
    }
  }

  function startGame() {
    if (gameActive) return;
    selectedRaceProjectId = raceProjectSelect.value;
    if (!selectedRaceProjectId) {
      alert("Please select a project for the race!");
      return;
    }
    currentRaceProject = projectsData.find(
      (p) => p.id === selectedRaceProjectId
    );
    if (!currentRaceProject) {
      alert("Error: Selected project not found.");
      return;
    }

    selectedDifficulty = difficultySelect.value;
    originalTotalDuration = getSelectedTimeInSeconds();
    timeLeft = originalTotalDuration;
    if (timeLeft <= 10) {
      // Min duration 10s
      alert("Race duration must be at least 10 seconds.");
      return;
    }
    if (timeLeft > 86400 * 30) {
      // Max 30 days
      alert("Max duration is 30 days.");
      return;
    }
    numActiveAIs = parseInt(numBotsSelect.value);
    gameEndTimeTimestamp = Date.now() + originalTotalDuration * 1000;

    gameActive = true;
    gameSetupView.style.display = "none";
    gamePlayView.style.display = "block";
    playerProjectWorkArea.style.display = "block";
    activeRaceControls.style.display = "block";
    playAgainControls.style.display = "none";
    gameStatusDisplay.textContent = "Race in progress...";
    startGameBtn.textContent = "Racing...";

    playerProgress = calculateProjectProgressPercentage(selectedRaceProjectId);
    updateProgressBarUI(
      playerProgressElement,
      playerProgressText,
      playerProgress
    );
    aiRacersDynamicArea.innerHTML = "";
    aiProgressElements = [];
    aiProgressTexts = [];
    currentAiNames = [];
    aiProgresses = []; // Reset for new game
    aiUpdateIntervals = [];

    calculateAndSetDynamicAiPacing(originalTotalDuration);

    const usedNames = new Set();
    for (let i = 0; i < numActiveAIs; i++) {
      let name;
      const avail = botNamePool.filter((n) => !usedNames.has(n));
      if (avail.length > 0) {
        name = avail[Math.floor(Math.random() * avail.length)];
      } else {
        name = `${botNamePool[i % botNamePool.length]} #${
          Math.floor(i / botNamePool.length) + 1
        }`;
      }
      usedNames.add(name);
      currentAiNames.push(name);
      const ui = createAiPlayerUI(i, name);
      aiProgressElements.push(ui.progressElement);
      aiProgressTexts.push(ui.progressText);
      aiProgresses.push(0); // Initialize progress for new AI
      updateProgressBarUI(aiProgressElements[i], aiProgressTexts[i], 0);
    }

    // Initial save after all params are set for a new game
    saveGameState();

    timerDisplay.textContent = formatTime(timeLeft);
    [
      difficultySelect,
      daysInput,
      hoursInput,
      minutesInput,
      numBotsSelect,
      raceProjectSelect,
      startGameBtn,
    ].forEach((el) => (el.disabled = true));
    displayRaceProjectDetails();

    gameTimerInterval = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = formatTime(timeLeft);
      if (timeLeft <= 0) endGame("timeup");
    }, 1000);

    if (saveStateInterval) clearInterval(saveStateInterval);
    saveStateInterval = setInterval(saveGameState, 15000); // Standard 15s interval

    for (let i = 0; i < numActiveAIs; i++) {
      const scheduleNextAiUpdate = (aiIdx) => {
        if (!gameActive || aiProgresses[aiIdx] >= 100) return; // Check progress before scheduling
        const fluct =
          Math.random() * dynamicAiPacingSettings.intervalRandomness * 2 -
          dynamicAiPacingSettings.intervalRandomness;
        const intvl = Math.max(
          200,
          dynamicAiPacingSettings.intervalTime + fluct
        );
        aiUpdateIntervals[aiIdx] = setTimeout(() => {
          if (!gameActive || aiProgresses[aiIdx] >= 100) return; // Re-check before updating
          const randP =
            (Math.random() * 2 - 1) *
            dynamicAiPacingSettings.randomBoostMagnitude;
          const incr = Math.max(
            0.01,
            dynamicAiPacingSettings.baseIncrement + randP
          );
          aiProgresses[aiIdx] = Math.min(100, aiProgresses[aiIdx] + incr);
          updateProgressBarUI(
            aiProgressElements[aiIdx],
            aiProgressTexts[aiIdx],
            aiProgresses[aiIdx]
          );
          if (aiProgresses[aiIdx] >= 100) endGame("aiWin", aiIdx);
          else scheduleNextAiUpdate(aiIdx);
        }, intvl);
      };
      // Stagger initial AI updates slightly
      setTimeout(
        () => scheduleNextAiUpdate(i),
        (Math.random() * dynamicAiPacingSettings.intervalTime) / 2 + 200
      );
    }
  }

  function endGame(reason, winnerAiIndex = -1) {
    const wasActive = gameActive;
    gameActive = false;

    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
    aiUpdateIntervals.forEach(clearTimeout);
    aiUpdateIntervals = [];

    if (wasActive || reason === "quit") {
      clearSavedGameState();
    }
    // If endGame is called from loadAndAttemptResume for an already-ended game,
    // clearSavedGameState is appropriate because we've processed it.

    activeRaceControls.style.display = "none";
    playAgainControls.style.display = "block";

    if (selectedRaceProjectId) {
      // Ensure player progress is up-to-date for final display
      playerProgress = calculateProjectProgressPercentage(
        selectedRaceProjectId
      );
      updateProgressBarUI(
        playerProgressElement,
        playerProgressText,
        playerProgress
      );
    }
    // AI progresses should be their final values (potentially after simulation)

    let message = "",
      playerWon = false;
    const winnerName =
      winnerAiIndex !== -1 && currentAiNames[winnerAiIndex]
        ? currentAiNames[winnerAiIndex]
        : "An AI";

    if (reason === "playerWin") {
      message = `Project Complete! You won by finishing: ${
        currentRaceProject?.name || "your project"
      }!`;
      playerWon = true;
    } else if (reason === "aiWin") {
      // Ensure this AI actually has 100% if this is the reason
      if (aiProgresses[winnerAiIndex] < 100) aiProgresses[winnerAiIndex] = 100; // Force it if somehow not
      updateProgressBarUI(
        aiProgressElements[winnerAiIndex],
        aiProgressTexts[winnerAiIndex],
        aiProgresses[winnerAiIndex]
      );

      message = `${winnerName} won. Your project: ${Math.round(
        playerProgress
      )}%.`;
    } else if (reason === "timeup") {
      let topAiProg = 0;
      let leadingAiName = "An AI"; // Default
      let leadingAiIdx = -1;

      aiProgresses.forEach((p, idx) => {
        if (p > topAiProg) {
          topAiProg = p;
          leadingAiIdx = idx;
        }
      });
      if (leadingAiIdx !== -1 && currentAiNames[leadingAiIdx]) {
        leadingAiName = currentAiNames[leadingAiIdx];
      }

      if (playerProgress > topAiProg) {
        message = `Time's up! Project (${Math.round(
          playerProgress
        )}%) beat AIs! YOU WIN!`;
        playerWon = true;
      } else if (playerProgress === topAiProg && playerProgress > 0) {
        message = `Time's up! Tie! Project & ${leadingAiName} @ ${Math.round(
          playerProgress
        )}%.`;
      } else if (topAiProg > playerProgress) {
        message = `Time's up! ${leadingAiName} ahead (${Math.round(
          topAiProg
        )}%). Yours: ${Math.round(playerProgress)}%.`;
      } else {
        // playerProgress === 0 and topAiProg === 0
        message = `Time's up! No progress made. Your project: ${Math.round(
          playerProgress
        )}%.`;
      }
    } else if (reason === "quit") {
      message = "Race abandoned.";
    }
    gameStatusDisplay.textContent = message;
    if (playerWon) playSound(soundCompleteTask);
  }

  // --- Event Listeners & Initialisation ---
  backToTrackerBtn.addEventListener("click", () => {
    if (gameActive) {
      saveGameState();
    }
    window.location.href = "index.html";
  });

  quitRaceBtn.addEventListener("click", () => {
    if (gameActive) {
      if (
        confirm(
          "Are you sure you want to abandon this race? This cannot be undone."
        )
      ) {
        endGame("quit");
      }
    }
  });

  startGameBtn.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", () => resetGameUI(false));

  window.addEventListener("beforeunload", (event) => {
    if (gameActive) {
      saveGameState();
    }
  });

  loadTheme();
  loadProjectsData(); // Load project definitions first
  populateRaceProjectSelector(); // Then populate selector
  loadAndAttemptResume(); // Then attempt to resume, which relies on projectsData
});
