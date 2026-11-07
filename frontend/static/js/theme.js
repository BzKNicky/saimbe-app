/* =========================================================
   SAIMBE | Lógica Global de Cambio de Tema (Claro / Oscuro)
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    const themeToggle = document.getElementById("theme-toggle");
    const root = document.documentElement;
    const themeMeta = document.querySelector('meta[name="theme-color"]');

    function aplicarTema(tema) {
        root.setAttribute("data-theme", tema);

        if (themeToggle) {
            themeToggle.textContent = tema === "dark" ? "☀️" : "🌙";

            themeToggle.setAttribute(
                "aria-label",
                tema === "dark"
                    ? "Cambiar a modo claro"
                    : "Cambiar a modo oscuro"
            );

            themeToggle.title = tema === "dark"
                ? "Cambiar a modo claro"
                : "Cambiar a modo oscuro";
        }

        if (themeMeta) {
            themeMeta.content = tema === "dark" ? "#07111f" : "#f4f8fc";
        }
    }

    // Leer el tema guardado en localStorage
    let temaGuardado = "dark";
    try {
        temaGuardado = localStorage.getItem("saimbe-theme") || "dark";
    } catch (error) {
        temaGuardado = "dark";
    }

    if (temaGuardado !== "light" && temaGuardado !== "dark") {
        temaGuardado = "dark";
    }

    // Aplicar al cargar la página
    aplicarTema(temaGuardado);

    // Escuchar el clic del botón
    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            const temaActual = root.getAttribute("data-theme");
            const nuevoTema = temaActual === "dark" ? "light" : "dark";

            aplicarTema(nuevoTema);

            try {
                localStorage.setItem("saimbe-theme", nuevoTema);
            } catch (error) {
                // Fallback en caso de bloqueo de cookies/localStorage
            }
        });
    }
});