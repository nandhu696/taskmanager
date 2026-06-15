const API_BASE_URL = "YOUR_RENDER_BACKEND_URL/api";

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");
const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");
const welcomeText = document.getElementById("welcomeText");
const logoutBtn = document.getElementById("logoutBtn");
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const refreshBtn = document.getElementById("refreshBtn");

let token = localStorage.getItem("token") || "";
let currentUser = JSON.parse(localStorage.getItem("user")) || null;

showLogin.addEventListener("click", () => {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  showLogin.classList.add("active");
  showRegister.classList.remove("active");
  authMessage.textContent = "";
});

showRegister.addEventListener("click", () => {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  showRegister.classList.add("active");
  showLogin.classList.remove("active");
  authMessage.textContent = "";
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById("registerName").value,
    email: document.getElementById("registerEmail").value,
    password: document.getElementById("registerPassword").value,
    role: document.getElementById("registerRole").value
  };

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    authMessage.textContent = result.message;

    if (res.ok) {
      registerForm.reset();
      showLogin.click();
    }
  } catch (error) {
    authMessage.textContent = "Registration failed.";
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  };

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      authMessage.textContent = result.message || "Login failed.";
      return;
    }

    token = result.token;
    currentUser = result.user;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));

    showDashboard();
    loadTasks();
    loginForm.reset();
  } catch (error) {
    authMessage.textContent = "Login failed.";
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  token = "";
  currentUser = null;
  dashboard.classList.add("hidden");
  authSection.classList.remove("hidden");
});

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    title: document.getElementById("taskTitle").value,
    description: document.getElementById("taskDescription").value,
    status: document.getElementById("taskStatus").value,
    priority: document.getElementById("taskPriority").value,
    due_date: document.getElementById("taskDueDate").value || null
  };

  try {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.message || "Failed to add task");
      return;
    }

    taskForm.reset();
    loadTasks();
  } catch (error) {
    alert("Error creating task");
  }
});

refreshBtn.addEventListener("click", loadTasks);

async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const tasks = await res.json();

    if (!Array.isArray(tasks)) {
      taskList.innerHTML = `<p>Unable to load tasks.</p>`;
      return;
    }

    if (tasks.length === 0) {
      taskList.innerHTML = `<p>No tasks found.</p>`;
      return;
    }

    taskList.innerHTML = tasks.map(task => `
      <div class="task-item ${task.status === "Completed" ? "completed" : ""}">
        <h4>${task.title}</h4>
        <p>${task.description || "No description"}</p>
        <div class="task-meta">
          Status: ${task.status} | Priority: ${task.priority} | Due: ${formatDate(task.due_date)}
        </div>
        <div class="task-actions">
          <button class="small-btn complete-btn" onclick="toggleStatus(${task.id}, '${task.title.replace(/'/g, "\\'")}', '${(task.description || "").replace(/'/g, "\\'")}', '${task.status}', '${task.priority}', '${task.due_date ? task.due_date.split("T")[0] : ""}')">
            Mark ${task.status === "Completed" ? "Pending" : "Completed"}
          </button>
          <button class="small-btn delete-btn" onclick="deleteTask(${task.id})">Delete</button>
        </div>
      </div>
    `).join("");
  } catch (error) {
    taskList.innerHTML = `<p>Error loading tasks.</p>`;
  }
}

async function toggleStatus(id, title, description, status, priority, dueDate) {
  const newStatus = status === "Completed" ? "Pending" : "Completed";

  try {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        description,
        status: newStatus,
        priority,
        due_date: dueDate || null
      })
    });

    if (res.ok) {
      loadTasks();
    } else {
      alert("Failed to update task");
    }
  } catch (error) {
    alert("Error updating task");
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.ok) {
      loadTasks();
    } else {
      alert("Failed to delete task");
    }
  } catch (error) {
    alert("Error deleting task");
  }
}

function formatDate(dateString) {
  if (!dateString) return "No due date";
  return new Date(dateString).toLocaleDateString();
}

function showDashboard() {
  authSection.classList.add("hidden");
  dashboard.classList.remove("hidden");
  welcomeText.textContent = `Welcome, ${currentUser?.name || "User"}`;
  authMessage.textContent = "";
}

if (token && currentUser) {
  showDashboard();
  loadTasks();
}