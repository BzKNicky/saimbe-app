/* ==========================================================
   SAIMBE - PANEL DE RESPONDIENTES
   Demostración independiente - HTML, CSS y JavaScript
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // ======================================================
    // 1. ELEMENTOS HTML
    // ======================================================

    const $ = id => document.getElementById(id);

    const emergencyList = $("emergency-list");
    const searchInput = $("search-input");
    const statusFilter = $("status-filter");
    const historyBody = $("history-body");
    const detailDialog = $("detail-dialog");
    const dialogContent = $("dialog-content");
    const dialogTitle = $("dialog-title");
    const dialogAction = $("dialog-action");
    const toastRegion = $("toast-region");

    // ======================================================
    // 2. ORGANISMOS DE RESPUESTA
    // ======================================================

    const roleSelector = $("role-selector");

    const allowedRoles = [
        "Paramédico",
        "Policía",
        "Bombero",
        "Guardia de seguridad",
        "Defensa civil",
        "Agente de tránsito"
    ];


function updateRespondentRole(role, notify = false) {

    // Si la cabecera ya viene renderizada desde Jinja (Flask), respetamos ese valor
    const serverRoleElement = $("profile-name");
    const serverRole = serverRoleElement ? serverRoleElement.textContent.trim() : "";

    if (!roleSelector && serverRole && allowedRoles.includes(serverRole)) {
        role = serverRole;
    } else if (!allowedRoles.includes(role)) {
        role = "Paramédico";
    }

    const roleIcons = {
        "Paramédico": "🚑",
        "Policía": "🚔",
        "Bombero": "🚒",
        "Guardia de seguridad": "🛡️",
        "Defensa civil": "🦺",
        "Agente de tránsito": "🚦"
    };

    const avatar = $("profile-avatar");

    // Solo actualizar textos del perfil si el selector manual de roles existe en el DOM
    if (roleSelector) {
        setText("profile-name", role);
        if (avatar) {
            avatar.textContent = roleIcons[role] || "🚑";
            avatar.className = "avatar role-avatar";
            avatar.dataset.role = role;
            
            // Reiniciar animación al cambiar de organismo
            void avatar.offsetWidth;
            avatar.classList.add("animate-role");
        }
        roleSelector.value = role;
    }

    setText("welcome-name", role);

    localStorage.setItem("saimbe_profile", role);

    document.title = `SAIMBE | Panel de ${role}`;

    if (notify) {
        toast(`Organismo cambiado a: ${role}`);
    }
}

    const savedRole = localStorage.getItem("saimbe_profile");
    const initialRole = $("profile-name")?.textContent.trim();

    updateRespondentRole(
        allowedRoles.includes(initialRole) ? initialRole : (allowedRoles.includes(savedRole) ? savedRole : "Paramédico")
    );

    roleSelector?.addEventListener("change", () => {
        updateRespondentRole(roleSelector.value, true);
    });

    // ======================================================
    // 3. DATOS DE EMERGENCIAS (INTEGRADOS CON FLASK)
    // ======================================================

    // Captura las emergencias enviadas desde la base de datos de Flask para este recurso específico
    let emergencies = window.SAIMBE_EMERGENCIAS_INICIALES || [];

    let history = [
        {
            id: 1004,
            type: "Robo",
            location: "Parque principal de Madrid",
            status: "Finalizada",
            time: "05:50 a. m."
        },
        {
            id: 1005,
            type: "Emergencia médica",
            location: "Barrio El Sosiego, Madrid",
            status: "Finalizada",
            time: "05:30 a. m."
        },
        {
            id: 1006,
            type: "Accidente",
            location: "Vía Madrid - Mosquera",
            status: "Finalizada",
            time: "05:10 a. m."
        }
    ];

    let selectedEmergency = null;

    // ======================================================
    // 4. GUARDAR Y RECUPERAR DATOS
    // ======================================================

    function saveData() {
        localStorage.setItem(
            "saimbe_emergencies",
            JSON.stringify(emergencies)
        );

        localStorage.setItem(
            "saimbe_history",
            JSON.stringify(history)
        );
    }

    try {
        const savedEmergencies =
            JSON.parse(localStorage.getItem("saimbe_emergencies"));

        const savedHistory =
            JSON.parse(localStorage.getItem("saimbe_history"));

        if (!window.SAIMBE_EMERGENCIAS_INICIALES && Array.isArray(savedEmergencies)) {
            emergencies = savedEmergencies;
        }

        if (Array.isArray(savedHistory)) {
            history = savedHistory;
        }

    } catch (error) {
        console.warn("No fue posible recuperar los datos locales.", error);
    }

    // ======================================================
    // 5. TEMA CLARO Y OSCURO
    // ======================================================

    const themeButton = $("theme-toggle");

    const savedTheme =
        localStorage.getItem("saimbe_theme") || "light";

    document.documentElement.dataset.theme = savedTheme;

    function updateTheme() {

        const dark =
            document.documentElement.dataset.theme === "dark";

        if (themeButton) {
            themeButton.textContent = dark ? "☀️" : "🌙";
        }

        const meta = $("theme-meta");

        if (meta) {
            meta.content = dark ? "#101827" : "#f3f7fb";
        }
    }

    updateTheme();

    themeButton?.addEventListener("click", () => {

        const current = document.documentElement.dataset.theme;

        document.documentElement.dataset.theme =
            current === "dark" ? "light" : "dark";

        localStorage.setItem(
            "saimbe_theme",
            document.documentElement.dataset.theme
        );

        updateTheme();
    });

    // ======================================================
    // 6. NOTIFICACIONES Y ESTADO OPERATIVO MANUAL
    // ======================================================

    function toast(message, type = "success") {

        if (!toastRegion) {
            alert(message);
            return;
        }

        const notification = document.createElement("div");

        notification.className = `toast toast-${type}`;
        notification.textContent = message;

        toastRegion.appendChild(notification);

        setTimeout(() => notification.remove(), 3500);
    }

    // Función global para actualizar la disponibilidad operativa de la unidad
    window.actualizarEstadoManualRespondiente = async function(nuevoEstado) {
        try {
            const response = await fetch('/api/respondiente/actualizar_estado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            const resultado = await response.json();

            if (resultado.success) {
                toast(`Estado operativo cambiado a: ${nuevoEstado}`, 'success');
            } else {
                toast('⚠️ ' + resultado.message, 'warning');
            }
        } catch (error) {
            console.error('Error al actualizar estado operativo:', error);
            toast('Error de conexión con el servidor.', 'danger');
        }
    };

    // ======================================================
    // 7. PROTECCIÓN DE TEXTO
    // ======================================================

    function safe(value) {

        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }

    // ======================================================
    // 8. ESTADOS DE LAS EMERGENCIAS
    // ======================================================

    function statusClass(status) {

        const classes = {
            "Disponible": "status-pending",
            "Pendiente": "status-pending",
            "Aceptada": "status-accepted",
            "En camino": "status-progress",
            "En proceso": "status-progress",
            "En atención": "status-progress",
            "Finalizada": "status-completed",
            "Rechazada": "status-rejected"
        };

        return classes[status] || "";
    }

    // ======================================================
    // 9. BOTONES DE ACCIÓN
    // ======================================================

    function actionButton(item) {
        const estadoActual = item.status || item.estado || "Pendiente";

        switch (estadoActual) {

            case "Disponible":
            case "Pendiente":
                return `
                    <button class="btn btn-primary"
                        data-action="accept" data-id="${item.id}">
                        Aceptar servicio
                    </button>`;

            case "Aceptada":
                return `
                    <button class="btn btn-primary"
                        data-action="travel" data-id="${item.id}">
                        Iniciar desplazamiento
                    </button>`;

            case "En camino":
            case "En proceso":
                return `
                    <button class="btn btn-primary"
                        data-action="attention" data-id="${item.id}">
                        Iniciar atención
                    </button>`;

            case "En atención":
                return `
                    <button class="btn btn-primary"
                        data-action="finish" data-id="${item.id}">
                        Finalizar servicio
                    </button>`;

            default:
                return `
                    <button class="btn btn-outline" disabled>
                        ${safe(estadoActual)}
                    </button>`;
        }
    }

    // ======================================================
    // 10. MOSTRAR EMERGENCIAS
    // ======================================================

    function renderEmergencies() {

        if (!emergencyList) return;

        const search =
            (searchInput?.value || "").toLowerCase().trim();

        const filter = statusFilter?.value || "all";

        const filtered = emergencies.filter(item => {
            const tipoIncidente = item.type || item.tipo || "";
            const ubicacionIncidente = item.location || item.ubicacion || "";
            const estadoIncidente = item.status || item.estado || "Pendiente";

            const matchesSearch =
                String(item.id).includes(search) ||
                tipoIncidente.toLowerCase().includes(search) ||
                ubicacionIncidente.toLowerCase().includes(search);

            const matchesFilter =
                filter === "all" || estadoIncidente === filter;

            return matchesSearch && matchesFilter;
        });

        emergencyList.innerHTML = "";

        filtered.forEach(item => {

            const card = document.createElement("article");

            card.className = "emergency-card";

            const tipoIncidente = item.type || item.tipo || "Emergencia";
            const ubicacionIncidente = item.location || item.ubicacion || "Madrid";
            const estadoIncidente = item.status || item.estado || "Pendiente";
            const prioridadIncidente = item.priority || item.gravedad || "Por definir";
            const tiempoIncidente = item.time || item.fecha || "Reciente";
            const iconoIncidente = item.icon || "🚨";
            const lat = item.latitud || item.lat || "";
            const lng = item.longitud || item.lng || "";

            card.innerHTML = `
                <div class="emergency-card-top">

                    <div class="emergency-icon">
                        ${safe(iconoIncidente)}
                    </div>

                    <div class="emergency-info">
                        <h3>${safe(tipoIncidente)}</h3>
                        <small>Reporte #${item.id}</small>
                    </div>

                    <span class="status-badge ${statusClass(estadoIncidente)}">
                        ${safe(estadoIncidente)}
                    </span>

                </div>

                <div class="emergency-meta">
                    <p>📍 ${safe(ubicacionIncidente)}</p>
                    <p>🕒 ${safe(tiempoIncidente)}</p>
                    <p>⚠️ Prioridad:
                        <strong>${safe(prioridadIncidente)}</strong>
                    </p>
                </div>

                <div class="emergency-actions">

                    <button class="btn btn-outline"
                        data-action="details" data-id="${item.id}">
                        Ver detalles
                    </button>

                    ${lat && lng ? `
                        <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" class="btn btn-outline" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
                            🗺️ Maps / Waze
                        </a>
                    ` : ''}

                    ${actionButton(item)}

                </div>
            `;

            emergencyList.appendChild(card);
        });

        if (filtered.length === 0) {
            emergencyList.innerHTML = `
                <div class="empty-filter">
                    <span>🔎</span>
                    <b>No hay servicios asignados a tu unidad</b>
                    <p>Las emergencias despachadas a tu vehículo aparecerán aquí en tiempo real.</p>
                </div>`;
        }

        updateStatistics();
    }

    // ======================================================
    // 11. ESTADÍSTICAS
    // ======================================================

    function updateStatistics() {

        const pending = emergencies.filter(
            item => {
                const est = item.status || item.estado || "Pendiente";
                return est === "Disponible" || est === "Pendiente";
            }
        ).length;

        const active = emergencies.filter(
            item => {
                const est = item.status || item.estado || "";
                return ["Aceptada", "En camino", "En atención", "En proceso"].includes(est);
            }
        ).length;

        const completed = history.filter(
            item => item.status === "Finalizada"
        ).length;

        const highPriority = emergencies.filter(
            item => {
                const pri = item.priority || item.gravedad || "";
                const est = item.status || item.estado || "";
                return (pri === "Alta" || pri === "Crítica") &&
                    !["Finalizada", "Rechazada"].includes(est);
            }
        ).length;

        setText("stat-pending", pending);
        setText("stat-active", active);
        setText("stat-done", completed);
        setText("stat-high-priority", highPriority);
        setText("nav-pending", pending);
    }

    // ======================================================
    // 12. CAMBIAR ESTADO DEL SERVICIO
    // ======================================================

    function changeStatus(item, newStatus) {

        if (!item) return;

        if (item.status !== undefined) {
            item.status = newStatus;
        } else {
            item.estado = newStatus;
        }

        if (newStatus === "Finalizada" ||
            newStatus === "Rechazada") {

            history.unshift({
                id: item.id,
                type: item.type || item.tipo,
                location: item.location || item.ubicacion,
                status: newStatus,
                time: new Date().toLocaleTimeString("es-CO")
            });
        }

        saveData();

        renderEmergencies();
        renderHistory();

        toast(`Servicio #${item.id}: ${newStatus}`);
    }

    // ======================================================
    // 13. EVENTOS DE LOS BOTONES
    // ======================================================

    emergencyList?.addEventListener("click", event => {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = Number(button.dataset.id);
        const action = button.dataset.action;

        const item = emergencies.find(
            emergency => emergency.id === id
        );

        if (!item) return;

        switch (action) {

            case "details":
                showDetails(item);
                break;

            case "accept":
                changeStatus(item, "Aceptada");
                break;

            case "travel":
                changeStatus(item, "En camino");
                break;

            case "attention":
                changeStatus(item, "En atención");
                break;

            case "finish":

                if (confirm("¿Confirmas que el servicio ha finalizado?")) {
                    changeStatus(item, "Finalizada");
                }

                break;

            case "reject":

                if (confirm("¿Deseas rechazar este servicio?")) {
                    changeStatus(item, "Rechazada");
                    toast("Servicio rechazado", "warning");
                }

                break;
        }
    });

    // ======================================================
    // 14. DETALLES DE LA EMERGENCIA
    // ======================================================

    function showDetails(item) {

        selectedEmergency = item;

        if (!detailDialog || !dialogContent) return;

        const tipoIncidente = item.type || item.tipo || "Incidente";
        const ubicacionIncidente = item.location || item.ubicacion || "Madrid";
        const descripcionIncidente = item.description || item.descripcion_limpia || item.descripcion || "Sin detalles";
        const reportadoPor = item.caller || item.reportado_por || "Ciudadano";
        const telefonoReporte = item.phone || "N/A";
        const prioridadIncidente = item.priority || item.gravedad || "Por definir";
        const estadoIncidente = item.status || item.estado || "Pendiente";
        const lat = item.latitud || item.lat || "";
        const lng = item.longitud || item.lng || "";

        if (dialogTitle) {
            dialogTitle.textContent = tipoIncidente;
        }

        dialogContent.innerHTML = `
            <div class="detail-information">

                <p><strong>Identificador:</strong> #${item.id}</p>

                <p><strong>Ubicación:</strong>
                    ${safe(ubicacionIncidente)}</p>

                <p><strong>Descripción:</strong>
                    ${safe(descripcionIncidente)}</p>

                <p><strong>Reportado por:</strong>
                    ${safe(reportadoPor)}</p>

                <p><strong>Teléfono:</strong>
                    ${safe(telefonoReporte)}</p>

                <p><strong>Prioridad / Gravedad:</strong>
                    ${safe(prioridadIncidente)}</p>

                <p><strong>Estado:</strong>
                    ${safe(estadoIncidente)}</p>

                ${lat && lng ? `
                    <div style="margin-top: 15px;">
                        <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" class="btn btn-primary" style="text-decoration: none; display: block; text-align: center;">
                            🗺️ Abrir ruta exacta en Maps / Waze
                        </a>
                    </div>
                ` : ''}

            </div>`;

        if (dialogAction) {

            const closed = [
                "Finalizada",
                "Rechazada"
            ].includes(estadoIncidente);

            dialogAction.textContent = closed
                ? "Servicio cerrado"
                : estadoIncidente === "Pendiente" || estadoIncidente === "Disponible"
                    ? "Aceptar servicio"
                    : "Actualizar servicio";

            dialogAction.disabled = closed;
        }

        detailDialog.showModal();
    }

    // ======================================================
    // 15. ACCIÓN DESDE EL DETALLE
    // ======================================================

    dialogAction?.addEventListener("click", () => {

        if (!selectedEmergency) return;

        const item = selectedEmergency;
        const estadoActual = item.status || item.estado || "Pendiente";

        switch (estadoActual) {

            case "Disponible":
            case "Pendiente":
                changeStatus(item, "Aceptada");
                break;

            case "Aceptada":
                changeStatus(item, "En camino");
                break;

            case "En camino":
            case "En proceso":
                changeStatus(item, "En atención");
                break;

            case "En atención":

                if (confirm("¿Finalizar este servicio?")) {
                    changeStatus(item, "Finalizada");
                }

                break;
        }

        detailDialog?.close();
        selectedEmergency = null;
    });

    // ======================================================
    // 16. CERRAR VENTANA DE DETALLES
    // ======================================================

    document.querySelectorAll(".close-dialog").forEach(button => {

        button.addEventListener("click", () => {
            detailDialog?.close();
            selectedEmergency = null;
        });
    });

    detailDialog?.addEventListener("close", () => {
        selectedEmergency = null;
    });

    // ======================================================
    // 17. HISTORIAL
    // ======================================================

    function renderHistory() {

        if (!historyBody) return;

        historyBody.innerHTML = "";

        if (history.length === 0) {

            historyBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No hay servicios registrados.
                    </td>
                </tr>`;

            return;
        }

        history.forEach(item => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>#${item.id}</td>

                <td>${safe(item.location)}</td>

                <td>${safe(item.type)}</td>

                <td>
                    <span class="status-badge ${statusClass(item.status)}">
                        ${safe(item.status)}
                    </span>
                </td>

                <td>${safe(item.time)}</td>
            `;

            historyBody.appendChild(row);
        });
    }

    // ======================================================
    // 18. BÚSQUEDA Y FILTROS
    // ======================================================

    searchInput?.addEventListener("input", renderEmergencies);

    statusFilter?.addEventListener("change", renderEmergencies);

    // ======================================================
    // 19. EXPORTAR HISTORIAL
    // ======================================================

    $("export-button")?.addEventListener("click", () => {

        if (history.length === 0) {
            toast("No hay registros para exportar", "warning");
            return;
        }

        const rows = [
            ["ID", "Ubicación", "Tipo", "Estado", "Hora"],

            ...history.map(item => [
                item.id,
                item.location,
                item.type,
                item.status,
                item.time
            ])
        ];

        const csv = "\uFEFF" + rows.map(row =>
            row.map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(";")
        ).join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "historial_SAIMBE.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        toast("Historial exportado correctamente");
    });

    // ======================================================
    // 20. NAVEGACIÓN
    // ======================================================

    document.querySelectorAll(".nav-link").forEach(link => {

        link.addEventListener("click", () => {

            document.querySelectorAll(".nav-link").forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });
    });

    // ======================================================
    // 21. INICIAR APLICACIÓN
    // ======================================================

    renderEmergencies();
    renderHistory();
    updateStatistics();

    console.log("SAIMBE: Panel de respondientes sincronizado correctamente.");

});