const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

togglePassword?.addEventListener("click", () => {
const isPassword = passwordInput.type === "password";

passwordInput.type = isPassword ? "text" : "password";
togglePassword.textContent = isPassword ? "Ocultar" : "Mostrar";
});

loginForm?.addEventListener("submit", (event) => {
event.preventDefault();

loginMessage.hidden = false;
loginMessage.textContent =
"La autenticación todavía no está conectada. Esta es la interfaz de prueba.";
loginMessage.className = "login-message login-message-info";
});
