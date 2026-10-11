
"use strict";

const STORAGE_KEY = "todoList";

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

let currentFilter = "all";
let tasks = loadTasks();

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

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

// Add a new task.
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

  const newTask = {
    id: createTaskId(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);

  if (!saveTasks()) {
    tasks.shift();
    return;
  }

  taskInput.value = "";
  searchInput.value = "";
  currentFilter = "all";
  updateFilterButtons();
  showMessage("Task added successfully!");
  renderTasks();
  taskInput.focus();
});

function createTaskId() {
  if (typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function") {
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

  // Cancel was clicked.
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

// Initial page render.
updateFilterButtons();
renderTasks();
