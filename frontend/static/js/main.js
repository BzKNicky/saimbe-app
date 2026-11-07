/* =========================================================
   SAIMBE | Lógica Interactiva Global (Menú Móvil, Contraseñas y Validación)
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    // ---------------------------------------------------------
    // 1. Menú Desplegable Móvil (Hamburguesa)
    // ---------------------------------------------------------
    const menuToggle = document.getElementById("menu-toggle");
    const navMenu = document.getElementById("nav-menu");
    const navLinks = document.querySelectorAll(".nav-link");

    if (menuToggle && navMenu) {
        // Abrir / Cerrar menú al hacer clic en el botón hamburguesa
        menuToggle.addEventListener("click", function () {
            navMenu.classList.toggle("active");
            menuToggle.classList.toggle("open");

            if (navMenu.classList.contains("active")) {
                menuToggle.textContent = "✕"; // Cambia icono a X
                menuToggle.setAttribute("aria-label", "Cerrar menú");
            } else {
                menuToggle.textContent = "☰"; // Cambia icono a hamburguesa
                menuToggle.setAttribute("aria-label", "Abrir menú");
            }
        });

        // Cerrar el menú automáticamente al hacer clic en cualquier enlace
        navLinks.forEach(function (link) {
            link.addEventListener("click", function () {
                if (navMenu.classList.contains("active")) {
                    navMenu.classList.remove("active");
                    menuToggle.classList.remove("open");
                    menuToggle.textContent = "☰";
                    menuToggle.setAttribute("aria-label", "Abrir menú");
                }
            });
        });
    }

    // ---------------------------------------------------------
    // 2. Mostrar / Ocultar Contraseña con Ícono de Ojo (Soporte Universal)
    // ---------------------------------------------------------
    const eyeOpenSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeClosedSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    // Busca todos los botones de visibilidad en cualquier interfaz (Login o Registro)
    const passwordButtons = document.querySelectorAll(".password-toggle, #toggle-password, .toggle-password-btn");

    passwordButtons.forEach(function (button) {
        // Asigna el ícono inicial si está vacío
        if (!button.innerHTML.trim()) {
            button.innerHTML = eyeClosedSVG;
        }

        button.addEventListener("click", function () {
            // Obtiene el ID del input destino desde data-target o usa "password" por defecto
            const targetId = button.dataset.target || "password";
            const input = document.getElementById(targetId);

            if (input) {
                const esPassword = input.type === "password";

                input.type = esPassword ? "text" : "password";
                button.innerHTML = esPassword ? eyeOpenSVG : eyeClosedSVG;

                button.setAttribute(
                    "aria-label",
                    esPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                );
                button.setAttribute("aria-pressed", String(esPassword));
            }
        });
    });

    // ---------------------------------------------------------
    // 3. Validación de coincidencia de contraseñas (Solo Registro)
    // ---------------------------------------------------------
    const registerForm = document.getElementById("register-form");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm_password");
    const passwordError = document.getElementById("password-error");

    if (registerForm && passwordInput && confirmPasswordInput) {
        function validarCoincidencia() {
            const coinciden = passwordInput.value === confirmPasswordInput.value;
            confirmPasswordInput.setCustomValidity(
                coinciden ? "" : "Las contraseñas no coinciden."
            );

            if (passwordError) {
                passwordError.hidden = coinciden || confirmPasswordInput.value === "";
            }

            return coinciden;
        }

        passwordInput.addEventListener("input", validarCoincidencia);
        confirmPasswordInput.addEventListener("input", validarCoincidencia);

        registerForm.addEventListener("submit", function (event) {
            if (!validarCoincidencia()) {
                event.preventDefault();
                if (passwordError) passwordError.hidden = false;
                confirmPasswordInput.reportValidity();
            }
        });
    }
});