document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. FUNCIÓN GLOBAL DE NOTIFICACIONES FLOTANTES (TOAST)
    // ==========================================
    function mostrarToastFlotante(mensaje, tipo = 'success') {
        let container = document.getElementById('saimbe-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'saimbe-toast-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 400px; width: 100%; pointer-events: none;';
            document.body.appendChild(container);
        }

        const bgColor = (tipo === 'danger' || tipo === 'error') ? '#fee2e2' : '#dcfce7';
        const textColor = (tipo === 'danger' || tipo === 'error') ? '#991b1b' : '#166534';
        const borderColor = (tipo === 'danger' || tipo === 'error') ? '#f87171' : '#4ade80';
        const icono = (tipo === 'danger' || tipo === 'error') ? '🚨' : '✅';

        const toast = document.createElement('div');
        toast.style.cssText = `pointer-events: auto; background-color: ${bgColor}; color: ${textColor}; border: 1px solid ${borderColor}; padding: 14px 18px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; font-weight: 500; animation: slideInToast 0.3s ease-out forwards;`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">${icono}</span>
                <span>${mensaje}</span>
            </div>
            <button type="button" onclick="this.parentElement.remove();" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: inherit; padding: 0 0 0 10px; opacity: 0.7; font-weight: bold;">✕</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast) {
                toast.style.transition = 'opacity 0.5s ease';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500);
            }
        }, 5000);
    }

    // ==========================================
    // 1. INTERRUPTOR DE MODO OSCURO / CLARO (CORREGIDO Y ROBUSTO)
    // ==========================================
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('saimbe-theme') || 'light';
    
    htmlElement.setAttribute('data-theme', savedTheme);

    function updateThemeIcon(theme) {
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (themeToggleBtn) {
            themeToggleBtn.textContent = theme === 'dark' ? '☀' : '🌙';
        }
    }

    // Actualizar el icono al iniciar
    updateThemeIcon(savedTheme);

    // Delegación de eventos global para garantizar la respuesta del botón de tema
    document.addEventListener('click', (e) => {
        const themeToggleBtn = e.target.closest('#theme-toggle');
        if (themeToggleBtn) {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('saimbe-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });

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
    // 3. CONTROL DE MODAL PARA CREAR Y EDITAR USUARIO
    // ==========================================
    const btnNuevoUsuario = document.getElementById('btn-nuevo-usuario');
    const modalUsuario = document.getElementById('modal-usuario');
    const modalEditarUsuario = document.getElementById('modal-editar-usuario');
    const botonesCerrarModal = document.querySelectorAll('.close-modal');
    const formCrearUsuario = document.getElementById('form-crear-usuario');
    const formEditarUsuario = document.getElementById('form-editar-usuario');

    if (btnNuevoUsuario && modalUsuario) {
        btnNuevoUsuario.addEventListener('click', () => {
            modalUsuario.style.display = 'flex';
        });
    }

    botonesCerrarModal.forEach(btn => {
        btn.addEventListener('click', () => {
            if (modalUsuario) modalUsuario.style.display = 'none';
            if (modalEditarUsuario) modalEditarUsuario.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === modalUsuario) {
            modalUsuario.style.display = 'none';
        }
        if (event.target === modalEditarUsuario) {
            modalEditarUsuario.style.display = 'none';
        }
    });

    // Función auxiliar global para mostrar/ocultar el selector de vehículos al editar
    window.toggleSelectorRecursoEdicion = function(rolSeleccionado) {
        const grupo = document.getElementById('grupo-recurso-edicion');
        if (grupo) {
            grupo.style.display = (rolSeleccionado === 'Respondiente') ? 'block' : 'none';
        }
    };

    window.abrirModalEditar = function(id, nombre, correo, rol, estado, recursoAsignado) {
        if (!modalEditarUsuario) return;

        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-nombre').value = nombre;
        document.getElementById('edit-correo').value = correo;
        document.getElementById('edit-rol').value = rol;
        document.getElementById('edit-estado').value = estado;

        const selectRecurso = document.getElementById('edit-recurso-asignado');
        if (selectRecurso) {
            selectRecurso.value = recursoAsignado || "Sin Asignar";
        }

        toggleSelectorRecursoEdicion(rol);

        modalEditarUsuario.style.display = 'flex';
    };

    window.cerrarModalEditar = function() {
        if (modalEditarUsuario) modalEditarUsuario.style.display = 'none';
    };

    if (formCrearUsuario) {
        formCrearUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(formCrearUsuario);
            const data = {
                nombre: formData.get('nombre'),
                correo: formData.get('correo'),
                password: formData.get('password'),
                rol: formData.get('rol'),
                recurso_asignado: formData.get('recurso_asignado') || 'Sin Asignar'
            };

            try {
                const response = await fetch('/crear_usuario_ajax', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const resultado = await response.json();

                if (resultado.success) {
                    mostrarToastFlotante(resultado.message, 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    mostrarToastFlotante('⚠️ ' + resultado.message, 'danger');
                }
            } catch (error) {
                console.error('Error en la petición de creación de usuario:', error);
                mostrarToastFlotante('Ocurrió un error al comunicarse con el servidor.', 'danger');
            }
        });
    }

    if (formEditarUsuario) {
        formEditarUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(formEditarUsuario);
            const data = {
                id: formData.get('usuario_id'),
                nombre: formData.get('nombre'),
                correo: formData.get('correo'),
                rol: formData.get('rol'),
                estado: formData.get('estado'),
                recurso_asignado: formData.get('recurso_asignado') || 'Sin Asignar'
            };

            try {
                const response = await fetch('/editar_usuario_ajax', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const resultado = await response.json();

                if (resultado.success) {
                    mostrarToastFlotante(resultado.message, 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    mostrarToastFlotante('⚠️ ' + resultado.message, 'danger');
                }
            } catch (error) {
                console.error('Error en la petición de edición de usuario:', error);
                mostrarToastFlotante('Ocurrió un error al comunicarse con el servidor.', 'danger');
            }
        });
    }

    // ==========================================
    // 4. ASISTENTE DE IA DE ANÁLISIS Y DESPACHO
    // ==========================================
    function generarSugerenciaIA(tipo, ubicacion, descripcion, id) {
        const boxIA = document.getElementById('ia-sugerencia-box') || document.querySelector('.ai-box');
        if (!boxIA) return;

        const descLimpiaText = (descripcion || '').trim().toLowerCase();
        const esPruebaOBasura = descLimpiaText.length < 5 || 
                                /^(asd|prueba|test|lkjhgfds|qwe|123|sin descripcion|-|\.|\s*)$/i.test(descLimpiaText) ||
                                /^[a-zñ]{1,4}$/i.test(descLimpiaText);

        let puntajeSeveridad = 0;
        let factoresDetectados = [];
        let prioridadSugerida = "🟢 Baja";
        let recursoSugerido = "Sin Asignar";
        let recomendacionOperativa = "El reporte no cuenta con una descripción válida o detallada.";

        if (esPruebaOBasura) {
            puntajeSeveridad = 0;
            factoresDetectados.push("⚠️ Reporte Incompleto / Texto de Prueba");
            prioridadSugerida = "🟢 Baja";
            recursoSugerido = "Sin Asignar";
            recomendacionOperativa = "Descripción insuficiente o de prueba detectada. Se requiere contactar al ciudadano para validar los hechos reales.";
        } else {
            const textoAnalizar = `${tipo} ${descripcion}`.toLowerCase();

            const esLaboral = /accidente laboral|empresa:|arl:/i.test(textoAnalizar);
            if (esLaboral) {
                factoresDetectados.push("⚠️ Accidente Laboral (SST / ARL)");
            }

            const hayFuegoReal = (/fuego|llamas|incendio|humo.*local|fuego podría extenderse|salientes? de.*llamas/i.test(textoAnalizar)) && !/no (he visto|observado|hay) fuego|sin presencia de fuego/i.test(textoAnalizar);
            const haySangradoReal = /sangrado abundante|hemorragia activa/i.test(textoAnalizar) && !/no (he visto|observado|hay) sangrado/i.test(textoAnalizar);
            const hayInconscienciaReal = /inconsciente|desvanecido sin pulso/i.test(textoAnalizar) && !/consciente|responde preguntas/i.test(textoAnalizar);

            const regexCriticas = /incendi|fuegos?|llamas|lumbr|conat|explot|deflagr|atrapad|prens|infart|paros?|tirote|balacer|colaps|derrumb/i;
            const regexHidrocarburos = /derram|fug|escap|quimic|hidrocarb|combustible|diésel|gasolina/i;
            const regexModeradas = /choq|acciden|colis|estrell|volcam|atropel|tráns|trans|motocicl|motos?|vehicul|carro|herid|lesion|fractur|golp|traum|dolor|piern|braz|espalda|caida/i;

            if (regexCriticas.test(textoAnalizar) || hayFuegoReal || haySangradoReal || hayInconscienciaReal) {
                puntajeSeveridad += 8;
                factoresDetectados.push("🚨 Riesgo Crítico / Vida o Estructura en Peligro");
            } else if (regexHidrocarburos.test(textoAnalizar)) {
                puntajeSeveridad += 5;
                factoresDetectados.push("⚠️ Derrame / Fuga de Hidrocarburos");
            } else if (regexModeradas.test(textoAnalizar)) {
                puntajeSeveridad += 3;
                factoresDetectados.push("🔵 Afectación Moderada / Lesión Evaluada");
            } else {
                puntajeSeveridad += 1;
                factoresDetectados.push("🟢 Incidente Preventivo / Menor");
            }

            if (puntajeSeveridad >= 7) {
                prioridadSugerida = "🔴 Crítica";
            } else if (puntajeSeveridad >= 5) {
                prioridadSugerida = "🟠 Alta";
            } else if (puntajeSeveridad >= 3) {
                prioridadSugerida = "🔵 Media";
            } else {
                prioridadSugerida = "🟢 Baja";
            }

            recursoSugerido = "Patrulla Policía";
            recomendacionOperativa = "Verificar y atender con patrulla de cuadrante local.";

            if (hayFuegoReal || regexCriticas.test(textoAnalizar)) {
                recursoSugerido = "Ambulancia + Bomberos";
                recomendacionOperativa = "Incendio o situación crítica confirmada. Se requiere soporte integral de socorro y atención prehospitalaria.";
            } else if (regexHidrocarburos.test(textoAnalizar)) {
                recursoSugerido = "Máquina Bomberos";
                recomendacionOperativa = "Fuga o derrame detectado. Despachar unidad de bomberos para contención de materiales y control de vapores.";
            } else if (esLaboral) {
                recursoSugerido = "Ambulancia BÁSICA";
                recomendacionOperativa = "Accidente laboral (AT). Coordinar traslado prehospitalario y activar protocolo con SST y ARL.";
            } else if (/acciden|choq|colis|estrell|volcam|atropel|tráns|trans/i.test(textoAnalizar)) {
                recursoSugerido = "Policía + Ambulancia (Tránsito)";
                recomendacionOperativa = "Control vial obligatorio en vía pública y valoración prehospitalaria de heridos.";
            } else if (/herid|lesion|inconcient|desvanec|paros?|infart|sangr|hemorrag|medic|fractur|dolor|piern|braz/i.test(textoAnalizar)) {
                recursoSugerido = "Ambulancia BÁSICA";
                recomendacionOperativa = "Priorizar atención prehospitalaria de urgencia y traslado asistido al centro médico.";
            } else if (/rob|hurt|armas?|pistol|cuchill|apuñal|tirote|balacer|pele|riñ|agres/i.test(textoAnalizar)) {
                recursoSugerido = "Patrulla Policía";
                recomendacionOperativa = "Asegurar la zona, controlar la amenaza y restablecer el orden público.";
            }
        }

        const resumenFactores = factoresDetectados.length > 0 ? `<span style="font-size: 0.75rem; color: var(--text-muted);">(Factores: ${factoresDetectados.join(', ')})</span>` : "";

        boxIA.innerHTML = `
            <div style="color: var(--primary-color); font-weight: bold; margin-bottom: 5px;">
                🤖 Análisis Sugerido por IA SAIMBE:
            </div>
            <ul style="margin: 0; padding-left: 18px; line-height: 1.4; font-size: 0.85rem;">
                <li><b>Incidente:</b> #${id || 'N/A'} - ${tipo}</li>
                <li><b>Puntaje de Severidad:</b> <strong>${puntajeSeveridad} pts</strong> ${resumenFactores}</li>
                <li><b>Prioridad Recomendada:</b> <span class="badge badge-warning">${prioridadSugerida}</span></li>
                <li><b>Recurso Óptimo:</b> <code style="color: var(--accent-color);">${recursoSugerido}</code></li>
                <li style="margin-top: 4px; color: var(--text-muted);">💡 ${recomendacionOperativa}</li>
            </ul>
        `;
    }

    window.gestionarIncidente = function(id, tipo, gravedad, ubicacion, descripcion) {
        generarSugerenciaIA(tipo, ubicacion, descripcion, id);
    };

    // ==========================================
    // 5. INICIALIZACIÓN DEL MAPA DE OPERACIONES (LEAFLET DUAL GPS CON CÍRCULO DE RADIO DINÁMICO)
    // ==========================================
    const mapContainer = document.getElementById('mapa-operador') || document.getElementById('map-operador');
    if (mapContainer && typeof L !== 'undefined') {
        let operatorLat = 4.7331;
        let operatorLng = -74.2642;

        const map = L.map(mapContainer).setView([operatorLat, operatorLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap - SAIMBE Madrid'
        }).addTo(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        const emergenciasLayer = L.layerGroup().addTo(map);
        let radioCirculoLayer = null;

        function actualizarRadioDespachoMapa(mapInstance, lat, lng) {
            let radioKm = 5.0;
            const filasParametros = document.querySelectorAll('div, span, p');
            filasParametros.forEach(el => {
                if (el.textContent && el.textContent.includes('Radio de Despacho Automático:')) {
                    const match = el.textContent.match(/([\d.]+)\s*km/i);
                    if (match && match[1]) {
                        radioKm = parseFloat(match[1]);
                    }
                }
            });

            if (radioCirculoLayer) {
                mapInstance.removeLayer(radioCirculoLayer);
            }

            radioCirculoLayer = L.circle([lat, lng], {
                radius: radioKm * 1000,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(mapInstance);

            radioCirculoLayer.bindPopup(`<strong>Radio de Despacho Automático:</strong> ${radioKm} km`);
        }

        function obtenerIconoEmergencia(estado) {
            let estadoClean = (estado || '').toLowerCase().trim();
            let claseAnimacion = 'marker-proceso';
            let iconText = '⏳';

            if (estadoClean.includes('pendiente')) {
                claseAnimacion = 'marker-pendiente';
                iconText = '🚨';
            }

            return L.divIcon({
                className: 'custom-emergency-pin',
                html: `<div class="${claseAnimacion}" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.9); border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconText}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });
        }

        window.cargarEmergenciasEnMapa = function() {
            let listaEmergenciasMapeables = [];
            try {
                const filasTabla = document.querySelectorAll('.custom-table tbody tr');
                
                filasTabla.forEach((fila, index) => {
                    const celdas = fila.querySelectorAll('td');
                    if (celdas.length >= 4) {
                        const idText = celdas[0].textContent.trim();
                        const tipoSpan = fila.querySelector('.emergency-type');
                        const tipo = tipoSpan ? tipoSpan.textContent.trim() : (celdas[1] ? celdas[1].textContent.trim() : 'Emergencia');
                        const ubicacion = celdas[3] ? celdas[3].textContent.trim() : 'Madrid, Cundinamarca';
                        
                        const textoFila = fila.textContent.toLowerCase();
                        let estadoActual = "Pendiente";
                        
                        const selectEstado = fila.querySelector('select[name="estado"]');
                        if (selectEstado) {
                            estadoActual = selectEstado.value.trim();
                        } else if (textoFila.includes("en proceso")) {
                            estadoActual = "En proceso";
                        } else if (textoFila.includes("pendiente")) {
                            estadoActual = "Pendiente";
                        } else if (textoFila.includes("finalizada") || textoFila.includes("resuelta")) {
                            estadoActual = "Finalizada";
                        }

                        let estadoClean = estadoActual.toLowerCase();
                        let tipoClean = tipo.toLowerCase();

                        const esPruebaOSistema = tipoClean.includes('test') || 
                                                 tipoClean.includes('prueba') || 
                                                 tipoClean.includes('admin') || 
                                                 tipoClean.includes('operador') || 
                                                 tipoClean.includes('civil');

                        if (!estadoClean.includes('finalizad') && !estadoClean.includes('resuelt') && !estadoClean.includes('atendid') && !esPruebaOSistema) {
                            let emergencyLat = parseFloat(fila.getAttribute('data-lat'));
                            let emergencyLng = parseFloat(fila.getAttribute('data-lng'));

                            if (!isNaN(emergencyLat) && !isNaN(emergencyLng) && emergencyLat !== 0 && emergencyLng !== 0) {
                                listaEmergenciasMapeables.push({
                                    uniqueKey: `${idText}_${index}`,
                                    id: idText,
                                    tipo: tipo,
                                    ubicacion: ubicacion,
                                    estado: estadoActual,
                                    descripcion: fila.getAttribute('data-descripcion') || '',
                                    emergencyLat: emergencyLat,
                                    emergencyLng: emergencyLng
                                });
                            }
                        }
                    }
                });
            } catch (error) {
                console.warn('Error al procesar las coordenadas geográficas:', error);
            }

            emergenciasLayer.clearLayers();

            listaEmergenciasMapeables.forEach(em => {
                let esPendiente = em.estado.toLowerCase().includes('pendiente');
                const colorEstado = esPendiente ? '#ef4444' : '#0284c7';
                
                const popupEmergency = `
                    <div style="font-family: system-ui, sans-serif; min-width: 180px;">
                        <h4 style="margin: 0 0 4px 0; color: #16324f; font-size: 13px;">🚨 ${em.id} - ${em.tipo}</h4>
                        <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b;">Ubicación: <strong>${em.ubicacion}</strong></p>
                        <p style="margin: 0 0 2px 0; font-size: 11px;">Estado: <strong style="color: ${colorEstado};">${em.estado}</strong></p>
                    </div>
                `;
                const markerEmergency = L.marker([em.emergencyLat, em.emergencyLng], { icon: obtenerIconoEmergencia(em.estado) })
                    .bindPopup(popupEmergency);
                
                markerEmergency.on('click', () => {
                    generarSugerenciaIA(em.tipo, em.ubicacion, em.descripcion, em.id);
                });

                emergenciasLayer.addLayer(markerEmergency);
            });
        };

        const locateControl = L.control({ position: 'topright' });

        locateControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.style.backgroundColor = 'var(--card-bg, #ffffff)';
            div.style.cursor = 'pointer';
            div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            div.style.borderRadius = '4px';

            const button = L.DomUtil.create('a', '', div);
            button.href = '#';
            button.title = 'Ir a mi ubicación GPS actual';
            button.innerHTML = '🎯';
            button.style.fontSize = '16px';
            button.style.width = '30px';
            button.style.height = '30px';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.textDecoration = 'none';

            L.DomEvent.disableClickPropagation(button);

            button.addEventListener('click', (e) => {
                e.preventDefault();
                map.flyTo([operatorLat, operatorLng], 15, { duration: 1.2 });
            });

            return div;
        };

        locateControl.addTo(map);

        const filasTablaAdmin = document.querySelectorAll('.custom-table tbody tr[data-lat]');
        filasTablaAdmin.forEach(fila => {
            fila.addEventListener('click', (e) => {
                if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && e.target.tagName !== 'INPUT') {
                    const lat = parseFloat(fila.getAttribute('data-lat'));
                    const lng = parseFloat(fila.getAttribute('data-lng'));
                    const tipo = fila.getAttribute('data-tipo') || 'Incidente';
                    const ubicacion = fila.getAttribute('data-ubicacion') || '';
                    const descripcion = fila.getAttribute('data-descripcion') || '';
                    const id = fila.querySelector('td.fw-bold')?.textContent || '#';

                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        map.setView([lat, lng], 15);
                    }
                    generarSugerenciaIA(tipo, ubicacion, descripcion, id);
                }
            });
        });

        const userIcon = L.divIcon({
            className: 'custom-operator-pin',
            html: `<div style="background-color: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37, 99, 235, 0.8);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    operatorLat = position.coords.latitude;
                    operatorLng = position.coords.longitude;

                    L.marker([operatorLat, operatorLng], { icon: userIcon })
                        .addTo(map)
                        .bindPopup("<strong>🏢 Central Administrativa SAIMBE</strong>");

                    map.setView([operatorLat, operatorLng], 13);
                    actualizarRadioDespachoMapa(map, operatorLat, operatorLng);
                    window.cargarEmergenciasEnMapa();
                },
                (error) => {
                    console.warn("Geolocalización no disponible:", error.message);
                    L.marker([operatorLat, operatorLng], { icon: userIcon })
                        .addTo(map)
                        .bindPopup("<strong>🏢 Base Central Madrid (Por Defecto)</strong>");
                    actualizarRadioDespachoMapa(map, operatorLat, operatorLng);
                    window.cargarEmergenciasEnMapa();
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            L.marker([operatorLat, operatorLng], { icon: userIcon })
                .addTo(map)
                .bindPopup("<strong>🏢 Base Central Madrid (Por Defecto)</strong>");
            actualizarRadioDespachoMapa(map, operatorLat, operatorLng);
            window.cargarEmergenciasEnMapa();
        }
    }

    // ==========================================
    // 6. FILTRADO RÁPIDO DE LA TABLA DE EMERGENCIAS
    // ==========================================
    window.filtrarTablaOperador = function(estadoDeseado, botonClickeado) {
        const botones = document.querySelectorAll('.table-filters button');
        botones.forEach(btn => btn.classList.remove('active-filter'));
        if (botonClickeado) {
            botonClickeado.classList.add('active-filter');
        }

        const filas = document.querySelectorAll('.custom-table tbody tr');
        
        filas.forEach(fila => {
            const badgeEstado = fila.querySelector('select[name="estado"]');
            if (!badgeEstado) return;

            const textoEstado = badgeEstado.value.trim();

            if (estadoDeseado === 'todos' || textoEstado.toLowerCase() === estadoDeseado.toLowerCase()) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    };

    // ==========================================
    // 7. MODAL DE DESCRIPCIÓN COMPLETA
    // ==========================================
    window.verDescripcionCompleta = function(buttonElement) {
        const fila = buttonElement.closest('tr');
        if (!fila) return;

        document.getElementById('modal-desc-titulo').textContent = `Reporte #${fila.querySelector('td.fw-bold').textContent}`;
        document.getElementById('modal-desc-tipo').textContent = fila.getAttribute('data-tipo') || 'N/A';
        document.getElementById('modal-desc-reportado').textContent = fila.getAttribute('data-reportado') || 'Ciudadano';
        document.getElementById('modal-desc-fecha').textContent = fila.getAttribute('data-fecha') || 'Hoy';
        document.getElementById('modal-desc-ubicacion').textContent = fila.getAttribute('data-ubicacion') || 'Madrid, Cundinamarca';
        document.getElementById('modal-desc-texto').textContent = fila.getAttribute('data-descripcion') || 'Sin descripción adicional.';

        const modal = document.getElementById('modal-descripcion-emergencia');
        if (modal) modal.style.display = 'flex';
    };

    window.cerrarModalDescripcion = function() {
        const modal = document.getElementById('modal-descripcion-emergencia');
        if (modal) modal.style.display = 'none';
    };

    // ==========================================
    // 8. FILTRADO EN TIEMPO REAL DE USUARIOS (NOMBRE / CORREO)
    // ==========================================
    window.filtrarUsuariosTabla = function() {
        const input = document.getElementById('input-buscar-usuario');
        if (!input) return;
        
        const filtro = input.value.toLowerCase().trim();
        const tabla = document.getElementById('tabla-usuarios-gestion');
        if (!tabla) return;
        
        const filas = tabla.querySelectorAll('tbody tr');

        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length >= 3) {
                const nombre = celdas[1].textContent.toLowerCase();
                const correo = celdas[2].textContent.toLowerCase();

                if (nombre.includes(filtro) || correo.includes(filtro)) {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            }
        });
    };

    // ==========================================
    // 9. VALIDACIÓN VISUAL E INTUITIVA DE CASILLAS (ADMIN)
    // ==========================================
    document.addEventListener('click', function(event) {
        const btnGuardar = event.target.closest('button');
        if (btnGuardar && btnGuardar.textContent.includes('Guardar')) {
            const form = btnGuardar.closest('form');
            const fila = btnGuardar.closest('tr');
            if (!form && !fila) return;

            const gravedadSelect = (form || fila).querySelector('select[name="gravedad"]');
            const recursoSelect = (form || fila).querySelector('select[name="recurso"]');

            if (gravedadSelect && recursoSelect) {
                let hayError = false;

                limpiarAvisoCasilla(gravedadSelect);
                limpiarAvisoCasilla(recursoSelect);

                if (gravedadSelect.value === 'Por definir' || !gravedadSelect.value) {
                    event.preventDefault();
                    mostrarAvisoCasilla(gravedadSelect, '⚠️ Selecciona una prioridad.');
                    hayError = true;
                }

                if (recursoSelect.value === 'Sin Asignar' || !recursoSelect.value) {
                    event.preventDefault();
                    mostrarAvisoCasilla(recursoSelect, '⚠️ Asigna un recurso.');
                    hayError = true;
                }

                if (hayError) {
                    return false;
                }
            }
        }
    });

    function mostrarAvisoCasilla(selectElement, mensaje) {
        selectElement.style.border = '2px solid #ef4444';
        
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        if (currentTheme === 'dark') {
            selectElement.style.backgroundColor = '#0f172a';
            selectElement.style.color = '#f8fafc';
        } else {
            selectElement.style.backgroundColor = '#ffffff';
            selectElement.style.color = '#0f172a';
        }
        
        let contenedorCelda = selectElement.closest('td') || selectElement.parentElement;
        
        if (window.getComputedStyle(contenedorCelda).position === 'static') {
            contenedorCelda.style.position = 'relative';
        }

        let avisoExistente = contenedorCelda.querySelector('.aviso-error-casilla');
        
        if (!avisoExistente) {
            let aviso = document.createElement('div');
            aviso.className = 'aviso-error-casilla';
            aviso.style.color = '#ef4444';
            aviso.style.fontSize = '0.7rem';
            aviso.style.fontWeight = '700';
            aviso.style.marginBottom = '4px';
            aviso.style.lineHeight = '1.2';
            aviso.textContent = mensaje;
            
            selectElement.insertAdjacentElement('beforebegin', aviso);
        } else {
            avisoExistente.textContent = mensaje;
        }
    }

    function limpiarAvisoCasilla(selectElement) {
        if (!selectElement) return;
        selectElement.style.border = '1px solid var(--border-color)';
        selectElement.style.backgroundColor = '';
        selectElement.style.color = '';
        
        let contenedorCelda = selectElement.closest('td') || selectElement.parentElement;
        let avisoExistente = contenedorCelda ? contenedorCelda.querySelector('.aviso-error-casilla') : null;
        if (avisoExistente) {
            avisoExistente.remove();
        }
    }

    document.addEventListener('change', function(event) {
        if (event.target.tagName === 'SELECT') {
            limpiarAvisoCasilla(event.target);
        }
    });

    // ==========================================
    // 10. ⚙️ GESTIÓN DE PARÁMETROS DEL SISTEMA
    // ==========================================
    window.abrirModalParametros = function() {
        const modal = document.getElementById('modal-parametros');
        if (modal) modal.style.display = 'flex';
    };

    window.cerrarModalParametros = function() {
        const modal = document.getElementById('modal-parametros');
        if (modal) modal.style.display = 'none';
    };

    const formParametros = document.getElementById('form-parametros');
    if (formParametros) {
        formParametros.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formParametros);
            const data = {
                radio_despacho: formData.get('radio_despacho'),
                tiempo_max_alerta: formData.get('tiempo_max_alerta'),
                estado_servidor: formData.get('estado_servidor')
            };

            try {
                const response = await fetch('/api/actualizar_parametros', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const resultado = await response.json();
                if (resultado.success) {
                    mostrarToastFlotante(resultado.message, 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    mostrarToastFlotante('⚠️ ' + resultado.message, 'danger');
                }
            } catch (error) {
                console.error('Error al actualizar parámetros:', error);
                mostrarToastFlotante('Error de conexión con el servidor.', 'danger');
            }
        });
    }

    // ==========================================
    // 11. 📜 GESTIÓN DEL MODAL Y FILTRADO DE LOGS DE AUDITORÍA
    // ==========================================
    let todosLosLogsCache = [];

    window.abrirModalLogs = async function() {
        const modal = document.getElementById('modal-historial-logs');
        if (modal) modal.style.display = 'flex';

        try {
            const response = await fetch('/api/obtener_logs');
            const data = await response.json();

            if (data.success) {
                todosLosLogsCache = data.logs;
                renderizarFilasLogs(todosLosLogsCache);
            } else {
                console.error('Error al cargar logs:', data.message);
            }
        } catch (error) {
            console.error('Error en la petición de logs:', error);
        }
    };

    window.cerrarModalLogs = function() {
        const modal = document.getElementById('modal-historial-logs');
        if (modal) modal.style.display = 'none';
    };

    function renderizarFilasLogs(lista) {
        const tbody = document.getElementById('contenedor-filas-logs');
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 15px;">No se encontraron registros con los filtros aplicados.</td></tr>`;
            return;
        }

        tbody.innerHTML = lista.map(log => `
            <tr>
                <td style="font-size: 0.8rem; font-weight: bold; white-space: nowrap;">${log.fecha_hora || 'Sin fecha'}</td>
                <td><strong>${log.usuario}</strong></td>
                <td style="font-size: 0.85rem;">${log.accion}</td>
            </tr>
        `).join('');
    }

    window.filtrarLogsEnVivo = function() {
        const texto = (document.getElementById('filtro-log-texto')?.value || '').toLowerCase().trim();
        const fecha = document.getElementById('filtro-log-fecha')?.value;

        const filtrados = todosLosLogsCache.filter(log => {
            const coincideTexto = log.usuario.toLowerCase().includes(texto) || log.accion.toLowerCase().includes(texto);
            const coincideFecha = !fecha || (log.fecha_hora && log.fecha_hora.startsWith(fecha));
            return coincideTexto && coincideFecha;
        });

        renderizarFilasLogs(filtrados);
    };

    window.limpiarFiltrosLogs = function() {
        const inputTexto = document.getElementById('filtro-log-texto');
        const inputFecha = document.getElementById('filtro-log-fecha');
        if (inputTexto) inputTexto.value = '';
        if (inputFecha) inputFecha.value = '';
        renderizarFilasLogs(todosLosLogsCache);
    };

    // ==========================================
    // 12. 🚑 GESTIÓN DE RECURSOS DISPONIBLES Y NUEVOS REGISTROS
    // ==========================================
    window.abrirModalRecursos = async function() {
        const modal = document.getElementById('modal-gestion-recursos');
        if (modal) modal.style.display = 'flex';
        
        const formContainer = document.getElementById('form-nuevo-recurso-container');
        if (formContainer) formContainer.style.display = 'none';

        try {
            const response = await fetch('/api/obtener_recursos');
            const data = await response.json();

            if (data.success) {
                renderizarTablaRecursos(data.recursos);
            } else {
                console.error('Error al cargar recursos:', data.message);
            }
        } catch (error) {
            console.error('Error de red al obtener recursos:', error);
        }
    };

    window.cerrarModalRecursos = function() {
        const modal = document.getElementById('modal-gestion-recursos');
        if (modal) modal.style.display = 'none';
    };

    window.toggleFormularioNuevoRecurso = function() {
        const container = document.getElementById('form-nuevo-recurso-container');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }
    };

    function renderizarTablaRecursos(recursos) {
        const tbody = document.getElementById('contenedor-filas-recursos');
        if (!tbody) return;

        if (recursos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px;">No hay recursos registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = recursos.map(r => {
            let badgeColor = 'badge-success';
            if (r.estado === 'En servicio') badgeColor = 'badge-warning';
            if (r.estado === 'Fuera de servicio') badgeColor = 'badge-danger';

            return `
                <tr>
                    <td><strong>${r.placa_codigo || ('#' + r.id)}</strong></td>
                    <td>${r.nombre_recurso}</td>
                    <td><code>${r.tipo}</code></td>
                    <td><small>${r.ubicacion_actual}</small></td>
                    <td><span class="badge ${badgeColor}">${r.estado}</span></td>
                    <td>
                        <select onchange="cambiarEstadoRecursos(${r.id}, this.value)" style="padding: 4px 6px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.8rem; background: var(--card-bg); color: var(--text-main);">
                            <option value="Disponible" ${r.estado === 'Disponible' ? 'selected' : ''}>🟢 Disponible</option>
                            <option value="En servicio" ${r.estado === 'En servicio' ? 'selected' : ''}>🟠 En servicio</option>
                            <option value="Fuera de servicio" ${r.estado === 'Fuera de servicio' ? 'selected' : ''}>🔴 Fuera de servicio</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.cambiarEstadoRecursos = async function(recursoId, nuevoEstado) {
        try {
            const response = await fetch('/api/actualizar_estado_recurso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: recursoId, estado: nuevoEstado })
            });
            const resultado = await response.json();

            if (resultado.success) {
                mostrarToastFlotante(resultado.message, 'success');
                setTimeout(() => window.location.reload(), 1200);
            } else {
                mostrarToastFlotante('⚠️ ' + resultado.message, 'danger');
            }
        } catch (error) {
            console.error('Error al actualizar recurso:', error);
            mostrarToastFlotante('Error de conexión con el servidor.', 'danger');
        }
    };

    const formCrearRecurso = document.getElementById('form-crear-recurso');
    if (formCrearRecurso) {
        formCrearRecurso.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formCrearRecurso);
            const data = {
                nombre_recurso: formData.get('nombre_recurso'),
                tipo: formData.get('tipo'),
                placa_codigo: formData.get('placa_codigo'),
                ubicacion_actual: formData.get('ubicacion_actual')
            };

            try {
                const response = await fetch('/api/crear_recurso', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const resultado = await response.json();

                if (resultado.success) {
                    mostrarToastFlotante(resultado.message, 'success');
                    formCrearRecurso.reset();
                    toggleFormularioNuevoRecurso();
                    abrirModalRecursos();
                    setTimeout(() => window.location.reload(), 1200);
                } else {
                    mostrarToastFlotante('⚠️ ' + resultado.message, 'danger');
                }
            } catch (error) {
                console.error('Error al registrar recurso:', error);
                mostrarToastFlotante('Error de conexión con el servidor.', 'danger');
            }
        });
    }
});