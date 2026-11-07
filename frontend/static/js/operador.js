document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. INTERRUPTOR DE MODO OSCURO / CLARO
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

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
    // 3. VISOR GEOGRÁFICO DE EMERGENCIAS Y RECURSOS (LEAFLET DUAL GPS)
    // ==========================================
    const mapElement = document.getElementById('map-operador');
    
    if (mapElement && typeof L !== 'undefined') {
        let operatorLat = 4.7331;
        let operatorLng = -74.2642;

        const map = L.map('map-operador').setView([operatorLat, operatorLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors | SAIMBE 2026'
        }).addTo(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        const emergenciasLayer = L.layerGroup().addTo(map);
        const recursosLayer = L.layerGroup().addTo(map);

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
                html: `<div class="${claseAnimacion}" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">${iconText}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });
        }

        function obtenerIconoReportante() {
            return L.divIcon({
                className: 'custom-reporter-pin',
                html: `<div style="background-color: #7c3aed; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">👤</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -14]
            });
        }

        function obtenerIconoRecurso(tipo, estado) {
            let tipoClean = (tipo || '').toLowerCase();
            let estadoClean = (estado || '').toLowerCase();
            let emoji = '🚗';
            let colorFondo = '#64748b';
            let estiloAdicional = '';

            if (estadoClean.includes('servicio') || estadoClean.includes('atención')) {
                estiloAdicional = 'animation: pulse-ring 1.5s infinite; border: 3px solid #f59e0b !important; box-shadow: 0 0 12px rgba(245, 158, 11, 0.9);';
            }

            if (tipoClean.includes('policía') || tipoClean.includes('policia') || tipoClean.includes('tránsito') || tipoClean.includes('cuadrante')) {
                emoji = '🚓';
                colorFondo = '#2563eb';
            } else if (tipoClean.includes('ambulancia') || tipoClean.includes('salud')) {
                emoji = '🚑';
                colorFondo = '#dc2626';
            } else if (tipoClean.includes('bomber') || tipoClean.includes('extintor')) {
                emoji = '🚒';
                colorFondo = '#ea580c';
            } else if (tipoClean.includes('defensa') || tipoClean.includes('rescate')) {
                emoji = '🚙';
                colorFondo = '#7c3aed';
            }

            return L.divIcon({
                className: 'custom-resource-pin',
                html: `<div style="background-color: ${colorFondo}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); ${estiloAdicional}">${emoji}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });
        }

        window.cargarEmergenciasEnMapa = function() {
            let listaEmergenciasMapeables = [];
            try {
                const filasTabla = document.querySelectorAll('#seccion-emergencias .custom-table tbody tr');
                
                filasTabla.forEach((fila, index) => {
                    const celdas = fila.querySelectorAll('td');
                    if (celdas.length >= 5) {
                        const idText = celdas[0].textContent.trim();
                        const tipo = celdas[1].textContent.trim();
                        const reportadoPor = celdas[2].textContent.trim();
                        const ubicacion = celdas[3] ? celdas[3].textContent.trim() : celdas[2].textContent.trim();
                        
                        const textoFila = fila.textContent.toLowerCase();
                        let estadoActual = "Pendiente";
                        
                        if (textoFila.includes("en proceso")) {
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

                            if (isNaN(emergencyLat) || isNaN(emergencyLng)) {
                                const latMatch = ubicacion.match(/lat[:\s]*([+-]?\d+\.\d+)/i);
                                const lngMatch = ubicacion.match(/(?:lng|lon)[:\s]*([+-]?\d+\.\d+)/i);

                                if (latMatch && lngMatch) {
                                    emergencyLat = parseFloat(latMatch[1]);
                                    emergencyLng = parseFloat(lngMatch[1]);
                                } else {
                                    emergencyLat = operatorLat + ((index % 6) * 0.0018) - 0.004;
                                    emergencyLng = operatorLng + (((index * 3) % 5) * 0.0018) - 0.004;
                                }
                            }

                            let reporterLat = parseFloat(fila.getAttribute('data-reporter-lat') || fila.getAttribute('data-user-lat'));
                            let reporterLng = parseFloat(fila.getAttribute('data-reporter-lng') || fila.getAttribute('data-user-lng'));

                            if (isNaN(reporterLat) || isNaN(reporterLng)) {
                                const repLatMatch = ubicacion.match(/reportante_lat[:\s]*([+-]?\d+\.\d+)/i);
                                const repLngMatch = ubicacion.match(/reportante_lng[:\s]*([+-]?\d+\.\d+)/i);
                                if (repLatMatch && repLngMatch) {
                                    reporterLat = parseFloat(repLatMatch[1]);
                                    reporterLng = parseFloat(repLngMatch[1]);
                                }
                            }

                            listaEmergenciasMapeables.push({
                                uniqueKey: `${idText}_${index}`,
                                id: idText,
                                tipo: tipo,
                                reportadoPor: reportadoPor,
                                ubicacion: ubicacion,
                                estado: estadoActual,
                                emergencyLat: emergencyLat,
                                emergencyLng: emergencyLng,
                                reporterLat: !isNaN(reporterLat) ? reporterLat : null,
                                reporterLng: !isNaN(reporterLng) ? reporterLng : null
                            });
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
                        <p style="margin: 0; font-size: 10px; color: #94a3b8;">GPS: ${em.emergencyLat.toFixed(5)}, ${em.emergencyLng.toFixed(5)}</p>
                    </div>
                `;
                const markerEmergency = L.marker([em.emergencyLat, em.emergencyLng], { icon: obtenerIconoEmergencia(em.estado) })
                    .bindPopup(popupEmergency);
                emergenciasLayer.addLayer(markerEmergency);

                if (em.reporterLat !== null && em.reporterLng !== null) {
                    const popupReporter = `
                        <div style="font-family: system-ui, sans-serif; min-width: 180px;">
                            <h4 style="margin: 0 0 4px 0; color: #7c3aed; font-size: 13px;">👤 Ubicación de la Persona (Reportante)</h4>
                            <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b;">Incidente asociado: <strong>${em.id}</strong></p>
                            <p style="margin: 0; font-size: 10px; color: #94a3b8;">GPS: ${em.reporterLat.toFixed(5)}, ${em.reporterLng.toFixed(5)}</p>
                        </div>
                    `;
                    const markerReporter = L.marker([em.reporterLat, em.reporterLng], { icon: obtenerIconoReportante() })
                        .bindPopup(popupReporter);
                    emergenciasLayer.addLayer(markerReporter);
                }
            });
        };

        window.cargarRecursosEnMapa = function() {
            fetch('/api/obtener_recursos')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.recursos) {
                        recursosLayer.clearLayers();

                        data.recursos.forEach((rec, index) => {
                            const estadoClean = (rec.estado || '').toLowerCase();
                            
                            if (estadoClean.includes('fuera') || estadoClean.includes('mantenimiento') || estadoClean.includes('inactivo')) {
                                return;
                            }

                            let recLat = parseFloat(rec.latitud);
                            let recLng = parseFloat(rec.longitud);

                            if (isNaN(recLat) || isNaN(recLng)) {
                                const angulo = (index * 2 * Math.PI) / data.recursos.length;
                                const radioDesplazamiento = 0.0035;
                                recLat = operatorLat + (radioDesplazamiento * Math.cos(angulo));
                                recLng = operatorLng + (radioDesplazamiento * Math.sin(angulo));
                            }

                            const popupRecurso = `
                                <div style="font-family: system-ui, sans-serif; min-width: 160px;">
                                    <h4 style="margin: 0 0 4px 0; color: #16324f; font-size: 13px;">🛡️ ${rec.nombre_recurso}</h4>
                                    <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b;">Código: <strong>${rec.placa_codigo || 'N/A'}</strong></p>
                                    <p style="margin: 0 0 2px 0; font-size: 11px;">Estado: <strong>${rec.estado}</strong></p>
                                    <p style="margin: 0; font-size: 10px; color: #94a3b8;">Jurisdicción: ${rec.ubicacion_actual || 'Base'}</p>
                                </div>
                            `;

                            const marker = L.marker([recLat, recLng], {
                                icon: obtenerIconoRecurso(rec.tipo, rec.estado)
                            }).bindPopup(popupRecurso);

                            recursosLayer.addLayer(marker);
                        });
                    }
                })
                .catch(err => console.warn('Error al cargar marcadores de recursos en el mapa:', err));
        };

        const locateControl = L.control({ position: 'topright' });

        locateControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.style.backgroundColor = 'var(--card-bg, #ffffff)';
            div.style.cursor = 'pointer';
            div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

            const button = L.DomUtil.create('a', '', div);
            button.href = '#';
            button.title = 'Ir a mi ubicación GPS';
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
                        .bindPopup("<strong>🏢 Central de Operaciones SAIMBE</strong>");

                    map.setView([operatorLat, operatorLng], 13);
                    window.cargarEmergenciasEnMapa();
                    window.cargarRecursosEnMapa();
                },
                (error) => {
                    console.warn("No se pudo obtener la geolocalización:", error.message);
                    L.marker([operatorLat, operatorLng], { icon: userIcon })
                        .addTo(map)
                        .bindPopup("<strong>🏢 Base Central Madrid (Por Defecto)</strong>");
                    window.cargarEmergenciasEnMapa();
                    window.cargarRecursosEnMapa();
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            window.cargarEmergenciasEnMapa();
            window.cargarRecursosEnMapa();
        }

        setInterval(window.cargarRecursosEnMapa, 10000);
    }

    cargarRecursosOperativos();
});

// ==========================================
// 4. FILTRADO RÁPIDO DE LA TABLA DE EMERGENCIAS
// ==========================================
window.filtrarTablaOperador = function(estadoDeseado, botonClickeado) {
    const botones = document.querySelectorAll('.table-filters button');
    botones.forEach(btn => btn.classList.remove('active-filter'));
    if (botonClickeado) {
        botonClickeado.classList.add('active-filter');
    }

    const filas = document.querySelectorAll('.custom-table tbody tr');
    
    filas.forEach(fila => {
        const badgeEstado = fila.querySelector('.badge');
        if (!badgeEstado) return;

        const textoEstado = badgeEstado.textContent.trim();

        if (estadoDeseado === 'todos' || textoEstado.toLowerCase() === estadoDeseado.toLowerCase()) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
};

// ==========================================
// 4.1. FILTRADO RÁPIDO DE LA TABLA DE RECURSOS OPERATIVOS
// ==========================================
window.filtrarRecursosOperador = function(estadoDeseado, botonClickeado) {
    const seccionRecursos = document.getElementById('seccion-recursos');
    if (!seccionRecursos) return;

    const botones = seccionRecursos.querySelectorAll('.table-filters button');
    botones.forEach(btn => btn.classList.remove('active-filter'));
    if (botonClickeado) {
        botonClickeado.classList.add('active-filter');
    }

    const filas = seccionRecursos.querySelectorAll('.custom-table tbody tr');
    
    filas.forEach(fila => {
        const badgeEstado = fila.querySelector('.badge');
        if (!badgeEstado) return;

        const textoEstado = badgeEstado.textContent.trim().toLowerCase();
        const filtroClean = estadoDeseado.toLowerCase().trim();

        if (filtroClean === 'todos') {
            fila.style.display = '';
        } else if (filtroClean === 'disponible' && textoEstado.includes('disponible') && !textoEstado.includes('fuera')) {
            fila.style.display = '';
        } else if (filtroClean === 'servicio' && textoEstado.includes('servicio') && !textoEstado.includes('fuera')) {
            fila.style.display = '';
        } else if (filtroClean === 'fuera' && (textoEstado.includes('fuera') || textoEstado.includes('mantenimiento') || textoEstado.includes('inactivo'))) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
};

// ==========================================
// 5. MÓDULO DE GESTIÓN Y APOYO DE IA
// ==========================================
window.gestionarIncidente = function(id, tipo, gravedad, ubicacion, descripcion) {
    document.getElementById('seccion-geolocalizacion').scrollIntoView({ behavior: 'smooth' });

    const aiBox = document.querySelector('.ai-box');
    if (aiBox) {
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
            } 
            else if (regexHidrocarburos.test(textoAnalizar)) {
                recursoSugerido = "Máquina Bomberos";
                recomendacionOperativa = "Fuga o derrame detectado. Despachar unidad de bomberos para contención de materiales y control de vapores.";
            }
            else if (esLaboral) {
                recursoSugerido = "Ambulancia BÁSICA";
                recomendacionOperativa = "Accidente laboral (AT). Coordinar traslado prehospitalario y activar protocolo con SST y ARL.";
            }
            else if (/acciden|choq|colis|estrell|volcam|atropel|tráns|trans/i.test(textoAnalizar)) {
                recursoSugerido = "Policía + Ambulancia (Tránsito)";
                recomendacionOperativa = "Control vial obligatorio en vía pública y valoración prehospitalaria de heridos.";
            } 
            else if (/herid|lesion|inconcient|desvanec|paros?|infart|sangr|hemorrag|medic|fractur|dolor|piern|braz/i.test(textoAnalizar)) {
                recursoSugerido = "Ambulancia BÁSICA";
                recomendacionOperativa = "Priorizar atención prehospitalaria de urgencia y traslado asistido al centro médico.";
            } 
            else if (/rob|hurt|armas?|pistol|cuchill|apuñal|tirote|balacer|pele|riñ|agres/i.test(textoAnalizar)) {
                recursoSugerido = "Patrulla Policía";
                recomendacionOperativa = "Asegurar la zona, controlar la amenaza y restablecer el orden público.";
            }
        }

        const resumenFactores = factoresDiagnostico(factoresDetectados);

        aiBox.innerHTML = `
            <div class="ai-item">
                <span class="ai-label">Incidente en Revisión:</span>
                <p class="ai-val"><strong>#${id} - ${tipo}</strong></p>
            </div>
            <div class="ai-item">
                <span class="ai-label">Ubicación Registrada:</span>
                <p class="ai-val">${ubicacion}</p>
            </div>
            <div class="ai-item">
                <span class="ai-label">Puntaje de Severidad (IA):</span>
                <p class="ai-val"><strong>${puntajeSeveridad} puntos</strong> ${resumenFactores}</p>
            </div>
            <div class="ai-item">
                <span class="ai-label">Descripción del Ciudadano:</span>
                <p class="ai-val"><em>${descripcion || 'Sin descripción detallada proporcionada.'}</em></p>
            </div>
            <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 8px 0;">
            <div class="ai-item">
                <span class="ai-label">🤖 Recomendación del Sistema:</span>
                <p class="ai-val" style="margin-top: 4px;"><strong>Prioridad Sugerida:</strong> ${prioridadSugerida}</p>
                <p class="ai-val"><strong>Recurso Recomendado:</strong> <span style="color: var(--accent-color); font-weight: bold;">${recursoSugerido}</span></p>
                <p class="ai-val" style="margin-top: 4px; font-size: 0.8rem; color: var(--text-muted);">💡 ${recomendacionOperativa}</p>
            </div>
            <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 8px 0;">
            <div class="ai-item" style="background: rgba(37, 99, 235, 0.05); padding: 10px; border-radius: 6px;">
                <span class="ai-label" style="margin-bottom: 6px; display: block;">⚡ Despacho Rápido e Inteligente:</span>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <select id="select-asignacion-instante-${id}" style="flex: 1; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem; background: var(--card-bg); color: var(--text-main);">
                        <option value="${recursoSugerido}">✨ Asignar sugerido (${recursoSugerido})</option>
                        <option value="1 Ambulancia BÁSICA">🚑 Ambulancia BÁSICA</option>
                        <option value="1 Patrulla Policía">👮 Patrulla Policía</option>
                        <option value="1 Máquina Extintora Bomberos">🚒 Máquina Bomberos</option>
                        <option value="Ambulancia BÁSICA + Bomberos Madrid">🔥🚑 Ambulancia + Bomberos</option>
                        <option value="Patrulla Policía + Ambulancia TAB">🚨👮 Policía + Ambulancia (Tránsito)</option>
                        <option value="Bomberos + Policía + Defensa Civil">⚠️ Operativo Conjunto Total</option>
                    </select>
                    <button type="button" onclick="despacharRecursoInstante('${id}')" class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">
                        🚀 Despachar al Instante
                    </button>
                </div>
            </div>
        `;
    }
};

window.despacharRecursoInstante = function(id) {
    const selectRecurso = document.getElementById(`select-asignacion-instante-${id}`);
    if (!selectRecurso) return;

    const recursoSeleccionado = selectRecurso.value;

    fetch('/api/clasificar_emergencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `emergencia_id=${id}&recurso=${encodeURIComponent(recursoSeleccionado)}&gravedad=Alta`
    })
    .then(res => {
        alert(`✅ Recurso [${recursoSeleccionado}] despachado con éxito para la emergencia #${id}.`);
        location.reload();
    })
    .catch(err => {
        console.error('Error al despachar recurso:', err);
        alert('⚠️ Ocurrió un error al procesar el despacho.');
    });
};

function factoresDiagnostico(factores) {
    if (!factores || factores.length === 0) return "(Sin factores de alerta detectados)";
    return `<span style="font-size: 0.75rem; color: var(--text-muted);">(Factores analizados: ${factores.join(', ')})</span>`;
}

// ==========================================
// 6. CONTROL DE VENTANA EMERGENTE (MODAL)
// ==========================================
window.abrirModalDetalles = function(id, tipo, reportadoPor, ubicacion, gravedad, recurso, estado, descripcion) {
    document.getElementById('modal-id').textContent = `#${id}`;
    document.getElementById('modal-tipo').textContent = tipo;
    document.getElementById('modal-reportado').textContent = reportadoPor;
    document.getElementById('modal-ubicacion').textContent = ubicacion;
    document.getElementById('modal-gravedad').textContent = gravedad;
    document.getElementById('modal-recurso').textContent = recurso;
    document.getElementById('modal-estado').textContent = estado;
    
    let descLimpia = descripcion || 'No hay descripción detallada registrada para este incidente.';
    let infoLaboralHtml = '';

    if (descLimpia.includes("[ACCIDENTE LABORAL")) {
        const finEtiqueta = descLimpia.indexOf("] ");
        if (finEtiqueta !== -1) {
            const extraLab = descLimpia.substring(1, finEtiqueta);
            descLimpia = descLimpia.substring(finEtiqueta + 2);
            infoLaboralHtml = `<div style="background: rgba(37, 99, 235, 0.1); padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #2563eb; font-size: 0.85rem;">
                <strong>💼 Reporte Corporativo / SST:</strong> ${extraLab.replace("ACCIDENTE LABORAL | ", "")}
            </div>`;
        }
    }

    document.getElementById('modal-descripcion').innerHTML = infoLaboralHtml + `<em>${descLimpia}</em>`;

    const modal = document.getElementById('modal-detalle');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.cerrarModalDetalles = function() {
    const modal = document.getElementById('modal-detalle');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal-detalle');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
    const modalRecurso = document.getElementById('modal-gestionar-recurso');
    if (event.target === modalRecurso) {
        modalRecurso.style.display = 'none';
    }
    const modalCrear = document.getElementById('modal-crear-recurso');
    if (event.target === modalCrear) {
        modalCrear.style.display = 'none';
    }
    const modalConfig = document.getElementById('modal-configuracion');
    if (event.target === modalConfig) {
        modalConfig.style.display = 'none';
    }
});

// ==========================================
// 7. VALIDACIÓN VISUAL E INTUITIVA DE CASILLAS REQUERIDAS
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

        setTimeout(() => {
            if (typeof window.cargarEmergenciasEnMapa === 'function') {
                window.cargarEmergenciasEnMapa();
            }
        }, 400);
    }
});

function mostrarAvisoCasilla(selectElement, mensaje) {
    selectElement.style.border = '2px solid #ef4444';
    
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    if (currentTheme === 'dark') {
        selectElement.style.backgroundColor = '#0f172a';
        selectElement.style.color = '#f8fafc';
    } else {
        selectElement.style.backgroundColor = `#ffffff`;
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
// 8. GESTIÓN Y CARGA DINÁMICA DE RECURSOS DESDE LA BD
// ==========================================
function cargarRecursosOperativos() {
    fetch('/api/obtener_recursos')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.recursos) {
                actualizarTablaYResumenRecursos(data.recursos);
            }
        })
        .catch(err => console.warn('Error al cargar recursos operativos:', err));
}

function actualizarTablaYResumenRecursos(recursos) {
    const seccionRecursos = document.getElementById('seccion-recursos');
    if (!seccionRecursos) return;

    const tbody = seccionRecursos.querySelector('.custom-table tbody');
    if (!tbody) return;

    let html = '';
    let saludDisp = 0, saludTotal = 0;
    let bomberosDisp = 0, bomberosTotal = 0;
    let policiaDisp = 0, policiaTotal = 0;

    recursos.forEach(rec => {
        const tipoClean = (rec.tipo || '').toLowerCase();
        const estadoClean = (rec.estado || '').toLowerCase();
        const esDisponible = estadoClean.includes('disponible');

        if (tipoClean.includes('ambulancia') || tipoClean.includes('salud')) {
            saludTotal++;
            if (esDisponible) saludDisp++;
        } else if (tipoClean.includes('bomber') || tipoClean.includes('extintor')) {
            bomberosTotal++;
            if (esDisponible) bomberosDisp++;
        } else if (tipoClean.includes('policía') || tipoClean.includes('policia') || tipoClean.includes('tránsito') || tipoClean.includes('cuadrante')) {
            policiaTotal++;
            if (esDisponible) policiaDisp++;
        }

        let badgeClass = 'badge-success';
        if (estadoClean.includes('servicio') || estadoClean.includes('atención')) {
            badgeClass = 'badge-warning';
        } else if (!esDisponible) {
            badgeClass = 'badge-danger';
        }

        html += `
            <tr>
                <td class="fw-bold">${rec.placa_codigo || 'REC-' + rec.id}</td>
                <td>${rec.nombre_recurso} (${rec.tipo})</td>
                <td><small>${rec.ubicacion_actual || 'Base Central Madrid'}</small></td>
                <td><span class="badge ${badgeClass}">${rec.estado}</span></td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" 
                            onclick="abrirModalCambiarEstadoRecurso('${rec.id}', '${rec.nombre_recurso}', '${rec.tipo}', '${rec.estado}', '${rec.ubicacion_actual || ''}')">
                        ⚙️ Gestionar
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align: center;">No hay recursos registrados.</td></tr>';

    const cardsStat = seccionRecursos.querySelectorAll('.cards-grid .card-stat strong');
    if (cardsStat.length >= 3) {
        if (saludTotal > 0) cardsStat[0].textContent = `${saludDisp} / ${saludTotal}`;
        if (bomberosTotal > 0) cardsStat[1].textContent = `${bomberosDisp} / ${bomberosTotal}`;
        if (policiaTotal > 0) cardsStat[2].textContent = `${policiaDisp} / ${policiaTotal}`;
    }
}

// ==========================================
// 8.1. CONTROL DE MODAL DE GESTIÓN DE RECURSOS
// ==========================================
window.abrirModalCambiarEstadoRecurso = function(id, nombre, tipo, estadoActual, ubicacionActual) {
    document.getElementById('recurso-modal-id').value = id;
    document.getElementById('recurso-modal-titulo').textContent = `${nombre} (${tipo})`;
    
    const selectEstado = document.getElementById('recurso-modal-estado');
    if (selectEstado) {
        selectEstado.value = estadoActual;
    }

    const inputUbicacion = document.getElementById('recurso-modal-ubicacion');
    if (inputUbicacion) {
        inputUbicacion.value = ubicacionActual || '';
    }

    const modal = document.getElementById('modal-gestionar-recurso');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.cerrarModalGestionRecurso = function() {
    const modal = document.getElementById('modal-gestionar-recurso');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.guardarGestionRecurso = function(event) {
    event.preventDefault();

    const id = document.getElementById('recurso-modal-id').value;
    const nuevoEstado = document.getElementById('recurso-modal-estado').value;
    const nuevaUbicacion = document.getElementById('recurso-modal-ubicacion').value;

    fetch('/api/actualizar_estado_recurso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            id: id, 
            estado: nuevoEstado.trim(),
            ubicacion_actual: nuevaUbicacion.trim() 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('✅ ' + data.message);
            cerrarModalGestionRecurso();
            cargarRecursosOperativos();
        } else {
            alert('⚠️ Error: ' + data.message);
        }
    })
    .catch(err => console.error('Error en la petición:', err));
};

// ==========================================
// 8.2. CONTROL DE MODAL PARA REGISTRAR NUEVO RECURSO
// ==========================================
window.abrirModalCrearRecurso = function() {
    const modal = document.getElementById('modal-crear-recurso');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.cerrarModalCrearRecurso = function() {
    const modal = document.getElementById('modal-crear-recurso');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('form-crear-recurso');
    if (form) form.reset();
};

window.guardarNuevoRecursoOperador = function(event) {
    event.preventDefault();

    const nombre_recurso = document.getElementById('nuevo-nombre-recurso').value.trim();
    const tipo = document.getElementById('nuevo-tipo-recurso').value.trim();
    const placa_codigo = document.getElementById('nuevo-placa-recurso').value.trim();
    const ubicacion_actual = document.getElementById('nuevo-ubicacion-recurso').value.trim();

    fetch('/api/crear_recurso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre_recurso: nombre_recurso,
            tipo: tipo,
            placa_codigo: placa_codigo,
            ubicacion_actual: ubicacion_actual
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('✅ ' + data.message);
            cerrarModalCrearRecurso();
            cargarRecursosOperativos();
        } else {
            alert('⚠️ Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error('Error al registrar recurso:', err);
        alert('⚠️ Ocurrió un error al procesar la solicitud.');
    });
};

// ==========================================
// 9. CONTROL DE VENTANA EMERGENTE (MODAL) DE CONFIGURACIÓN
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