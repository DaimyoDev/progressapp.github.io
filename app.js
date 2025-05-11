document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const projectsView = document.getElementById("projects-view");
  const newProjectNameInput = document.getElementById("new-project-name");
  const addProjectBtn = document.getElementById("add-project-btn");
  const projectsListDiv = document.getElementById("projects-list");

  const milestonesView = document.getElementById("milestones-view");
  const backToProjectsBtn = document.getElementById("back-to-projects-btn");
  const currentProjectTitle = document.getElementById("current-project-title");
  const projectOverallProgress = document.getElementById(
    "project-overall-progress"
  );
  const projectOverallProgressText = document.getElementById(
    "project-overall-progress-text"
  );
  const newMilestoneNameInput = document.getElementById("new-milestone-name");
  const addMilestoneBtn = document.getElementById("add-milestone-btn");
  const milestonesListDiv = document.getElementById("milestones-list");

  const tasksView = document.getElementById("tasks-view");
  const backToMilestonesBtn = document.getElementById("back-to-milestones-btn");
  const currentMilestoneTitle = document.getElementById(
    "current-milestone-title"
  );
  const milestoneSpecificProgress = document.getElementById(
    "milestone-specific-progress"
  );
  const milestoneSpecificProgressText = document.getElementById(
    "milestone-specific-progress-text"
  );
  const newTaskDescriptionInput = document.getElementById(
    "new-task-description" // This is your "objective" input
  );
  const addTaskBtn = document.getElementById("add-task-btn"); // This is the button to click
  const tasksListUl = document.getElementById("tasks-list");

  // Sound Effect Elements
  const soundAddItem = document.getElementById("sound-add-item");
  const soundCompleteTask = document.getElementById("sound-complete-task");
  const soundDeleteItem = document.getElementById("sound-delete-item");
  const soundOpenView = document.getElementById("sound-open-view");

  // Theme Selector Element
  const themeSelect = document.getElementById("theme-select");

  // --- App State ---
  let projects = [];
  let currentProjectId = null;
  let currentMilestoneId = null;
  const DATA_STORAGE_KEY = "productivityTrackerData_v2";
  const THEME_STORAGE_KEY = "productivityTrackerTheme";

  // --- Theme Management ---
  function applyTheme(themeName) {
    document.body.className = ""; // Clear existing theme classes
    document.body.classList.add(themeName);
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
    // Ensure the dropdown reflects the current theme
    if (themeSelect.value !== themeName) {
      themeSelect.value = themeName;
    }
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      applyTheme("theme-dark"); // Default theme
    }
  }

  themeSelect.addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });

  // --- Sound Player Function ---
  function playSound(soundElement) {
    if (soundElement) {
      soundElement.currentTime = 0;
      soundElement
        .play()
        .catch((error) => console.warn("Audio play failed:", error));
    }
  }

  // --- Data Persistence ---
  function saveData() {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(projects));
  }

  function loadData() {
    const data = localStorage.getItem(DATA_STORAGE_KEY);
    if (data) {
      projects = JSON.parse(data);
    } else {
      projects = [];
    }
  }

  // --- Utility Functions ---
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // --- Render Functions (with animation handling) ---
  function renderProjects() {
    projectsListDiv.innerHTML = ""; // Clear existing project items
    if (projects.length === 0) {
      projectsListDiv.innerHTML =
        '<p style="opacity:1; transform:none;">No quests yet. Embark on one!</p>';
      return;
    }
    projects.forEach((project) => {
      const projectDiv = document.createElement("div");
      projectDiv.textContent = project.name;
      projectDiv.dataset.id = project.id;
      projectDiv.addEventListener("click", () => selectProject(project.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete-btn");
      deleteBtn.textContent = "Abandon";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteItemWithAnimation(projectDiv, () => deleteProject(project.id));
      });
      projectDiv.appendChild(deleteBtn);
      projectsListDiv.appendChild(projectDiv);
    });
  }

  function renderMilestones() {
    const project = projects.find((p) => p.id === currentProjectId);
    if (!project) {
      milestonesListDiv.innerHTML =
        '<p style="opacity:1; transform:none;">Project not found.</p>';
      return;
    }

    currentProjectTitle.textContent = `Quest: ${project.name}`;
    milestonesListDiv.innerHTML = "";
    if (project.milestones.length === 0) {
      milestonesListDiv.innerHTML =
        '<p style="opacity:1; transform:none;">No stages in this quest. Define one!</p>';
    }
    project.milestones.forEach((milestone) => {
      const milestoneDiv = document.createElement("div");
      milestoneDiv.textContent = milestone.name;
      milestoneDiv.dataset.id = milestone.id;
      milestoneDiv.addEventListener("click", () =>
        selectMilestone(milestone.id)
      );

      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete-btn");
      deleteBtn.textContent = "Remove";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteItemWithAnimation(milestoneDiv, () =>
          deleteMilestone(milestone.id)
        );
      });
      milestoneDiv.appendChild(deleteBtn);
      milestonesListDiv.appendChild(milestoneDiv);
    });
    updateProjectProgress();
  }

  function renderTasks() {
    const project = projects.find((p) => p.id === currentProjectId);
    if (!project) {
      tasksListUl.innerHTML =
        '<li style="opacity:1; transform:none;">Project not found.</li>';
      return;
    }
    const milestone = project.milestones.find(
      (m) => m.id === currentMilestoneId
    );
    if (!milestone) {
      tasksListUl.innerHTML =
        '<li style="opacity:1; transform:none;">Milestone not found.</li>';
      return;
    }

    currentMilestoneTitle.textContent = `Stage: ${milestone.name}`;
    tasksListUl.innerHTML = "";
    if (milestone.tasks.length === 0) {
      tasksListUl.innerHTML =
        '<li style="opacity:1; transform:none;">No objectives here. Set some!</li>';
    }
    milestone.tasks.forEach((task) => {
      const taskLi = document.createElement("li");
      taskLi.classList.toggle("completed", task.completed);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.dataset.id = task.id;
      checkbox.addEventListener("change", () => toggleTask(task.id, taskLi));

      const label = document.createElement("label");
      label.textContent = task.description;

      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete-btn");
      deleteBtn.textContent = "Scrap";
      deleteBtn.addEventListener("click", () => {
        deleteItemWithAnimation(taskLi, () => deleteTask(task.id));
      });

      taskLi.appendChild(checkbox);
      taskLi.appendChild(label);
      taskLi.appendChild(deleteBtn);
      tasksListUl.appendChild(taskLi);
    });
    updateMilestoneProgress();
  }

  function deleteItemWithAnimation(element, deleteFunction) {
    playSound(soundDeleteItem);
    element.classList.add("item-exit");
    setTimeout(() => {
      deleteFunction();
    }, 400);
  }

  // --- Progress Calculation ---
  function updateMilestoneProgress() {
    const project = projects.find((p) => p.id === currentProjectId);
    if (!project) return;
    const milestone = project.milestones.find(
      (m) => m.id === currentMilestoneId
    );
    if (!milestone || milestone.tasks.length === 0) {
      milestoneSpecificProgress.value = 0;
      milestoneSpecificProgressText.textContent = "0%";
      if (milestone) updateProjectProgress();
      return;
    }
    const completedTasks = milestone.tasks.filter((t) => t.completed).length;
    const progress = (completedTasks / milestone.tasks.length) * 100;
    milestoneSpecificProgress.value = progress;
    milestoneSpecificProgressText.textContent = `${Math.round(progress)}%`;
    updateProjectProgress();
  }

  function updateProjectProgress() {
    const project = projects.find((p) => p.id === currentProjectId);
    if (!project || project.milestones.length === 0) {
      projectOverallProgress.value = 0;
      projectOverallProgressText.textContent = "0%";
      return;
    }
    let totalTasks = 0;
    let completedTasks = 0;
    project.milestones.forEach((milestone) => {
      totalTasks += milestone.tasks.length;
      completedTasks += milestone.tasks.filter((t) => t.completed).length;
    });

    if (totalTasks === 0) {
      projectOverallProgress.value = 0;
      projectOverallProgressText.textContent = "0%";
      return;
    }
    const progress = (completedTasks / totalTasks) * 100;
    projectOverallProgress.value = progress;
    projectOverallProgressText.textContent = `${Math.round(progress)}%`;
  }

  // --- View Navigation ---
  function showView(viewId) {
    playSound(soundOpenView);
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active-view");
    });
    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.add("active-view");
    }
  }

  function selectProject(projectId) {
    currentProjectId = projectId;
    currentMilestoneId = null;
    renderMilestones();
    showView("milestones-view");
  }

  function selectMilestone(milestoneId) {
    currentMilestoneId = milestoneId;
    renderTasks();
    showView("tasks-view");
  }

  // --- CRUD Operations ---
  // Add a new project
  addProjectBtn.addEventListener("click", () => {
    const name = newProjectNameInput.value.trim();
    if (name) {
      projects.push({ id: generateId(), name, milestones: [] });
      newProjectNameInput.value = "";
      playSound(soundAddItem);
      saveData();
      renderProjects();
    } else {
      alert("Quest name cannot be empty.");
    }
  });

  // Delete a project
  function deleteProject(projectId) {
    projects = projects.filter((p) => p.id !== projectId);
    saveData();
    if (currentProjectId === projectId) {
      currentProjectId = null;
      currentMilestoneId = null;
      showView("projects-view");
    }
    renderProjects();
  }

  // Add a new milestone to the current project
  addMilestoneBtn.addEventListener("click", () => {
    const name = newMilestoneNameInput.value.trim();
    const project = projects.find((p) => p.id === currentProjectId);
    if (name && project) {
      project.milestones.push({ id: generateId(), name, tasks: [] });
      newMilestoneNameInput.value = "";
      playSound(soundAddItem);
      saveData();
      renderMilestones();
    } else if (!name) {
      alert("Stage name cannot be empty.");
    } else if (!project) {
      alert("Error: Could not find the current project to add a milestone.");
    }
  });

  // Delete a milestone from the current project
  function deleteMilestone(milestoneId) {
    const project = projects.find((p) => p.id === currentProjectId);
    if (project) {
      project.milestones = project.milestones.filter(
        (m) => m.id !== milestoneId
      );
      saveData();
      if (currentMilestoneId === milestoneId) {
        currentMilestoneId = null;
      }
      renderMilestones();
    }
  }

  // Add a new task to the current milestone
  const addTaskFunction = () => {
    // Encapsulate the add task logic
    const description = newTaskDescriptionInput.value.trim();
    const project = projects.find((p) => p.id === currentProjectId);
    const milestone = project?.milestones.find(
      (m) => m.id === currentMilestoneId
    );
    if (description && milestone) {
      milestone.tasks.push({ id: generateId(), description, completed: false });
      newTaskDescriptionInput.value = "";
      playSound(soundAddItem);
      saveData();
      renderTasks();
      newTaskDescriptionInput.focus(); // Optional: keep focus on the input
    } else if (!description) {
      alert("Objective description cannot be empty.");
    } else if (!milestone) {
      alert("Error: Could not find the current milestone to add a task.");
    }
  };

  addTaskBtn.addEventListener("click", addTaskFunction);

  // Add event listener to the new task input for the "Enter" key
  newTaskDescriptionInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.keyCode === 13) {
      event.preventDefault(); // Prevent default Enter key behavior (e.g., form submission)
      addTaskFunction(); // Call the same function as the button click
      // Or you could programmatically click the button:
      // addTaskBtn.click();
    }
  });

  // Toggle a task's completion status
  function toggleTask(taskId, taskLiElement) {
    const project = projects.find((p) => p.id === currentProjectId);
    const milestone = project?.milestones.find(
      (m) => m.id === currentMilestoneId
    );
    const task = milestone?.tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      if (task.completed) {
        playSound(soundCompleteTask);
      }
      taskLiElement.classList.toggle("completed", task.completed);
      saveData();
      updateMilestoneProgress();
    }
  }

  // Delete a task from the current milestone
  function deleteTask(taskId) {
    const project = projects.find((p) => p.id === currentProjectId);
    const milestone = project?.milestones.find(
      (m) => m.id === currentMilestoneId
    );
    if (milestone) {
      milestone.tasks = milestone.tasks.filter((t) => t.id !== taskId);
      saveData();
      renderTasks();
    }
  }

  // --- Navigation Event Listeners ---
  backToProjectsBtn.addEventListener("click", () => {
    currentProjectId = null;
    currentMilestoneId = null;
    showView("projects-view");
    renderProjects();
  });

  backToMilestonesBtn.addEventListener("click", () => {
    currentMilestoneId = null;
    if (currentProjectId) {
      renderMilestones();
      showView("milestones-view");
    } else {
      showView("projects-view");
      renderProjects();
    }
  });

  // --- Initial Load ---
  loadTheme();
  loadData();
  renderProjects();
  const initialView = document.getElementById("projects-view");
  if (initialView) initialView.classList.add("active-view");
});
