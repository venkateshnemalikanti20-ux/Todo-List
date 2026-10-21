
"use strict";

const STORAGE_KEY = "todoList";

// Existing To-Do List elements
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const message = document.getElementById("message");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyDescription = document.getElementById("emptyDescription");
const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const completedCount = document.getElementById("completedCount");
const taskBadge = document.getElementById("taskBadge");
const footerText = document.getElementById("footerText");
const clearCompletedButton = document.getElementById("clearCompleted");
const todayElement = document.getElementById("today");
const filterButtons = document.querySelectorAll(".filter");

// AI elements
const aiForm = document.getElementById("aiForm");
const aiGoalInput = document.getElementById("aiGoalInput");
const aiGenerateButton = document.getElementById("aiGenerateButton");
const aiMessage = document.getElementById("aiMessage");
const aiResults = document.getElementById("aiResults");
const aiSubtaskList = document.getElementById("aiSubtaskList");
const aiSelectAll = document.getElementById("aiSelectAll");
const aiAddSelected = document.getElementById("aiAddSelected");

// Local backend address for development.
// We will update this after deploying the backend.
const AI_API_URL = "https://taskflow-ai-backend-2d08.onrender.com/api/breakdown";

let currentFilter = "all";
let tasks = loadTasks();
let generatedSubtasks = [];

todayElement.textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric"
}).format(new Date());

// Load saved tasks safely.
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(task =>
        task &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean"
      )
      .map((task, index) => ({
        id: String(task.id ?? `legacy-${index}`),
        text: task.text,
        completed: task.completed,
        createdAt: task.createdAt || new Date().toISOString()
      }));
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

// Save tasks in the browser.
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showMessage("Could not save changes. Check browser storage.");
    return false;
  }
}

function showMessage(text = "") {
  message.textContent = text;
}

function showAIMessage(text = "", type = "") {
  aiMessage.textContent = text;
  aiMessage.className = "ai-message";

  if (type) {
    aiMessage.classList.add(type);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

// Add a task using the same validation and storage logic
// for both manual tasks and AI-generated tasks.
function addTask(text, options = {}) {
  const { showSuccess = true } = options;
  const cleanText = text.trim();

  if (!cleanText) {
    showMessage("Please enter a valid task.");
    return false;
  }

  const duplicate = tasks.some(task =>
    task.text.toLowerCase() === cleanText.toLowerCase()
  );

  if (duplicate) {
    return false;
  }

  const newTask = {
    id: createTaskId(),
    text: cleanText,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);

  if (!saveTasks()) {
    tasks.shift();
    return false;
  }

  searchInput.value = "";
  currentFilter = "all";
  updateFilterButtons();
  renderTasks();

  if (showSuccess) {
    showMessage("Task added successfully!");
  }

  return true;
}

// Add a new task through the original form.
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const text = taskInput.value.trim();

  if (!text) {
    showMessage("Please enter a valid task.");
    taskInput.focus();
    return;
  }

  const duplicate = tasks.some(task =>
    task.text.toLowerCase() === text.toLowerCase()
  );

  if (duplicate) {
    showMessage("This task already exists.");
    taskInput.focus();
    return;
  }

  if (addTask(text)) {
    taskInput.value = "";
    taskInput.focus();
  }
});

function createTaskId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Display tasks safely using DOM methods.
function renderTasks() {
  const query = searchInput.value.trim().toLowerCase();

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(query);

    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    return matchesSearch && matchesFilter;
  });

  taskList.replaceChildren();

  filteredTasks.forEach(task => {
    taskList.appendChild(createTaskElement(task));
  });

  updateStatistics();

  emptyState.hidden = filteredTasks.length > 0;
  taskList.hidden = filteredTasks.length === 0;

  if (tasks.length === 0) {
    emptyTitle.textContent = "A fresh start!";
    emptyDescription.textContent =
      "Your task list is empty. Add your first task above.";
  } else if (filteredTasks.length === 0 && query) {
    emptyTitle.textContent = "No matching tasks";
    emptyDescription.textContent =
      "Try a different search term.";
  } else if (filteredTasks.length === 0) {
    emptyTitle.textContent = "Nothing to show";
    emptyDescription.textContent =
      currentFilter === "active"
        ? "All your tasks are completed. Great job!"
        : "You haven't completed any tasks yet.";
  }
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-row";
  item.dataset.id = task.id;

  if (task.completed) {
    item.classList.add("is-completed");
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Complete ${task.text}`);
  checkbox.dataset.action = "toggle";

  const content = document.createElement("div");
  content.className = "task-content";

  const taskText = document.createElement("div");
  taskText.className = "task-text";
  taskText.textContent = task.text;

  const taskMeta = document.createElement("div");
  taskMeta.className = "task-meta";
  taskMeta.textContent = `Added ${formatDate(task.createdAt)}`;

  content.append(taskText, taskMeta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button";
  editButton.textContent = "✎";
  editButton.title = "Edit task";
  editButton.setAttribute("aria-label", `Edit ${task.text}`);
  editButton.dataset.action = "edit";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button delete";
  deleteButton.textContent = "×";
  deleteButton.title = "Delete task";
  deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
  deleteButton.dataset.action = "delete";

  actions.append(editButton, deleteButton);
  item.append(checkbox, content, actions);

  return item;
}

// Handle task completion, editing and deletion.
taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = button.closest(".task-row");
  if (!item) return;

  const task = tasks.find(task => task.id === item.dataset.id);
  if (!task) return;

  const action = button.dataset.action;

  if (action === "edit") {
    editTask(task);
  }

  if (action === "delete") {
    deleteTask(task);
  }
});

taskList.addEventListener("change", function (event) {
  if (!event.target.matches('input[data-action="toggle"]')) return;

  const item = event.target.closest(".task-row");
  if (!item) return;

  const task = tasks.find(task => task.id === item.dataset.id);
  if (!task) return;

  const previousValue = task.completed;
  task.completed = event.target.checked;

  if (!saveTasks()) {
    task.completed = previousValue;
  } else {
    showMessage(
      task.completed ? "Task completed!" : "Task marked as active."
    );
  }

  renderTasks();
});

function editTask(task) {
  const updatedText = prompt("Edit your task:", task.text);

  if (updatedText === null) return;

  const text = updatedText.trim();

  if (!text) {
    showMessage("Task cannot be empty.");
    return;
  }

  const duplicate = tasks.some(other =>
    other.id !== task.id &&
    other.text.toLowerCase() === text.toLowerCase()
  );

  if (duplicate) {
    showMessage("Another task already has this name.");
    return;
  }

  const previousText = task.text;
  task.text = text;

  if (!saveTasks()) {
    task.text = previousText;
    return;
  }

  showMessage("Task updated successfully!");
  renderTasks();
}

function deleteTask(task) {
  const confirmed = confirm(`Delete this task?\n\n${task.text}`);
  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = tasks.filter(item => item.id !== task.id);

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  showMessage("Task deleted successfully!");
  renderTasks();
}

// Filter buttons.
filterButtons.forEach(button => {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;
    updateFilterButtons();
    renderTasks();
  });
});

function updateFilterButtons() {
  filterButtons.forEach(button => {
    const selected = button.dataset.filter === currentFilter;

    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

// Live search.
searchInput.addEventListener("input", function () {
  renderTasks();
});

// Remove all completed tasks.
clearCompletedButton.addEventListener("click", function () {
  const completedTasks = tasks.filter(task => task.completed);

  if (completedTasks.length === 0) {
    showMessage("There are no completed tasks to clear.");
    return;
  }

  const confirmed = confirm(
    `Clear all ${completedTasks.length} completed task(s)?`
  );

  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = tasks.filter(task => !task.completed);

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  showMessage("Completed tasks cleared.");
  renderTasks();
});

// ============================
// AI TASK BREAKDOWN
// ============================

// Ask the backend to break a goal into smaller tasks.
aiForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const goal = aiGoalInput.value.trim();

  if (!goal) {
    showAIMessage("Please enter a goal first.", "error");
    aiGoalInput.focus();
    return;
  }

  aiGenerateButton.disabled = true;
  aiGenerateButton.textContent = "Generating...";
  aiResults.hidden = true;
  aiSubtaskList.replaceChildren();
  generatedSubtasks = [];
  showAIMessage("AI is creating your suggested tasks. Please wait.");

  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ task: goal })
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(
        data.error || `The server returned error ${response.status}.`
      );
    }

    if (
      !data ||
      !Array.isArray(data.subtasks) ||
      data.subtasks.length === 0 ||
      !data.subtasks.every(
        item => typeof item === "string" && item.trim()
      )
    ) {
      throw new Error("AI did not return a valid task list. Please try again.");
    }

    generatedSubtasks = [
      ...new Set(data.subtasks.map(item => item.trim()))
    ];

    if (generatedSubtasks.length === 0) {
      throw new Error("No usable tasks were generated. Please try again.");
    }

    renderAISubtasks();
    aiResults.hidden = false;
    showAIMessage(
      `Successfully generated ${generatedSubtasks.length} suggested tasks.`,
      "success"
    );
  } catch (error) {
    console.error("AI task breakdown failed:", error);

    if (error instanceof TypeError) {
      showAIMessage(
        "Could not connect to the AI backend. Make sure your server is running on port 3003.",
        "error"
      );
    } else {
      showAIMessage(
        error.message || "Something went wrong. Please try again.",
        "error"
      );
    }
  } finally {
    aiGenerateButton.disabled = false;
    aiGenerateButton.replaceChildren();

    const sparkle = document.createElement("span");
    sparkle.setAttribute("aria-hidden", "true");
    sparkle.textContent = "✦";
    aiGenerateButton.append(sparkle, document.createTextNode(" Break down with AI"));
  }
});

// Display AI suggestions with checkboxes.
function renderAISubtasks() {
  aiSubtaskList.replaceChildren();

  generatedSubtasks.forEach((subtask, index) => {
    const item = document.createElement("li");
    item.className = "ai-subtask-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `ai-subtask-${index}`;
    checkbox.checked = true;
    checkbox.dataset.subtaskIndex = String(index);

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = subtask;

    item.append(checkbox, label);
    aiSubtaskList.appendChild(item);
  });

  updateAISelectionButton();
}

// Select or deselect all suggested tasks.
aiSelectAll.addEventListener("click", function () {
  const checkboxes = aiSubtaskList.querySelectorAll(
    'input[type="checkbox"]'
  );

  const shouldSelectAll = Array.from(checkboxes).some(
    checkbox => !checkbox.checked
  );

  checkboxes.forEach(checkbox => {
    checkbox.checked = shouldSelectAll;
  });

  updateAISelectionButton();
});

aiSubtaskList.addEventListener("change", function (event) {
  if (event.target.matches('input[type="checkbox"]')) {
    updateAISelectionButton();
  }
});

function updateAISelectionButton() {
  const checkboxes = Array.from(
    aiSubtaskList.querySelectorAll('input[type="checkbox"]')
  );

  const allSelected =
    checkboxes.length > 0 &&
    checkboxes.every(checkbox => checkbox.checked);

  aiSelectAll.textContent = allSelected ? "Deselect all" : "Select all";
}

// Add the selected AI suggestions to the existing To-Do List.
aiAddSelected.addEventListener("click", function () {
  const selectedCheckboxes = Array.from(
    aiSubtaskList.querySelectorAll('input[type="checkbox"]:checked')
  );

  if (selectedCheckboxes.length === 0) {
    showAIMessage("Select at least one task to add.", "error");
    return;
  }

  let addedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  selectedCheckboxes.forEach(checkbox => {
    const index = Number(checkbox.dataset.subtaskIndex);
    const subtask = generatedSubtasks[index];

    if (!subtask) return;

    const exists = tasks.some(task =>
      task.text.toLowerCase() === subtask.toLowerCase()
    );

    if (exists) {
      duplicateCount++;
      return;
    }

    if (addTask(subtask, { showSuccess: false })) {
      addedCount++;
    } else {
      failedCount++;
    }
  });

  if (addedCount > 0) {
    showMessage(
      `Added ${addedCount} AI-generated task${addedCount === 1 ? "" : "s"} to your list.`
    );
  }

  if (failedCount > 0) {
    showAIMessage(
      `${addedCount} task(s) added. Some tasks could not be saved; check browser storage.`,
      "error"
    );
  } else if (addedCount === 0 && duplicateCount > 0) {
    showAIMessage(
      "These suggested tasks already exist in your list.",
      "error"
    );
  } else {
    const duplicateNote = duplicateCount > 0
      ? ` ${duplicateCount} duplicate task(s) skipped.`
      : "";

    showAIMessage(
      `Added ${addedCount} task${addedCount === 1 ? "" : "s"}.${duplicateNote}`,
      "success"
    );
  }

  if (addedCount > 0) {
    aiResults.hidden = true;
    aiGoalInput.value = "";
  }
});

// Refresh the statistics and footer.
function updateStatistics() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const active = total - completed;

  totalCount.textContent = total;
  activeCount.textContent = active;
  completedCount.textContent = completed;
  taskBadge.textContent = `${total} ${total === 1 ? "task" : "tasks"}`;

  footerText.textContent =
    total === 0
      ? "You're ready to get started!"
      : active === 0
        ? "Amazing! You've completed everything."
        : `${active} task${active === 1 ? "" : "s"} left to complete`;

  clearCompletedButton.disabled = completed === 0;
}

// Clear old validation messages while typing.
taskInput.addEventListener("input", function () {
  showMessage("");
});

aiGoalInput.addEventListener("input", function () {
  if (aiMessage.classList.contains("error")) {
    showAIMessage("");
  }
});

// Initial page render.
updateFilterButtons();
renderTasks();
