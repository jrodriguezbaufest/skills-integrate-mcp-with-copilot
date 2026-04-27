document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");

  // Auth elements
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const teacherGreeting = document.getElementById("teacher-greeting");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");
  const loginError = document.getElementById("login-error");

  // Session state
  let authToken = sessionStorage.getItem("authToken");
  let teacherName = sessionStorage.getItem("teacherName");

  // ── Auth UI helpers ────────────────────────────────────────────────────────

  function updateAuthUI() {
    if (authToken) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      teacherGreeting.textContent = `Welcome, ${teacherName}`;
      teacherGreeting.classList.remove("hidden");
      signupContainer.classList.remove("hidden");
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      teacherGreeting.classList.add("hidden");
      signupContainer.classList.add("hidden");
    }
    // Re-render to show/hide delete buttons
    fetchActivities();
  }

  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    loginError.classList.add("hidden");
    loginForm.reset();
  });

  cancelLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) loginModal.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      const result = await response.json();
      if (response.ok) {
        authToken = result.token;
        teacherName = result.username;
        sessionStorage.setItem("authToken", authToken);
        sessionStorage.setItem("teacherName", teacherName);
        loginModal.classList.add("hidden");
        updateAuthUI();
      } else {
        loginError.textContent = result.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch {
      loginError.textContent = "Could not connect. Please try again.";
      loginError.classList.remove("hidden");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    if (authToken) {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    authToken = null;
    teacherName = null;
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("teacherName");
    updateAuthUI();
  });

  // ── Activities ─────────────────────────────────────────────────────────────

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map((email) =>
                      authToken
                        ? `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                        : `<li><span class="participant-email">${email}</span></li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">${participantsHTML}</div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (authToken) {
        document.querySelectorAll(".delete-btn").forEach((btn) =>
          btn.addEventListener("click", handleUnregister)
        );
      }
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      const result = await response.json();
      showMessage(response.ok ? result.message : result.detail || "An error occurred", response.ok);
      if (response.ok) fetchActivities();
    } catch {
      showMessage("Failed to unregister. Please try again.", false);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      const result = await response.json();
      showMessage(response.ok ? result.message : result.detail || "An error occurred", response.ok);
      if (response.ok) {
        signupForm.reset();
        fetchActivities();
      }
    } catch {
      showMessage("Failed to sign up. Please try again.", false);
    }
  });

  function showMessage(text, success) {
    messageDiv.textContent = text;
    messageDiv.className = success ? "success" : "error";
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Initial load
  updateAuthUI();
});
