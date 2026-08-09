// Toggle Password Visibility for Password field
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.querySelector("svg").style.stroke = type === "password" ? "#555" : "#000";
});

// Toggle Password Visibility for Confirm Password field
const confirmPasswordInput = document.getElementById("confirmPassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

toggleConfirmPassword.addEventListener("click", () => {
    const type = confirmPasswordInput.type === "password" ? "text" : "password";
    confirmPasswordInput.type = type;
    toggleConfirmPassword.querySelector("svg").style.stroke = type === "password" ? "#555" : "#000";
});

// Message box function
function showMessage(message, type) {
    const msgBox = document.getElementById("message");
    msgBox.innerText = message;
    msgBox.className = type;
    msgBox.style.display = "block";

    // Fade out after 2 seconds, then redirect happens by your existing logic
    setTimeout(() => {
        msgBox.classList.add("fade-out");
    }, 2000);
}

document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Password mismatch
    if (password !== confirmPassword) {
        showMessage("❌ Passwords do not match!", "message-error");
        return;
    }

    let users = JSON.parse(localStorage.getItem("registeredUsers")) || [];

    // Check duplicate email
    if (users.some(u => u.email === email)) {
        showMessage("⚠ This email is already registered. Redirecting to login...", "message-error");
        setTimeout(() => {
            window.location.href = "admin-login.html";
        }, 2000);
        return;
    }

    // Register new user
    const newUser = { fullname, email, password };
    users.push(newUser);
    localStorage.setItem("registeredUsers", JSON.stringify(users));

    showMessage("✅ Registration successful! Redirecting to login...", "message-success");

    setTimeout(() => {
        window.location.href = "login.html";
    }, 2000);
});