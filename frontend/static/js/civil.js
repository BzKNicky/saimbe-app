document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. INTERRUPTOR DE MODO OSCURO / CLARO
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Cargar tema guardado en localStorage
    const savedTheme = localStorage.getItem('saimbe-theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('saimbe-theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (themeToggleBtn) {
            themeToggleBtn.textContent = theme === 'dark' ? '☀' : '🌙';
        }
    }

    // ==========================================
    // 2. MENÚ DESPLEGABLE MÓVIL (HAMBURGUESA)
    // ==========================================
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    // ==========================================
    // 3. CONTROL DE MODALES Y FORMULARIOS AJAX
    // ==========================================
    const modalUser = document.getElementById('modal-usuario');
    const modalEmergencia = document.getElementById('modal-emergencia');
    const modalConfig = document.getElementById('modal-configuracion');

    const btnOpenUserModal = document.getElementById('btn-nuevo-usuario');
    const btnOpenEmergenciaSidebar = document.getElementById('btn-reportar-emergencia');
    const btnOpenEmergenciaCard = document.getElementById('btn-reportar-emergencia-card');

    const formCrearUsuario = document.getElementById('form-crear-usuario');
    const formEmergencia = document.getElementById('form-emergencia');

    if (btnOpenUserModal && modalUser) {
        btnOpenUserModal.addEventListener('click', (e) => {
            e.preventDefault();
            modalUser.style.display = 'flex';
        });
    }

    const openEmergenciaModal = (e) => {
        if (e) e.preventDefault();
        if (modalEmergencia) modalEmergencia.style.display = 'flex';
        if (sidebar) sidebar.classList.remove('active');

        // Asignar coordenadas GPS actuales a los inputs ocultos
        const inputLat = document.getElementById('emergencia_lat');
        const inputLng = document.getElementById('emergencia_lng');
        if (inputLat && window.currentUserLat) inputLat.value = window.currentUserLat;
        if (inputLng && window.currentUserLng) inputLng.value = window.currentUserLng;
    };

    if (btnOpenEmergenciaSidebar) {
        btnOpenEmergenciaSidebar.addEventListener('click', openEmergenciaModal);
    }
    if (btnOpenEmergenciaCard) {
        btnOpenEmergenciaCard.addEventListener('click', openEmergenciaModal);
    }

    const btnCloseModals = document.querySelectorAll('.close-modal');
    btnCloseModals.forEach(btn => {
        btn.addEventListener('click', () => {
            if (modalUser) modalUser.style.display = 'none';
            if (modalEmergencia) modalEmergencia.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === modalUser) {
            modalUser.style.display = 'none';
        }
        if (e.target === modalEmergencia) {
            modalEmergencia.style.display = 'none';
        }
        if (e.target === modalConfig) {
            modalConfig.style.display = 'none';
        }
    });

    // Envío AJAX de Formulario Crear Usuario (Panel Admin) con SweetAlert2
    if (formCrearUsuario) {
        formCrearUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                nombre: document.getElementById('nombre').value.trim(),
                correo: document.getElementById('correo').value.trim(),
                password: document.getElementById('password').value.trim(),
                rol: document.getElementById('rol').value
            };

            try {
                const response = await fetch('/crear_usuario_ajax', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    Swal.fire({
                        title: '¡Usuario Creado!',
                        text: result.message,
                        icon: 'success',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#2563eb',
                        background: '#1a1d20',
                        color: '#ffffff'
                    }).then((res) => {
                        if (res.isConfirmed) {
                            if (modalUser) modalUser.style.display = 'none';
                            formCrearUsuario.reset();
                            location.reload();
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: result.message,
                        icon: 'error',
                        confirmButtonText: 'Cerrar',
                        confirmButtonColor: '#6c757d',
                        background: '#1a1d20',
                        color: '#ffffff'
                    });
                }
            } catch (error) {
                console.error('Error al intentar crear usuario:', error);
                Swal.fire({
                    title: 'Error de Servidor',
                    text: 'Ocurrió un error inesperado al comunicar con el servidor.',
                    icon: 'error',
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6c757d',
                    background: '#1a1d20',
                    color: '#ffffff'
                });
            }
        });
    }

    // Envío AJAX mejorado de Formulario Reportar Emergencia (Panel Civil) con SweetAlert2
    if (formEmergencia) {
        formEmergencia.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(formEmergencia);
            const payload = {
                tipo: formData.get('tipo') || '',
                otro_tipo: formData.get('otro_tipo') || '',
                ubicacion: formData.get('ubicacion') || '',
                descripcion: formData.get('descripcion') || '',
                latitud: formData.get('latitud') || null,
                longitud: formData.get('longitud') || null
            };

            try {
                const response = await fetch('/api/reportar_emergencia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.success) {
                    Swal.fire({
                        title: '¡Emergencia Reportada!',
                        text: result.message,
                        icon: 'success',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#dc3545',
                        background: '#1a1d20',
                        color: '#ffffff'
                    }).then((res) => {
                        if (res.isConfirmed) {
                            if (modalEmergencia) modalEmergencia.style.display = 'none';
                            formEmergencia.reset();
                            location.reload();
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: result.message || 'No se pudo guardar el reporte.',
                        icon: 'error',
                        confirmButtonText: 'Cerrar',
                        confirmButtonColor: '#6c757d',
                        background: '#1a1d20',
                        color: '#ffffff'
                    });
                }
            } catch (error) {
                console.error('Error al enviar la emergencia:', error);
                Swal.fire({
                    title: 'Error de Conexión',
                    text: 'Ocurrió un error al enviar el reporte. Inténtalo nuevamente.',
                    icon: 'error',
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6c757d',
                    background: '#1a1d20',
                    color: '#ffffff'
                });
            }
        });
    }

    // ==========================================
    // 4. CAMPO DINÁMICO: "OTRO TIPO DE EMERGENCIA"
    // ==========================================
    const selectTipo = document.getElementById('tipo');
    const grupoOtroTipo = document.getElementById('grupo-otro-tipo');
    const inputOtroTipo = document.getElementById('otro_tipo');

    if (selectTipo && grupoOtroTipo) {
        selectTipo.addEventListener('change', () => {
            if (selectTipo.value === 'Otro') {
                grupoOtroTipo.style.display = 'flex';
                if (inputOtroTipo) inputOtroTipo.setAttribute('required', 'required');
            } else {
                grupoOtroTipo.style.display = 'none';
                if (inputOtroTipo) {
                    inputOtroTipo.removeAttribute('required');
                    inputOtroTipo.value = '';
                }
            }
        });
    }

    // ==========================================
    // 5. MAPA INTERACTIVO Y CENTROS DE EMERGENCIA (LEAFLET)
    // ==========================================
    const mapElement = document.getElementById('map');
    
    if (mapElement && typeof L !== 'undefined') {
        let userLat = 4.7331;
        let userLng = -74.2642;

        window.currentUserLat = userLat;
        window.currentUserLng = userLng;

        const map = L.map('map').setView([userLat, userLng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);

        const centrosEmergencia = [
            { id: 1, nombre: "E.S.E. Hospital Santa Matilda", municipio: "Madrid", tipo: "Salud", lat: 4.7358, lng: -74.2625, direccion: "Cl. 6 #2-44, Madrid", telefono: "(601) 8250000" },
            { id: 2, nombre: "Estación de Bomberos Madrid", municipio: "Madrid", tipo: "Socorro", lat: 4.7320, lng: -74.2670, direccion: "Cr. 4 #8-12, Madrid", telefono: "(601) 8251111" },
            { id: 3, nombre: "Estación de Policía Madrid", municipio: "Madrid", tipo: "Seguridad", lat: 4.7342, lng: -74.2648, direccion: "Cl. 7 #4-20, Madrid", telefono: "(601) 8252222" },
            { id: 4, nombre: "Defensa Civil Madrid", municipio: "Madrid", tipo: "Socorro", lat: 4.7295, lng: -74.2611, direccion: "Cr. 2 #10-05, Madrid", telefono: "310 000 0000" },
            { id: 5, nombre: "CAMI / Centro de Salud Serrezuela", municipio: "Madrid", tipo: "Salud", lat: 4.7410, lng: -74.2580, direccion: "Tv. 3 #12-00, Madrid", telefono: "(601) 8253333" },
            { id: 6, nombre: "Hospital María Auxiliadora", municipio: "Mosquera", tipo: "Salud", lat: 4.7081, lng: -74.2305, direccion: "Cl. 3 #2-15, Mosquera", telefono: "(601) 8272000" },
            { id: 7, nombre: "Cuerpo de Bomberos Mosquera", municipio: "Mosquera", tipo: "Socorro", lat: 4.7065, lng: -74.2318, direccion: "Cr. 5 #2-10, Mosquera", telefono: "(601) 8272111" },
            { id: 8, nombre: "Estación de Policía Mosquera", municipio: "Mosquera", tipo: "Seguridad", lat: 4.7050, lng: -74.2330, direccion: "Cl. 2 #4-08, Mosquera", telefono: "(601) 8272222" },
            { id: 9, nombre: "Centro de Atención Médica El Porvenir", municipio: "Mosquera", tipo: "Salud", lat: 4.7140, lng: -74.2210, direccion: "Cl. 15 #10-02, Mosquera", telefono: "(601) 8273000" },
            { id: 10, nombre: "Hospital Nuestra Señora de las Mercedes", municipio: "Funza", tipo: "Salud", lat: 4.7180, lng: -74.2120, direccion: "Cr. 13 #12-40, Funza", telefono: "(601) 8263000" },
            { id: 11, nombre: "Estación de Bomberos Funza", municipio: "Funza", tipo: "Socorro", lat: 4.7155, lng: -74.2145, direccion: "Cl. 15 #9-18, Funza", telefono: "(601) 8263111" },
            { id: 12, nombre: "Estación de Policía Funza", municipio: "Funza", tipo: "Seguridad", lat: 4.7162, lng: -74.2105, direccion: "Cr. 9 #13-22, Funza", telefono: "(601) 8263222" },
            { id: 13, nombre: "Comité Cruz Roja Funza", municipio: "Funza", tipo: "Socorro", lat: 4.7201, lng: -74.2080, direccion: "Cl. 9 #11-30, Funza", telefono: "(601) 8264000" }
        ];

        function calcularDistancia(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }

        function obtenerIconoCentro(tipo) {
            let badgeBg = '#2563eb';
            let iconText = '🏥';

            if (tipo === 'Socorro') {
                badgeBg = '#d97706';
                iconText = '🚒';
            } else if (tipo === 'Seguridad') {
                badgeBg = '#0284c7';
                iconText = '👮';
            }

            return L.divIcon({
                className: 'custom-marker-pin',
                html: `<div style="background-color: ${badgeBg}; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;">${iconText}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });
        }

        function normalizarTipoSelect(valor) {
            if (!valor || valor === 'todos') return 'Todos';
            if (valor === 'bomberos' || valor === 'cruz_roja' || valor === 'defensa_civil' || valor === 'hidrocarburos') return 'Socorro';
            if (valor === 'policia' || valor === 'fuerzas_militares') return 'Seguridad';
            if (valor === 'crue_usar') return 'Salud';
            return 'Todos';
        }

        const mapMarkers = {};

        function actualizarMapaYListado(currentLat, currentLng) {
            markersLayer.clearLayers();

            const filterSelect = document.getElementById('tipoCentroSelect');
            const valorRaw = filterSelect ? filterSelect.value : 'todos';
            const filtroTipo = normalizarTipoSelect(valorRaw);

            const listaCentrosEl = document.getElementById('listaCentros');
            const countEl = document.getElementById('cantCentros');

            if (listaCentrosEl) listaCentrosEl.innerHTML = '';

            const centrosFiltrados = centrosEmergencia.filter(centro => {
                return filtroTipo === 'Todos' || centro.tipo === filtroTipo;
            });

            if (countEl) countEl.innerText = centrosFiltrados.length;

            centrosFiltrados.forEach(centro => {
                const dist = calcularDistancia(currentLat, currentLng, centro.lat, centro.lng);
                const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centro.lat},${centro.lng}`;
                const wazeUrl = `https://waze.com/ul?ll=${centro.lat},${centro.lng}&navigate=yes`;

                const popupContent = `
                    <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 2px;">
                        <h4 style="margin: 0 0 4px 0; color: #16324f; font-size: 14px;">${centro.nombre}</h4>
                        <p style="margin: 0 0 2px 0; font-size: 12px; color: #64748b;">Municipio: <strong>${centro.municipio}</strong></p>
                        <p style="margin: 0 0 2px 0; font-size: 12px; color: #64748b;">Tipo: <strong>${centro.tipo}</strong></p>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Dir: ${centro.direccion}</p>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #0f172a;">Distancia: <strong>${dist.toFixed(2)} km</strong></p>
                        <div style="display: flex; gap: 6px;">
                            <a href="${gmapsUrl}" target="_blank" style="padding: 5px 8px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold;">📍 Google Maps</a>
                            <a href="${wazeUrl}" target="_blank" style="padding: 5px 8px; background: #0284c7; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold;">🚗 Waze</a>
                        </div>
                    </div>
                `;

                const marker = L.marker([centro.lat, centro.lng], { icon: obtenerIconoCentro(centro.tipo) })
                    .bindPopup(popupContent);

                markersLayer.addLayer(marker);
                mapMarkers[centro.id] = marker;

                if (listaCentrosEl) {
                    const li = document.createElement('li');
                    li.style.cursor = 'pointer';
                    li.style.padding = '8px';
                    li.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
                    li.innerHTML = `<strong>${centro.nombre}</strong><br><span style="color:var(--text-muted, #64748b); font-size:11px;">${centro.municipio} • ${dist.toFixed(2)} km</span>`;
                    li.addEventListener('click', () => {
                        map.flyTo([centro.lat, centro.lng], 16, { duration: 1.2 });
                        marker.openPopup();
                    });
                    listaCentrosEl.appendChild(li);
                }
            });
        }

        window.encontrarMasCercanoFiltrado = function() {
            const filterSelect = document.getElementById('tipoCentroSelect');
            const valorRaw = filterSelect ? filterSelect.value : 'todos';
            const filtroTipo = normalizarTipoSelect(valorRaw);

            let candidatos = centrosEmergencia;
            if (filtroTipo !== 'Todos') {
                candidatos = centrosEmergencia.filter(c => c.tipo === filtroTipo);
            }

            if (candidatos.length === 0) {
                Swal.fire({
                    title: 'Sin resultados',
                    text: 'No hay sedes disponibles para la categoría seleccionada.',
                    icon: 'info',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: '#2563eb',
                    background: '#1a1d20',
                    color: '#ffffff'
                });
                return;
            }

            let masCercano = null;
            let distMin = Infinity;

            candidatos.forEach(centro => {
                const dist = calcularDistancia(userLat, userLng, centro.lat, centro.lng);
                if (dist < distMin) {
                    distMin = dist;
                    masCercano = centro;
                }
            });

            if (masCercano) {
                const resCard = document.getElementById('resultadoCercano');
                const cercanoNombre = document.getElementById('cercanoNombre');
                const cercanoTipo = document.getElementById('cercanoTipo');
                const cercanoDistancia = document.getElementById('cercanoDistancia');
                const btnComoLlegar = document.getElementById('btnComoLlegar');

                if (resCard) {
                    if (cercanoNombre) cercanoNombre.innerText = masCercano.nombre;
                    if (cercanoTipo) cercanoTipo.innerText = `${masCercano.municipio} - ${masCercano.tipo}`;
                    if (cercanoDistancia) cercanoDistancia.innerText = `Distancia: ${distMin.toFixed(2)} km`;
                    
                    if (btnComoLlegar) {
                        btnComoLlegar.onclick = () => {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${masCercano.lat},${masCercano.lng}`, '_blank');
                        };
                    }
                    resCard.style.display = 'block';
                }

                map.flyTo([masCercano.lat, masCercano.lng], 16, { duration: 1.2 });
                if (mapMarkers[masCercano.id]) {
                    mapMarkers[masCercano.id].openPopup();
                }
            }
        };

        window.filtrarCentros = function() {
            actualizarMapaYListado(userLat, userLng);
        };

        const filterSelectEl = document.getElementById('tipoCentroSelect');
        if (filterSelectEl) {
            filterSelectEl.addEventListener('change', () => actualizarMapaYListado(userLat, userLng));
        }

        const locateControl = L.control({ position: 'topright' });

        locateControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.style.backgroundColor = 'var(--card-bg, #ffffff)';
            div.style.padding = '0';
            div.style.cursor = 'pointer';
            div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

            const button = L.DomUtil.create('a', '', div);
            button.href = '#';
            button.title = 'Ir a mi ubicación actual';
            button.innerHTML = '🎯';
            button.style.fontSize = '18px';
            button.style.width = '34px';
            button.style.height = '34px';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.textDecoration = 'none';

            L.DomEvent.disableClickPropagation(button);

            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (userMarker) {
                    map.flyTo([userLat, userLng], 16, { duration: 1.2 });
                    userMarker.openPopup();
                } else {
                    Swal.fire({
                        title: 'GPS',
                        text: 'Obteniendo posición GPS...',
                        icon: 'info',
                        timer: 1500,
                        showConfirmButton: false,
                        background: '#1a1d20',
                        color: '#ffffff'
                    });
                }
            });

            return div;
        };

        locateControl.addTo(map);

        actualizarMapaYListado(userLat, userLng);

        let userMarker = null;
        let isFirstLocationFix = true;

        const userIcon = L.divIcon({
            className: 'custom-user-pin',
            html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });

        if ("geolocation" in navigator) {
            const geoOptions = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };

            const handlePositionSuccess = (position) => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;

                window.currentUserLat = userLat;
                window.currentUserLng = userLng;

                if (userMarker) {
                    userMarker.setLatLng([userLat, userLng]);
                } else {
                    userMarker = L.marker([userLat, userLng], { icon: userIcon })
                        .addTo(map)
                        .bindPopup("<strong>📍 Tu ubicación actual</strong>");
                }

                if (isFirstLocationFix) {
                    map.setView([userLat, userLng], 12);
                    userMarker.openPopup();
                    isFirstLocationFix = false;
                }

                actualizarMapaYListado(userLat, userLng);
            };

            const handlePositionError = (error) => {
                console.warn("Advertencia de geolocalización GPS:", error.message);
                actualizarMapaYListado(userLat, userLng);
            };

            navigator.geolocation.watchPosition(handlePositionSuccess, handlePositionError, geoOptions);
        }
    }
});

// ==========================================
// 6. CONTROL DE VENTANA EMERGENTE (MODAL) DE CONFIGURACIÓN CIVIL
// ==========================================
window.abrirModalConfiguracion = function() {
    const modal = document.getElementById('modal-configuracion');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.cerrarModalConfiguracion = function() {
    const modal = document.getElementById('modal-configuracion');
    if (modal) {
        modal.style.display = 'none';
    }
};

// ==========================================
// 7. FUNCIÓN PARA VER / OCULTAR CONTRASEÑAS (VECTORES SVG)
// ==========================================
window.togglePassword = function(fieldId, btn) {
    const input = document.getElementById(fieldId);
    if (input) {
        if (input.type === "password") {
            input.type = "text";
            // Icono de ojo cerrado (tachado)
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
            btn.title = "Ocultar contraseña";
        } else {
            input.type = "password";
            // Icono de ojo abierto
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
            btn.title = "Ver contraseña";
        }
    }
};