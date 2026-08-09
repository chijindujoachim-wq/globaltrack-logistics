// Toggle Password Visibility
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.querySelector("svg").style.stroke = type === "password" ? "#555" : "#000";
});

// Show message function
function showMessage(message, type) {
    const msgBox = document.getElementById("message");
    msgBox.innerText = message;
    msgBox.className = type;
    msgBox.style.display = "block";

    // Fade out before redirect
    setTimeout(() => {
        msgBox.classList.add("fade-out");
    }, 2000);
}

// Handle login
document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const users = JSON.parse(localStorage.getItem("registeredUsers")) || [];

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showMessage("❌ Incorrect email or password. Please try again.", "message-error");
        return;
    }

    // Store login info
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("loggedInUser", JSON.stringify(user));

    showMessage(`✅ Welcome back, ${user.fullname}! Redirecting to dashboard...`, "message-success");

    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 2000);
});

// Login Button Loader
const form = document.getElementById("loginForm");
const btn = document.getElementById("loginBtn");
const loader = document.querySelector(".btn-loader");

if(form){
form.addEventListener("submit", function() {
    loader.style.display = "block";
    btn.querySelector(".btn-text").innerText = "Authenticating...";
});
}