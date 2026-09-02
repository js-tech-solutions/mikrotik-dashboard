const loginForm =
  document.getElementById("loginForm");

const loginMessage =
  document.getElementById("loginMessage");

const usernameInput =
  document.getElementById("username");

const passwordInput =
  document.getElementById("password");

const togglePassword =
  document.getElementById("togglePassword");


togglePassword?.addEventListener(
  "click",
  () => {

    const isPassword =
      passwordInput.type === "password";

    passwordInput.type =
      isPassword
        ? "text"
        : "password";

    togglePassword.textContent =
      isPassword
        ? "Ocultar"
        : "Mostrar";

    togglePassword.setAttribute(
      "aria-label",
      isPassword
        ? "Ocultar contraseña"
        : "Mostrar contraseña"
    );
  }
);


function showMessage(
  message,
  type = "error"
) {

  loginMessage.hidden = false;
  loginMessage.textContent = message;

  loginMessage.className =
    `login-message login-message-${type}`;
}


function setLoading(
  loading
) {

  const button =
    loginForm.querySelector(
      ".login-button"
    );

  if (!button) return;

  button.disabled = loading;

  button.textContent =
    loading
      ? "Iniciando sesión..."
      : "Iniciar sesión";
}


loginForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const username =
      usernameInput.value.trim();

    const password =
      passwordInput.value;

    if (!username || !password) {

      showMessage(
        "Ingresa usuario y contraseña."
      );

      return;
    }

    setLoading(true);

    loginMessage.hidden = true;

    try {

      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
              username,
              password
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        showMessage(
          data.error ||
          "Usuario o contraseña incorrectos."
        );

        return;
      }

      window.location.href = "/";

    } catch (error) {

      console.error(
        "[LOGIN]",
        error
      );

      showMessage(
        "No se pudo conectar con el servidor."
      );

    } finally {

      setLoading(false);
    }
  }
);
