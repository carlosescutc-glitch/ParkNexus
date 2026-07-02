/**
 * ==============================================================================
 * ARCHIVO PRINCIPAL DE JAVASCRIPT - PRECISION PARK (PROTOTIPO 3)
 * Reingeniería Integral: Base de Datos Relacional Local (localStorage),
 * Roles Independientes (Usuario vs Admin), Editor Visual de Mapa,
 * Cajones Especiales (Discapacidad/Mantenimiento), Selección Directa de Mapa,
 * Gestión de Vehículos, Billetera con Recargas (Tarjetas, OXXO, SPEI), Recompensas,
 * Botón de Pánico, Normas de Uso y Trazado BFS Corregido en Cuadrícula 4x2 Horizontal.
 * Documentado línea por línea en Español.
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. SISTEMA DE BASE DE DATOS LOCAL PERSISTENTE (JSDB)
     Maneja el almacenamiento y consulta de las tablas del sistema en localStorage.
     ========================================================================== */
  const ParkingDB = {
    // Inicializa las tablas si no existen en localStorage
    init() {
      // 1. Tabla de Usuarios (Soporta roles de Usuario y Administrador con balance)
      if (!localStorage.getItem('parking_db_users')) {
        const defaultUsers = [
          {
            id: 'usr_alex',
            email: 'alex.rivera@example.com',
            password: 'password',
            name: 'Alex',
            paternal: 'Rivera',
            maternal: 'Gomez',
            phone: '5512345678',
            role: 'user',
            level: 1,
            points: 12,
            visits: 12,
            balance: 150.00,
            avatar: ''
          },
          {
            id: 'adm_carlos',
            email: 'carlos@admin.com',
            password: '132457',
            name: 'Carlos',
            paternal: 'Admin',
            maternal: 'Park',
            phone: '1234567890',
            role: 'admin',
            level: 5,
            points: 500,
            visits: 150,
            balance: 0.00,
            avatar: ''
          }
        ];
        localStorage.setItem('parking_db_users', JSON.stringify(defaultUsers));
      }

      // 2. Tabla de Configuración de Cajones (Cargado en el editor visual)
      if (!localStorage.getItem('parking_db_spots')) {
        const initialSpots = [];
        const floors = [1, 2, 3, 4];
        const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        
        // Coordenadas de origen para el diseño horizontal de 4x2 columnas
        const sectionXCoords = {
          'A': 40, 'B': 220, 'E': 420, 'F': 580,
          'C': 40, 'D': 220, 'G': 420, 'H': 580
        };
        const sectionYCoords = {
          'A': 40, 'B': 40, 'E': 40, 'F': 40,
          'C': 300, 'D': 300, 'G': 300, 'H': 300
        };

        floors.forEach(fl => {
          sections.forEach(sec => {
            const secX = sectionXCoords[sec];
            const secY = sectionYCoords[sec];

            for (let i = 1; i <= 10; i++) {
              const col = (i - 1) % 2;
              const row = Math.floor((i - 1) / 2);
              const spotId = `P${fl}-${sec}-${i < 10 ? '0' : ''}${i}`;

              // Configurar cajones especiales iniciales
              let type = 'Disponible';
              if (sec === 'A' && (i === 1 || i === 2)) {
                type = 'Discapacidad'; // Cajón azul
              } else if (sec === 'H' && i === 10) {
                type = 'Fuera de Servicio'; // Cajón gris de mantenimiento
              }

              initialSpots.push({
                id: spotId,
                floor: fl,
                section: sec,
                index: i,
                x: secX + col * 35,
                y: secY + row * 42,
                width: 30,
                height: 38,
                type: type
              });
            }
          });
        });
        localStorage.setItem('parking_db_spots', JSON.stringify(initialSpots));
      }

      // 3. Inicializar tablas relacionales vacías si no existen
      if (!localStorage.getItem('parking_db_tickets')) localStorage.setItem('parking_db_tickets', JSON.stringify([]));
      if (!localStorage.getItem('parking_db_reservations')) localStorage.setItem('parking_db_reservations', JSON.stringify([]));
      if (!localStorage.getItem('parking_db_payments')) localStorage.setItem('parking_db_payments', JSON.stringify([]));
      if (!localStorage.getItem('parking_db_accessHistory')) localStorage.setItem('parking_db_accessHistory', JSON.stringify([]));
      
      // 4. Tabla de Vehículos Registrados
      if (!localStorage.getItem('parking_db_vehicles')) {
        const defaultVehicles = [
          {
            id: 'veh_default',
            userId: 'usr_alex',
            plate: 'YXS-992-B',
            brand: 'Toyota',
            model: 'Prius',
            year: '2022',
            color: 'Blanco',
            owner: 'Alex Rivera',
            type: 'Sedán',
            photo: '',
            isDefault: true
          }
        ];
        localStorage.setItem('parking_db_vehicles', JSON.stringify(defaultVehicles));
      }

      // 5. Tabla de Alertas de Pánico / Emergencia
      if (!localStorage.getItem('parking_db_support_alerts')) {
        localStorage.setItem('parking_db_support_alerts', JSON.stringify([]));
      }

      // 6. Tabla de Cupones de Recompensas
      if (!localStorage.getItem('parking_db_coupons')) {
        const initialCoupons = [
          { id: 'cup_1', name: '1 Hora de Estacionamiento Gratis', pointsCost: 30, code: 'FREE1HR', redeemed: false },
          { id: 'cup_2', name: '10% de Descuento en Recarga de Billetera', pointsCost: 15, code: 'CASH10', redeemed: false },
          { id: 'cup_3', name: 'Lugar Preferente Reservado Semanal', pointsCost: 50, code: 'VIPSPOT', redeemed: false }
        ];
        localStorage.setItem('parking_db_coupons', JSON.stringify(initialCoupons));
      }
      
      // 7. Tabla de Historial de Transacciones de Billetera
      if (!localStorage.getItem('parking_db_wallet_transactions')) {
        const initialTransactions = [
          { id: 'tx_init', userId: 'usr_alex', date: new Date().toISOString(), concept: 'Saldo Inicial de Cortesía', method: 'Sistema', amount: 150.00 }
        ];
        localStorage.setItem('parking_db_wallet_transactions', JSON.stringify(initialTransactions));
      }

      // Asegurar que el usuario administrador carlos@admin.com existe y tiene la clave correcta
      const currentUsers = JSON.parse(localStorage.getItem('parking_db_users') || '[]');
      if (currentUsers.length > 0) {
        const adminIndex = currentUsers.findIndex(u => u.email === 'carlos@admin.com');
        if (adminIndex === -1) {
          currentUsers.push({
            id: 'adm_carlos',
            email: 'carlos@admin.com',
            password: '132457',
            name: 'Carlos',
            paternal: 'Admin',
            maternal: 'Park',
            phone: '1234567890',
            role: 'admin',
            level: 5,
            points: 500,
            visits: 150,
            balance: 0.00,
            avatar: ''
          });
          localStorage.setItem('parking_db_users', JSON.stringify(currentUsers));
        } else {
          currentUsers[adminIndex].password = '132457';
          currentUsers[adminIndex].role = 'admin';
          localStorage.setItem('parking_db_users', JSON.stringify(currentUsers));
        }
      }
    },

    // Obtener tabla parseada
    getTable(name) {
      return JSON.parse(localStorage.getItem(`parking_db_${name}`) || '[]');
    },

    // Guardar tabla serializada
    saveTable(name, data) {
      localStorage.setItem(`parking_db_${name}`, JSON.stringify(data));
    },

    // Insertar un nuevo elemento
    insert(table, item) {
      const data = this.getTable(table);
      item.id = item.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      item.createdAt = item.createdAt || new Date().toISOString();
      data.push(item);
      this.saveTable(table, data);
      return item;
    },

    // Actualizar un elemento por ID
    update(table, id, updates) {
      const data = this.getTable(table);
      const index = data.findIndex(item => item.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
        this.saveTable(table, data);
        return data[index];
      }
      return null;
    },

    // Eliminar un elemento por ID
    delete(table, id) {
      const data = this.getTable(table);
      const filtered = data.filter(item => item.id !== id);
      this.saveTable(table, filtered);
    },

    // Buscar coincidencia simple
    find(table, predicate) {
      return this.getTable(table).find(predicate);
    },

    // Filtrar elementos de tabla
    filter(table, predicate) {
      return this.getTable(table).filter(predicate);
    },

    // Reiniciar base de datos a estado inicial
    clearAll() {
      localStorage.removeItem('parking_db_tickets');
      localStorage.removeItem('parking_db_reservations');
      localStorage.removeItem('parking_db_payments');
      localStorage.removeItem('parking_db_accessHistory');
      localStorage.removeItem('parking_db_vehicles');
      localStorage.removeItem('parking_db_users');
      localStorage.removeItem('parking_db_spots');
      localStorage.removeItem('parking_db_support_alerts');
      localStorage.removeItem('parking_db_coupons');
      localStorage.removeItem('parking_db_wallet_transactions');
      this.init();
    }
  };

  // Inicializar DB
  ParkingDB.init();

  // Lógica de Modo Oscuro (Añadido)
  const btnDarkMode = document.getElementById('btn-dark-mode');
  if (btnDarkMode) {
    // Cargar preferencia persistente
    const savedTheme = localStorage.getItem('parking_theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
      btnDarkMode.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.body.removeAttribute('data-theme');
      btnDarkMode.innerHTML = '<i class="fas fa-moon"></i>';
    }

    btnDarkMode.addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.body.removeAttribute('data-theme');
        btnDarkMode.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('parking_theme', 'light');
        showToast('Modo claro activado');
      } else {
        document.body.setAttribute('data-theme', 'dark');
        btnDarkMode.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('parking_theme', 'dark');
        showToast('Modo oscuro activado');
      }
    });
  }

  /* ==========================================================================
     2. GESTIÓN DE SESIONES Y ACCESO (LOGIN, REGISTRO, RECOVERY)
     ========================================================================== */
  let currentUser = null;
  let currentLoginRole = 'user'; // Rol seleccionado en las pestañas

  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');
  const toastContainer = document.getElementById('toast-container');

  // Pestañas de Selección de Rol
  const tabRoleUser = document.getElementById('tab-role-user');
  const tabRoleAdmin = document.getElementById('tab-role-admin');
  const registerView = document.getElementById('register-view');
  const loginView = document.getElementById('login-view');
  const recoveryView = document.getElementById('recovery-view');

  // Mostrar Notificaciones Flotantes (Toasts)
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'warning') {
      toast.style.background = '#f59e0b';
      toast.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    } else if (type === 'danger') {
      toast.style.background = '#ef4444';
      toast.innerHTML = `<i class="fas fa-times-circle"></i> ${message}`;
    } else {
      toast.style.background = '#22c55e';
      toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    }
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Alternar pestañas de Rol
  tabRoleUser.addEventListener('click', () => {
    currentLoginRole = 'user';
    tabRoleUser.classList.add('active');
    tabRoleAdmin.classList.remove('active');
    document.getElementById('link-show-register').style.display = 'inline';
  });

  tabRoleAdmin.addEventListener('click', () => {
    currentLoginRole = 'admin';
    tabRoleAdmin.classList.add('active');
    tabRoleUser.classList.remove('active');
    // Los administradores no se registran en caliente, deben usar cuentas existentes
    document.getElementById('link-show-register').style.display = 'none';
    if (registerView.style.display === 'block') {
      showLoginView();
    }
  });

  // Mostrar pantallas específicas
  function showRegisterView() {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
    recoveryView.style.display = 'none';
  }

  function showLoginView() {
    loginView.style.display = 'block';
    registerView.style.display = 'none';
    recoveryView.style.display = 'none';
  }

  function showRecoveryView() {
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    recoveryView.style.display = 'block';
  }

  document.getElementById('link-show-register').addEventListener('click', (e) => { e.preventDefault(); showRegisterView(); });
  document.getElementById('link-show-login').addEventListener('click', (e) => { e.preventDefault(); showLoginView(); });
  document.getElementById('link-forgot-pass').addEventListener('click', (e) => { e.preventDefault(); showRecoveryView(); });
  document.getElementById('link-back-login').addEventListener('click', (e) => { e.preventDefault(); showLoginView(); });

  // Mostrar / Ocultar contraseñas
  const btnToggleLoginPass = document.getElementById('btn-toggle-login-pass');
  const loginPassInput = document.getElementById('login-password');
  btnToggleLoginPass.addEventListener('click', () => {
    const type = loginPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
    loginPassInput.setAttribute('type', type);
    btnToggleLoginPass.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
  });

  const btnToggleRegPass = document.getElementById('btn-toggle-reg-pass');
  const regPassInput = document.getElementById('reg-password');
  btnToggleRegPass.addEventListener('click', () => {
    const type = regPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
    regPassInput.setAttribute('type', type);
    btnToggleRegPass.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
  });

  // Procesar Login
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = loginPassInput.value;

    const user = ParkingDB.find('users', u => u.email === email && u.password === pass);

    if (user) {
      currentUser = user;
      currentLoginRole = user.role; // Asignar dinámicamente el rol del usuario autenticado
      sessionStorage.setItem('current_user', JSON.stringify(currentUser));
      loginScreen.style.display = 'none';
      mainApp.style.display = 'flex';
      showToast(`Sesión iniciada correctamente. Bienvenido ${user.name}`);
      
      // Registrar en historial de accesos
      ParkingDB.insert('accessHistory', {
        ticketId: 'SYS',
        type: `Login (${user.role.toUpperCase()})`,
        spotId: 'N/A'
      });

      setupSessionUI();
    } else {
      showToast('Credenciales incorrectas', 'danger');
    }
  });

  // Procesar Registro de Usuario
  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const paternal = document.getElementById('reg-paternal').value.trim();
    const maternal = document.getElementById('reg-maternal').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = regPassInput.value;
    const confirm = document.getElementById('reg-confirm').value;

    if (password !== confirm) {
      showToast('Las contraseñas no coinciden', 'danger');
      return;
    }

    const exists = ParkingDB.find('users', u => u.email === email);
    if (exists) {
      showToast('El correo ya está registrado', 'danger');
      return;
    }

    const newUser = ParkingDB.insert('users', {
      email,
      password,
      name,
      paternal,
      maternal,
      phone,
      role: 'user',
      level: 1,
      points: 0,
      visits: 0,
      balance: 100.00, // Bono inicial de cortesía
      avatar: ''
    });

    // Registrar vehículo predeterminado para el nuevo usuario
    ParkingDB.insert('vehicles', {
      userId: newUser.id,
      plate: 'REG-' + Math.floor(100 + Math.random() * 900),
      brand: 'Sin registrar',
      model: 'Vehículo Demo',
      year: new Date().getFullYear().toString(),
      color: 'Gris',
      owner: `${name} ${paternal}`,
      type: 'Sedán',
      photo: '',
      isDefault: true
    });

    showToast('Registro completado. Se te han abonado $100.00 de bienvenida.');
    showLoginView();
    loginForm.reset();
    registerForm.reset();
  });

  // Recuperación de Contraseña simulada
  const recoveryForm = document.getElementById('recovery-form');
  recoveryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('recovery-email').value.trim();
    const user = ParkingDB.find('users', u => u.email === email);
    
    if (user) {
      showToast(`Código de restablecimiento enviado a ${email}`, 'success');
      alert(`[DEMO] Código de recuperación de clave para ${email}: PK-${Math.floor(1000 + Math.random()*9000)}`);
      showLoginView();
      recoveryForm.reset();
    } else {
      showToast('El correo no se encuentra registrado en el sistema', 'danger');
    }
  });

  // Configuración de UI tras Inicio de Sesión
  function setupSessionUI() {
    if (!currentUser) return;

    // Actualizar datos del perfil
    document.getElementById('display-user-name').innerText = `${currentUser.name} ${currentUser.paternal || ''}`;
    document.getElementById('display-user-email').innerText = currentUser.email;

    // Modificar sidebar según rol
    const menuUser = document.getElementById('menu-user');
    const menuAdmin = document.getElementById('menu-admin');
    const userProfileCard = document.querySelector('.user-profile-card');
    const btnSidebarReserve = document.getElementById('btn-reserve-spot');

    if (currentUser.role === 'admin') {
      menuUser.style.display = 'none';
      menuAdmin.style.display = 'block';
      userProfileCard.style.display = 'none';
      btnSidebarReserve.style.display = 'none';
      
      // Administradores inician en Dashboard Admin
      switchToView('admin-stats');
    } else {
      menuUser.style.display = 'block';
      menuAdmin.style.display = 'none';
      userProfileCard.style.display = 'block';
      btnSidebarReserve.style.display = 'block';

      // Clientes inician en Monitoreo
      switchToView('list');
      updateLevelUI();
      refreshWalletUI();
      refreshVehiclesUI();
      refreshRewardsUI();
    }

    // Inicializar boleto activo si el cliente ya tiene uno en curso
    const activeTkt = ParkingDB.find('tickets', t => t.conductor === currentUser.name && t.status === 'active');
    activeTicket = activeTkt || null;
    refreshActiveTicketUI();
  }

  // Botón para cerrar sesión
  const btnLogoutProfile = document.getElementById('btn-logout-profile');
  btnLogoutProfile.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('current_user');
    document.getElementById('user-profile-modal').style.display = 'none';
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    
    // Detener geolocalización
    stopGeolocation();
    
    // Resetear vistas
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    showLoginView();
    loginForm.reset();
    showToast('Sesión cerrada correctamente');
  });

  // Checar si hay sesión persistente al refrescar
  const savedUser = sessionStorage.getItem('current_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    currentLoginRole = currentUser.role; // Asignar el rol del usuario guardado
    loginScreen.style.display = 'none';
    mainApp.style.display = 'flex';
    setupSessionUI();
  }

  /* ==========================================================================
     3. NIVELES Y EXPERIENCIA (XP)
     ========================================================================== */
  const levels = [
    { level: 1, req: 0 },
    { level: 2, req: 50 },
    { level: 3, req: 100 },
    { level: 4, req: 250 },
    { level: 5, req: 500 }
  ];

  function updateLevelUI() {
    if (!currentUser) return;
    
    // Cargar usuario fresco
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (!user) return;

    let currentLvl = levels[0], nextLvl = levels[1];
    for (let i = 0; i < levels.length; i++) {
      if (user.points >= levels[i].req) {
        currentLvl = levels[i];
        nextLvl = levels[i + 1] || levels[i];
      }
    }

    if (user.level !== currentLvl.level) {
      ParkingDB.update('users', user.id, { level: currentLvl.level });
      showToast(`¡Felicidades! Subiste al nivel ${currentLvl.level}`, 'success');
    }

    // UI del sidebar
    document.getElementById('current-level').innerText = currentLvl.level;
    document.getElementById('current-points').innerText = user.points;
    document.getElementById('next-level-points').innerText = nextLvl.req;
    document.getElementById('visit-count').innerText = user.visits;

    const remaining = Math.max(0, nextLvl.req - user.points);
    if (document.getElementById('points-remaining')) document.getElementById('points-remaining').innerText = remaining;
    if (document.getElementById('next-level-display')) document.getElementById('next-level-display').innerText = nextLvl.level;

    let progress = 100;
    if (nextLvl.level !== currentLvl.level) {
      progress = ((user.points - currentLvl.req) / (nextLvl.req - currentLvl.req)) * 100;
    }
    document.getElementById('level-progress').style.width = `${progress}%`;
  }

  function addPoints(pts) {
    if (!currentUser) return;
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (user) {
      ParkingDB.update('users', user.id, { points: user.points + pts });
      updateLevelUI();
    }
  }

  /* ==========================================================================
     4. RENDERIZADO HORIZONTAL 4x2 DEL CROQUIS
     Alinea las secciones A-H horizontalmente para aprovechar la pantalla en 2D.
     ========================================================================== */
  let currentFloor = 1;
  let selectedSpotId = null;
  let savedCarSpotId = null;
  let activeTicket = null;
  let mapBlocksData = [];
  let mapGenerated = false;

  // Renderizar la lista de sectores para la Vista de Lista
  function initSectorsGrid() {
    const container = document.getElementById('list-view-container');
    if (!container) return;
    container.innerHTML = '';

    // Cargar spots desde la DB relacional
    const spots = ParkingDB.filter('spots', s => s.floor === currentFloor);
    const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    sections.forEach(secName => {
      const secSpots = spots.filter(s => s.section === secName);
      if (secSpots.length === 0) return;

      const sectorDiv = document.createElement('div');
      sectorDiv.className = 'sector';
      sectorDiv.id = `sector-${secName.toLowerCase()}`;

      const headerDiv = document.createElement('div');
      headerDiv.className = 'sector-header';
      headerDiv.innerHTML = `
        <span class="sector-icon" style="background:${secName > 'D' ? '#0b5e40':'#1e3a8a'}">${secName}</span>
        <div class="sector-info">
          <h3>Sección ${secName}</h3>
          <p>Nivel ${currentFloor} • ALTA DENSIDAD</p>
        </div>
      `;

      const gridDiv = document.createElement('div');
      gridDiv.className = 'spots-grid';

      secSpots.forEach(s => {
        const spotDiv = document.createElement('div');
        spotDiv.className = 'spot';
        spotDiv.dataset.id = s.id;

        // Comprobar estado real de ocupación en base a tickets activos
        const activeTkt = ParkingDB.find('tickets', t => t.spotId === s.id && t.status === 'active');

        // Aplicar estilos según estado o tipo de cajón
        if (s.type === 'Fuera de Servicio') {
          spotDiv.classList.add('maintenance');
          spotDiv.innerHTML = `<span class="spot-id">${s.id.substring(3)}</span><span class="spot-status">MANTENIMIENTO</span><i class="fas fa-tools lock-icon" style="display:block;"></i>`;
        } else if (activeTkt) {
          if (activeTkt.vehicleStatus === 'Reservado') {
            spotDiv.classList.add('reserved');
            spotDiv.innerHTML = `<span class="spot-id">${s.id.substring(3)}</span><span class="spot-status">RESERVADO</span><i class="fas fa-calendar-check lock-icon" style="display:block; color:#f59e0b;"></i>`;
          } else if (activeTkt.vehicleStatus === 'Expiración Pendiente') {
            spotDiv.classList.add('reserved');
            spotDiv.style.border = '2px solid #ef4444';
            spotDiv.innerHTML = `<span class="spot-id">${s.id.substring(3)}</span><span class="spot-status" style="color:#ef4444; font-weight:800;">EXPIRADO</span><i class="fas fa-exclamation-triangle lock-icon" style="display:block; color:#ef4444; animation: blink 1s infinite;"></i>`;
          } else {
            spotDiv.classList.add('locked');
            spotDiv.innerHTML = `<span class="spot-id">${s.id.substring(3)}</span><span class="spot-status">OCUPADO</span><i class="fas fa-lock lock-icon" style="display:block;"></i>`;
          }
        } else {
          // Cajón libre: distinguir Estándar vs Discapacidad
          if (s.type === 'Discapacidad') {
            spotDiv.classList.add('handicapped');
            spotDiv.innerHTML = `<span class="spot-id">${s.id.substring(3)}</span><span class="spot-status">DISCAPACIDAD</span><i class="fas fa-wheelchair lock-icon" style="display:block; color:#3b82f6;"></i>`;
          } else {
            spotDiv.innerHTML = `<span class="spot-id">${s.id.substring(3)}</span><span class="spot-status">LIBRE</span><i class="fas fa-lock lock-icon"></i>`;
          }
        }

        // Evento de clic en cajón
        spotDiv.addEventListener('click', () => {
          if (activeTicket) {
            showToast('Ya tienes una reservación activa en curso', 'warning');
            return;
          }
          if (s.type === 'Fuera de Servicio') {
            showToast('Este cajón se encuentra inhabilitado', 'warning');
            return;
          }
          if (activeTkt && activeTkt.conductor !== currentUser.name) {
            showToast('Lugar ocupado por otro vehículo', 'warning');
            return;
          }
          handleSpotClick(s.id);
        });

        gridDiv.appendChild(spotDiv);
      });

      sectorDiv.appendChild(headerDiv);
      sectorDiv.appendChild(gridDiv);
      container.appendChild(sectorDiv);
    });

    // Sincronizar cajón seleccionado visualmente
    if (selectedSpotId) {
      const el = document.querySelector(`.spot[data-id="${selectedSpotId}"]`);
      if (el) {
        el.classList.add('selected');
        const st = el.querySelector('.spot-status');
        if (st) st.innerText = 'ELEGIDO';
      }
    }

    updateStats();
  }

  // Procesar Clic de Selección de Cajón
  function handleSpotClick(spotId) {
    if (activeTicket) return;

    const allSpots = document.querySelectorAll('.spot');

    if (selectedSpotId === spotId) {
      // Doble clic o deselección
      selectedSpotId = null;
      allSpots.forEach(s => s.classList.remove('selected'));
      initSectorsGrid();
      syncMapSelection();
      return;
    }

    selectedSpotId = spotId;
    initSectorsGrid();
    syncMapSelection();
    showToast(`Cajón ${spotId.substring(3)} seleccionado. Pulsa 'Reservar Lugar'`);
  }

  // Recalcular métricas de ocupación para la cabecera
  function updateStats() {
    const spots = ParkingDB.filter('spots', s => s.floor === currentFloor);
    const activeTkts = ParkingDB.filter('tickets', t => t.status === 'active' && t.spotId.startsWith(`P${currentFloor}-`));
    
    const total = spots.length;
    const occupied = activeTkts.length;
    const available = Math.max(0, total - occupied);

    if (document.getElementById('header-available-text')) {
      document.getElementById('header-available-text').innerText = `${available}/${total}`;
    }
    if (document.getElementById('val-available')) document.getElementById('val-available').innerText = available < 10 ? '0' + available : available;
    if (document.getElementById('val-occupied')) document.getElementById('val-occupied').innerText = occupied < 10 ? '0' + occupied : occupied;

    if (document.getElementById('occupancy-fill')) {
      const occupiedPercent = (occupied / total) * 100;
      document.getElementById('occupancy-fill').style.width = `${occupiedPercent}%`;
    }
  }

  /* ==========================================================================
     5. RUTEADO INTELIGENTE BFS SIN COLISIONES (EVITA CAJONES)
     Dibuja la ruta desde la entrada sin atravesar diagonalmente ningún cajón.
     ========================================================================== */
  let pathPoints = [];
  let pathProgress = 0;

  // Generar cuadrícula de bloques en el Canvas Visual Map
  function generateMapGrid() {
    if (mapGenerated) { syncMapSelection(); return; }
    mapGenerated = true;

    const blocksContainer = document.getElementById('map-grid-blocks');
    const svgPath = document.getElementById('map-path-svg');
    if (!blocksContainer || !svgPath) return;

    blocksContainer.innerHTML = '';
    const oldPath = document.getElementById('dynamic-path');
    if (oldPath) oldPath.remove();

    mapBlocksData = [];

    // Cargar spots configurados en base de datos
    const spots = ParkingDB.filter('spots', s => s.floor === currentFloor);

    spots.forEach(s => {
      mapBlocksData.push({
        id: s.id,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        type: s.type
      });
    });

    // Renderizar div absolute para cada bloque
    mapBlocksData.forEach(b => {
      const el = document.createElement('div');
      el.className = `map-block`;
      el.id = `map-block-${b.id}`;
      el.style.left = `${b.x}px`;
      el.style.top = `${b.y}px`;
      el.style.width = `${b.width}px`;
      el.style.height = `${b.height}px`;
      el.innerText = b.id.substring(3);

      // Evento de selección directa en el mapa
      el.addEventListener('click', () => {
        if (activeTicket) {
          showToast('Ya tienes un boleto activo en curso', 'warning');
          return;
        }
        if (b.type === 'Fuera de Servicio') {
          showToast('Este cajón está inhabilitado por mantenimiento', 'warning');
          return;
        }
        
        const activeT = ParkingDB.find('tickets', t => t.spotId === b.id && t.status === 'active');
        if (activeT && activeT.conductor !== currentUser.name) {
          showToast('Cajón ocupado', 'warning');
          return;
        }

        handleSpotClick(b.id);
      });

      blocksContainer.appendChild(el);
    });

    // Añadir línea polilínea SVG
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pathEl.setAttribute('class', 'path-line');
    pathEl.setAttribute('id', 'dynamic-path');
    svgPath.appendChild(pathEl);

    syncMapSelection();
  }

  // Sincronizar colores en el mapa 2D
  function syncMapSelection() {
    if (!mapGenerated) return;

    mapBlocksData.forEach(b => {
      const el = document.getElementById(`map-block-${b.id}`);
      if (!el) return;

      el.classList.remove('flashing', 'reserved', 'occupied', 'available', 'handicapped', 'maintenance');
      el.style.border = '';
      el.style.animation = '';

      const activeTkt = ParkingDB.find('tickets', t => t.spotId === b.id && t.status === 'active');

      if (b.type === 'Fuera de Servicio') {
        el.classList.add('maintenance');
      } else if (activeTkt) {
        if (activeTkt.vehicleStatus === 'Reservado') {
          el.classList.add('reserved');
        } else if (activeTkt.vehicleStatus === 'Expiración Pendiente') {
          el.classList.add('reserved');
          el.style.border = '2px solid #ef4444';
          el.style.animation = 'pulse-border 1s infinite';
        } else {
          el.classList.add('occupied');
        }
      } else {
        if (b.type === 'Discapacidad') {
          el.classList.add('handicapped');
        } else {
          el.classList.add('available');
        }
      }
    });

    const targetId = activeTicket ? activeTicket.spotId : selectedSpotId;

    if (targetId && targetId.startsWith(`P${currentFloor}-`)) {
      const el = document.getElementById(`map-block-${targetId}`);
      if (el && (!activeTicket || activeTicket.spotId !== targetId)) {
        el.classList.add('flashing');
      }

      const targetBlock = mapBlocksData.find(b => b.id === targetId);
      if (targetBlock) {
        calculateIntelligentPathTo(targetBlock.x, targetBlock.y);
      }
    } else {
      pathPoints = [];
      const dynPath = document.getElementById('dynamic-path');
      if (dynPath) dynPath.setAttribute('points', '');
      document.getElementById('player-triangle').style.display = 'none';
    }
  }

  // Trazado de Ruta BFS Evitando las Cajas del Mapa
  function calculateIntelligentPathTo(targetX, targetY) {
    const gridScale = 10;
    const cols = 80; // Ancho de 800px / 10px
    const rows = 55; // Alto de 550px / 10px
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

    // Rellenar obstáculos con un margen de seguridad de 1 celda
    mapBlocksData.forEach(b => {
      const startC = Math.floor(b.x / gridScale);
      const endC = Math.ceil((b.x + b.width) / gridScale);
      const startR = Math.floor(b.y / gridScale);
      const endR = Math.ceil((b.y + b.height) / gridScale);

      for (let r = startR - 1; r <= endR; r++) {
        for (let c = startC - 1; c <= endC; c++) {
          if (r >= 0 && r < rows && c >= 0 && c < cols) {
            grid[r][c] = 1; // 1 = Obstáculo
          }
        }
      }
    });

    // Entrada del mapa ubicada en pasillo inferior (X=400, Y=530)
    const startC = 40;
    const startR = 53;
    grid[startR][startC] = 0; // Garantizar libre el inicio

    // Fin
    const endC = Math.floor((targetX + 15) / gridScale);
    const endR = Math.floor((targetY + 19) / gridScale);

    // Conectar el cajón a los pasillos liberando una columna vertical local
    if (endR >= 0 && endR < rows && endC >= 0 && endC < cols) {
      for (let r = Math.max(0, endR - 3); r <= Math.min(rows - 1, endR + 3); r++) {
        grid[r][endC] = 0;
        if (endC - 1 >= 0) grid[r][endC - 1] = 0;
        if (endC + 1 < cols) grid[r][endC + 1] = 0;
      }
    }

    const queue = [[startR, startC]];
    const cameFrom = new Map();
    cameFrom.set(`${startR},${startC}`, null);
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]]; // Direcciones cardinales

    let found = false;
    while(queue.length > 0) {
      const [r, c] = queue.shift();
      if (r === endR && c === endC) { found = true; break; }

      for (let [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          if (grid[nr][nc] === 0 && !cameFrom.has(`${nr},${nc}`)) {
            queue.push([nr, nc]);
            cameFrom.set(`${nr},${nc}`, [r, c]);
          }
        }
      }
    }

    pathPoints = [];
    if (found) {
      let curr = [endR, endC];
      while(curr) {
        pathPoints.push({ x: curr[1] * gridScale, y: curr[0] * gridScale });
        curr = cameFrom.get(`${curr[0]},${curr[1]}`);
      }
      pathPoints.reverse();
      pathPoints.push({ x: targetX + 15, y: targetY + 19 });
    } else {
      // Ruta de respaldo lineal en caso de bloqueo extremo
      pathPoints = [
        { x: 400, y: 530 },
        { x: 400, y: targetY + 19 },
        { x: targetX + 15, y: targetY + 19 }
      ];
    }

    document.getElementById('player-triangle').style.display = 'flex';
    updatePlayerPosition(0);
  }

  // Interpolar puntos en el trazado
  function getPathPoint(progress) {
    if (pathPoints.length === 0) return { x: 0, y: 0, segmentIndex: 0 };
    let totalLen = 0;
    const segLens = [];

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const dx = pathPoints[i+1].x - pathPoints[i].x;
      const dy = pathPoints[i+1].y - pathPoints[i].y;
      const len = Math.sqrt(dx*dx + dy*dy);
      segLens.push(len);
      totalLen += len;
    }

    if (totalLen === 0) return { ...pathPoints[0], segmentIndex: 0 };

    const targetLen = progress * totalLen;
    let currentLen = 0;

    for (let i = 0; i < segLens.length; i++) {
      if (currentLen + segLens[i] >= targetLen) {
        const segProgress = segLens[i] === 0 ? 0 : (targetLen - currentLen) / segLens[i];
        return {
          x: pathPoints[i].x + (pathPoints[i+1].x - pathPoints[i].x) * segProgress,
          y: pathPoints[i].y + (pathPoints[i+1].y - pathPoints[i].y) * segProgress,
          segmentIndex: i
        };
      }
      currentLen += segLens[i];
    }
    return { ...pathPoints[pathPoints.length - 1], segmentIndex: segLens.length - 1 };
  }

  // Mover el avatar "TÚ"
  function updatePlayerPosition(progress) {
    if (pathPoints.length === 0) return;
    progress = Math.max(0, Math.min(1, progress));
    pathProgress = progress;

    const pos = getPathPoint(progress);

    const playerEl = document.getElementById('player-triangle');
    playerEl.style.left = `${pos.x}px`;
    playerEl.style.top = `${pos.y}px`;

    // Checar proximidad
    checkProximity(pos.x, pos.y);

    const pathEl = document.getElementById('dynamic-path');
    if (pathEl) {
      let pointsStr = `${pos.x},${pos.y} `;
      for (let i = pos.segmentIndex + 1; i < pathPoints.length; i++) {
        pointsStr += `${pathPoints[i].x},${pathPoints[i].y} `;
      }
      pathEl.setAttribute('points', pointsStr.trim());
    }
  }

  // Validar proximidad física al cajón
  function checkProximity(px, py) {
    if (!activeTicket || activeTicket.vehicleStatus !== 'Reservado') return;
    const b = mapBlocksData.find(block => block.id === activeTicket.spotId);
    if (!b) return;

    const centerX = b.x + 15;
    const centerY = b.y + 19;
    const dist = Math.sqrt(Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2));

    if (dist < 20) {
      registerArrival();
    }
  }

  // Registrar arribo del vehículo
  function registerArrival() {
    if (!activeTicket || activeTicket.vehicleStatus !== 'Reservado') return;

    ParkingDB.update('tickets', activeTicket.id, {
      vehicleStatus: 'Estacionado',
      entryTime: new Date().toISOString()
    });

    const res = ParkingDB.find('reservations', r => r.ticketId === activeTicket.id);
    if (res) {
      ParkingDB.update('reservations', res.id, { status: 'Completada' });
    }

    ParkingDB.insert('accessHistory', {
      ticketId: activeTicket.id,
      type: 'Entrada',
      spotId: activeTicket.spotId
    });

    showToast('Vehículo estacionado. Entrada validada digitalmente.');
    
    // Recargar ticket activo
    activeTicket = ParkingDB.find('tickets', t => t.id === activeTicket.id);

    initSectorsGrid();
    if (mapGenerated) generateMapGrid();
    refreshActiveTicketUI();
  }

  /* ==========================================================================
     6. SISTEMA DE CANCELACIÓN DE RESERVACIONES Y REEMBOLSO
     Libera el cajón reservado y devuelve el saldo descontado a la Billetera.
     ========================================================================== */
  const btnCancelReservation = document.getElementById('btn-cancel-reservation');

  btnCancelReservation.addEventListener('click', () => {
    if (!activeTicket) return;
    if (activeTicket.vehicleStatus !== 'Reservado' && activeTicket.vehicleStatus !== 'Expiración Pendiente') {
      showToast('Solo puedes cancelar reservaciones activas', 'warning');
      return;
    }

    const confirmCancel = confirm('¿Estás seguro de que deseas cancelar esta reservación? Se te reembolsará el 100% de la tarifa cobrada.');
    if (!confirmCancel) return;

    // 1. Liberar el ticket poniéndolo como cancelado
    ParkingDB.update('tickets', activeTicket.id, {
      status: 'cancelled',
      vehicleStatus: 'Cancelado',
      exitTime: new Date().toISOString()
    });

    // 2. Marcar reserva como Cancelada
    const res = ParkingDB.find('reservations', r => r.ticketId === activeTicket.id);
    if (res) {
      ParkingDB.update('reservations', res.id, { status: 'Cancelado' });
    }

    // 3. Reembolso económico al monedero del usuario
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (user) {
      const tarifaReembolsada = activeTicket.tarifa;
      const nuevoSaldo = user.balance + tarifaReembolsada;
      ParkingDB.update('users', user.id, { balance: nuevoSaldo });
      
      // Registrar transacción en billetera
      ParkingDB.insert('wallet_transactions', {
        userId: user.id,
        date: new Date().toISOString(),
        concept: `Reembolso por Cancelación Ticket ${activeTicket.code.substring(0, 7)}`,
        method: 'Billetera',
        amount: tarifaReembolsada
      });

      showToast(`Reservación cancelada. Se reembolsaron $${tarifaReembolsada.toFixed(2)} a tu billetera.`);
    }

    // 4. Registrar salida/cancelación en historial
    ParkingDB.insert('accessHistory', {
      ticketId: activeTicket.id,
      type: 'Cancelación',
      spotId: activeTicket.spotId
    });

    // Limpiar variables de reserva
    activeTicket = null;
    selectedSpotId = null;

    // Refrescar layouts
    initSectorsGrid();
    if (mapGenerated) generateMapGrid();
    refreshActiveTicketUI();
    refreshWalletUI();
  });

  /* ==========================================================================
     7. VISTA DE VEHÍCULOS (REGISTRO, EDICIÓN Y SELECCIÓN)
     ========================================================================== */
  const btnAddVehicleModal = document.getElementById('btn-add-vehicle-modal');
  const vehicleModal = document.getElementById('vehicle-modal');
  const btnCloseVehModal = document.getElementById('btn-close-vehicle-modal');
  const btnSaveVehicle = document.getElementById('btn-save-vehicle');

  // Cargar lista de vehículos
  function refreshVehiclesUI() {
    const listGrid = document.getElementById('user-vehicles-list-grid');
    if (!listGrid || !currentUser) return;

    listGrid.innerHTML = '';
    const vehicles = ParkingDB.filter('vehicles', v => v.userId === currentUser.id);

    if (vehicles.length === 0) {
      listGrid.innerHTML = `
        <div class="no-ticket-state" style="grid-column: 1/-1;">
          <i class="fas fa-car empty-icon"></i>
          <p>No tienes vehículos registrados</p>
          <span class="subtext">Registra un vehículo para automatizar tus reservas de cajón.</span>
        </div>
      `;
      return;
    }

    vehicles.forEach(v => {
      const card = document.createElement('div');
      card.className = `vehicle-card ${v.isDefault ? 'default' : ''}`;
      
      const photoPlaceholder = v.photo || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200';

      card.innerHTML = `
        ${v.isDefault ? '<span class="vehicle-badge-default"><i class="fas fa-star"></i> Predeterminado</span>' : ''}
        <div style="display: flex; gap: 1rem; align-items: center;">
          <img src="${photoPlaceholder}" alt="Foto Coche" style="width:70px; height:70px; border-radius:8px; object-fit:cover; border: 1px solid var(--border-color);">
          <div class="vehicle-card-details">
            <h4>${v.brand} ${v.model}</h4>
            <span class="plate-tag">${v.plate}</span>
            <p><strong>Color:</strong> ${v.color}</p>
            <p><strong>Año:</strong> ${v.year}</p>
          </div>
        </div>
        <div class="vehicle-actions">
          <button class="btn-veh-action btn-veh-default btn-set-default" data-id="${v.id}"><i class="fas fa-check"></i> Activar</button>
          <button class="btn-veh-action btn-veh-delete btn-delete-veh" data-id="${v.id}"><i class="fas fa-trash"></i> Eliminar</button>
        </div>
      `;

      listGrid.appendChild(card);
    });

    // Listeners de acción
    document.querySelectorAll('.btn-set-default').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const list = ParkingDB.filter('vehicles', v => v.userId === currentUser.id);
        list.forEach(v => {
          ParkingDB.update('vehicles', v.id, { isDefault: (v.id === id) });
        });
        showToast('Vehículo predeterminado actualizado');
        refreshVehiclesUI();
      });
    });

    document.querySelectorAll('.btn-delete-veh').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        ParkingDB.delete('vehicles', id);
        showToast('Vehículo eliminado', 'warning');
        refreshVehiclesUI();
      });
    });
  }

  btnAddVehicleModal.addEventListener('click', () => {
    document.getElementById('vehicle-edit-id').value = '';
    document.getElementById('veh-plate').value = '';
    document.getElementById('veh-brand').value = '';
    document.getElementById('veh-model').value = '';
    document.getElementById('veh-year').value = new Date().getFullYear();
    document.getElementById('veh-color').value = '';
    document.getElementById('veh-owner').value = `${currentUser.name} ${currentUser.paternal}`;
    document.getElementById('veh-photo').value = '';
    
    document.getElementById('vehicle-modal-title').innerText = 'Registrar Vehículo';
    vehicleModal.style.display = 'flex';
  });

  btnCloseVehModal.addEventListener('click', () => vehicleModal.style.display = 'none');

  btnSaveVehicle.addEventListener('click', () => {
    const plate = document.getElementById('veh-plate').value.trim().toUpperCase();
    const brand = document.getElementById('veh-brand').value.trim();
    const model = document.getElementById('veh-model').value.trim();
    const year = document.getElementById('veh-year').value;
    const color = document.getElementById('veh-color').value.trim();
    const owner = document.getElementById('veh-owner').value.trim();
    const type = document.getElementById('veh-type').value;
    const photo = document.getElementById('veh-photo').value.trim();

    if (!plate || !brand || !model || !year || !color || !owner) {
      showToast('Completa los campos obligatorios del vehículo', 'warning');
      return;
    }

    const currentVehicles = ParkingDB.filter('vehicles', v => v.userId === currentUser.id);
    const isDefault = (currentVehicles.length === 0); // Si es el primero, es por defecto

    ParkingDB.insert('vehicles', {
      userId: currentUser.id,
      plate,
      brand,
      model,
      year,
      color,
      owner,
      type,
      photo,
      isDefault
    });

    showToast('Vehículo guardado correctamente');
    vehicleModal.style.display = 'none';
    refreshVehiclesUI();
  });

  // Autocompletar datos de vehículos en el modal de reservas
  const btnSidebarReserve = document.getElementById('btn-reserve-spot');
  btnSidebarReserve.addEventListener('click', () => {
    if (activeTicket) return;
    if (!selectedSpotId) return;

    // Buscar si el usuario tiene vehículos en su cuenta
    const vehicles = ParkingDB.filter('vehicles', v => v.userId === currentUser.id);
    const defaultVeh = vehicles.find(v => v.isDefault) || vehicles[0];

    if (defaultVeh) {
      document.getElementById('reserve-vehicle-plate').value = defaultVeh.plate;
      document.getElementById('reserve-vehicle-model').value = `${defaultVeh.brand} ${defaultVeh.model}`;
      document.getElementById('reserve-vehicle-color').value = defaultVeh.color;
    }
  });

  /* ==========================================================================
     8. BILLETERA DIGITAL (PREPAGO Y MÉTODOS DE RECARGA: CARD, SPEI, OXXO)
     ========================================================================== */
  const btnWalletRecharge = document.getElementById('btn-wallet-recharge');
  const rechargeModal = document.getElementById('wallet-recharge-modal');
  const btnCloseRechargeModal = document.getElementById('btn-close-recharge-modal');
  const selectRechargeMethod = document.getElementById('recharge-method');
  const btnSubmitRecharge = document.getElementById('btn-submit-recharge');

  function refreshWalletUI() {
    if (!currentUser) return;
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (!user) return;

    document.getElementById('wallet-balance-display').innerText = `$${user.balance.toFixed(2)}`;

    // Transacciones
    const txBody = document.getElementById('wallet-transactions-body');
    txBody.innerHTML = '';
    const txList = ParkingDB.filter('wallet_transactions', tx => tx.userId === currentUser.id);

    if (txList.length === 0) {
      txBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay transacciones aún.</td></tr>';
      return;
    }

    txList.reverse().forEach(tx => {
      const date = new Date(tx.date).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' });
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${date}</td>
        <td>${tx.concept}</td>
        <td><span class="plate-tag" style="font-size:0.65rem;">${tx.method}</span></td>
        <td style="color:${tx.amount > 0 ? '#10b981':'#ef4444'}; font-weight:700;">
          ${tx.amount > 0 ? '+' : ''}$${tx.amount.toFixed(2)}
        </td>
      `;
      txBody.appendChild(row);
    });
  }

  btnWalletRecharge.addEventListener('click', () => {
    rechargeModal.style.display = 'flex';
  });

  btnCloseRechargeModal.addEventListener('click', () => rechargeModal.style.display = 'none');

  // Alternar paneles informativos del método de recarga
  selectRechargeMethod.addEventListener('change', () => {
    const val = selectRechargeMethod.value;
    document.getElementById('recharge-card-details').style.display = val === 'Tarjeta' ? 'block' : 'none';
    document.getElementById('recharge-spei-details').style.display = val === 'SPEI' ? 'block' : 'none';
    document.getElementById('recharge-oxxo-details').style.display = val === 'OXXO' ? 'block' : 'none';
  });

  // Enviar recarga
  btnSubmitRecharge.addEventListener('click', () => {
    const amountVal = parseFloat(document.getElementById('recharge-amount').value);
    const method = selectRechargeMethod.value;

    if (isNaN(amountVal) || amountVal < 10) {
      showToast('El monto mínimo a recargar es $10.00 MXN', 'warning');
      return;
    }

    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (user) {
      const nuevoSaldo = user.balance + amountVal;
      ParkingDB.update('users', user.id, { balance: nuevoSaldo });
      
      ParkingDB.insert('wallet_transactions', {
        userId: user.id,
        date: new Date().toISOString(),
        concept: 'Recarga de Saldo',
        method: method,
        amount: amountVal
      });

      showToast(`Recarga procesada. Se acreditaron $${amountVal.toFixed(2)} a tu Billetera.`);
      rechargeModal.style.display = 'none';
      refreshWalletUI();
    }
  });

  /* ==========================================================================
     9. SISTEMA DE RECOMPENSAS (CANJE DE CUPONES POR PUNTOS)
     ========================================================================== */
  function refreshRewardsUI() {
    if (!currentUser) return;
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (!user) return;

    // Barra de nivel del panel
    document.getElementById('rewards-level-badge').innerText = user.level;
    document.getElementById('rewards-points-display').innerText = `${user.points} Puntos`;
    document.getElementById('rewards-points-current').innerText = user.points;

    let currentLvl = levels[0], nextLvl = levels[1];
    for (let i = 0; i < levels.length; i++) {
      if (user.points >= levels[i].req) {
        currentLvl = levels[i];
        nextLvl = levels[i + 1] || levels[i];
      }
    }

    document.getElementById('rewards-next-level').innerText = nextLvl.level;
    document.getElementById('rewards-points-needed').innerText = nextLvl.req;

    let progress = 100;
    if (nextLvl.level !== currentLvl.level) {
      progress = ((user.points - currentLvl.req) / (nextLvl.req - currentLvl.req)) * 100;
    }
    document.getElementById('rewards-progress-fill').style.width = `${progress}%`;

    // Renderizar cupones de premios
    const couponsContainer = document.getElementById('coupons-list-container');
    couponsContainer.innerHTML = '';
    const coupons = ParkingDB.getTable('coupons');

    coupons.forEach(c => {
      const card = document.createElement('div');
      card.className = 'coupon-card';
      
      const isAffordable = user.points >= c.pointsCost;

      card.innerHTML = `
        <div class="coupon-info">
          <h5>${c.name}</h5>
          <p><i class="fas fa-gem" style="color:#10b981;"></i> Costo: <strong>${c.pointsCost} Puntos</strong></p>
        </div>
        <button class="btn-coupon-redeem btn-redeem-coupon ${c.redeemed ? 'redeemed' : ''}" data-id="${c.id}" ${c.redeemed || !isAffordable ? 'disabled':''}>
          ${c.redeemed ? 'Canjeado' : `Canjear (${c.pointsCost} pts)`}
        </button>
      `;

      couponsContainer.appendChild(card);
    });

    // Eventos canjes
    document.querySelectorAll('.btn-redeem-coupon').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const coupon = ParkingDB.find('coupons', cp => cp.id === id);
        
        if (coupon && user.points >= coupon.pointsCost) {
          const nuevosPuntos = user.points - coupon.pointsCost;
          ParkingDB.update('users', user.id, { points: nuevosPuntos });
          ParkingDB.update('coupons', id, { redeemed: true });
          
          showToast(`¡Cupón canjeado con éxito! Código: ${coupon.code}`);
          refreshRewardsUI();
          updateLevelUI();
        }
      });
    });
  }

  /* ==========================================================================
     10. AYUDA Y SOPORTE (BOTÓN DE PÁNICO Y ENVÍO DE UBICACIÓN AL ADMIN)
     ========================================================================== */
  const btnEmergencyPanic = document.getElementById('btn-emergency-panic');
  btnEmergencyPanic.addEventListener('click', () => {
    if (!currentUser) return;

    let spotId = 'Ninguno';
    let floorNum = currentFloor;

    if (activeTicket) {
      spotId = activeTicket.spotId;
      const fm = spotId.match(/^P(\d)-/);
      if (fm) floorNum = fm[1];
    }

    // Registrar la alerta en la base de datos de soporte
    const alertItem = ParkingDB.insert('support_alerts', {
      userId: currentUser.id,
      name: `${currentUser.name} ${currentUser.paternal}`,
      email: currentUser.email,
      phone: currentUser.phone,
      floor: floorNum,
      spotId: spotId,
      status: 'Activa'
    });

    showToast('¡ALERTA DE EMERGENCIA ENVIADA! Un oficial va en camino a tu ubicación.', 'warning');

    // Registrar en auditoría
    ParkingDB.insert('accessHistory', {
      ticketId: alertItem.id,
      type: 'ALERTA DE EMERGENCIA',
      spotId: spotId
    });
  });

  /* ==========================================================================
     11. PANEL DEL ADMINISTRADOR (KPI, EDICIÓN Y GESTIÓN)
     ========================================================================== */
  const btnEditorAddSpot = document.getElementById('btn-editor-add-spot');
  const btnEditorSave = document.getElementById('btn-editor-save');
  const btnEditorDelete = document.getElementById('btn-editor-delete');

  const editorSelectedForm = document.getElementById('editor-selected-form');
  const editorNoSelected = document.getElementById('editor-no-selected');
  let selectedEditorSpotId = null;

  // Renderizar mapa visual interactivo y editable (con soporte de arrastrar y soltar)
  function generateEditorMapGrid() {
    const blocksContainer = document.getElementById('editor-map-grid-blocks');
    if (!blocksContainer) return;

    blocksContainer.innerHTML = '';
    const spots = ParkingDB.filter('spots', s => s.floor === currentFloor);

    spots.forEach(s => {
      const el = document.createElement('div');
      el.className = `map-block editor-spot-block`;
      el.id = `editor-map-block-${s.id}`;
      el.style.left = `${s.x}px`;
      el.style.top = `${s.y}px`;
      el.style.width = `${s.width}px`;
      el.style.height = `${s.height}px`;
      el.style.cursor = 'move';
      el.innerText = s.id.substring(3);

      // Cargar estilo según tipo
      if (s.type === 'Fuera de Servicio') el.classList.add('maintenance');
      else if (s.type === 'Discapacidad') el.classList.add('handicapped');
      else el.classList.add('available');

      if (selectedEditorSpotId === s.id) {
        el.classList.add('selected-in-editor');
      }

      // Soporte para arrastrar y soltar en tiempo real
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = s.x, initialTop = s.y;

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Alinear a cuadrícula de 5px (Snapping)
        const snap = 5;
        let newX = Math.round((initialLeft + dx) / snap) * snap;
        let newY = Math.round((initialTop + dy) / snap) * snap;

        // Limites del área de scroll
        newX = Math.max(0, Math.min(760, newX));
        newY = Math.max(0, Math.min(500, newY));

        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;

        document.getElementById('edit-spot-x').value = newX;
        document.getElementById('edit-spot-y').value = newY;
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;

        const finalX = parseInt(document.getElementById('edit-spot-x').value);
        const finalY = parseInt(document.getElementById('edit-spot-y').value);

        // Guardar la nueva posición en la DB
        const spot = ParkingDB.find('spots', sp => sp.id === s.id);
        if (spot) {
          ParkingDB.update('spots', spot.id, { x: finalX, y: finalY });
          s.x = finalX;
          s.y = finalY;
          mapGenerated = false; // Forzar regeneración del croquis principal
        }

        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      el.addEventListener('mousedown', (e) => {
        selectedEditorSpotId = s.id;

        // Cargar datos en el formulario del panel lateral del editor
        document.getElementById('edit-spot-name').value = s.id;
        document.getElementById('edit-spot-type').value = s.type;
        document.getElementById('edit-spot-x').value = s.x;
        document.getElementById('edit-spot-y').value = s.y;
        document.getElementById('edit-spot-w').value = s.width;
        document.getElementById('edit-spot-h').value = s.height;

        editorNoSelected.style.display = 'none';
        editorSelectedForm.style.display = 'block';

        // Re-generar editor para reflejar borde dorado de selección
        document.querySelectorAll('.editor-spot-block').forEach(b => b.classList.remove('selected-in-editor'));
        el.classList.add('selected-in-editor');

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = s.x;
        initialTop = s.y;

        e.preventDefault();
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      // Clic sencillo de selección alternativa (para móviles o clics sin arrastre)
      el.addEventListener('click', (e) => {
        if (e.defaultPrevented) return;
        selectedEditorSpotId = s.id;
        document.getElementById('edit-spot-name').value = s.id;
        document.getElementById('edit-spot-type').value = s.type;
        document.getElementById('edit-spot-x').value = s.x;
        document.getElementById('edit-spot-y').value = s.y;
        document.getElementById('edit-spot-w').value = s.width;
        document.getElementById('edit-spot-h').value = s.height;

        editorNoSelected.style.display = 'none';
        editorSelectedForm.style.display = 'block';
        document.querySelectorAll('.editor-spot-block').forEach(b => b.classList.remove('selected-in-editor'));
        el.classList.add('selected-in-editor');
      });

      blocksContainer.appendChild(el);
    });
  }

  // Guardar cambios sobre un cajón del editor
  btnEditorSave.addEventListener('click', () => {
    if (!selectedEditorSpotId) return;

    const newId = document.getElementById('edit-spot-name').value.trim();
    const type = document.getElementById('edit-spot-type').value;
    const x = parseInt(document.getElementById('edit-spot-x').value);
    const y = parseInt(document.getElementById('edit-spot-y').value);
    const w = parseInt(document.getElementById('edit-spot-w').value);
    const h = parseInt(document.getElementById('edit-spot-h').value);

    const spot = ParkingDB.find('spots', s => s.id === selectedEditorSpotId);

    if (spot) {
      ParkingDB.update('spots', spot.id, {
        id: newId, // Actualizar nombre identificador
        type,
        x, y,
        width: w,
        height: h
      });

      showToast('Cajón de estacionamiento actualizado correctamente.');
      selectedEditorSpotId = newId;

      // Actualizar croquis
      mapGenerated = false;
      initSectorsGrid();
      generateEditorMapGrid();
    }
  });

  // Eliminar cajón del editor
  btnEditorDelete.addEventListener('click', () => {
    if (!selectedEditorSpotId) return;

    const confirmDel = confirm(`¿Estás seguro de que deseas eliminar permanentemente el cajón ${selectedEditorSpotId}?`);
    if (!confirmDel) return;

    const spot = ParkingDB.find('spots', s => s.id === selectedEditorSpotId);
    if (spot) {
      ParkingDB.delete('spots', spot.id);
      showToast('Cajón de estacionamiento eliminado permanentemente', 'warning');
      selectedEditorSpotId = null;

      editorSelectedForm.style.display = 'none';
      editorNoSelected.style.display = 'block';

      mapGenerated = false;
      initSectorsGrid();
      generateEditorMapGrid();
    }
  });

  // Agregar cajón nuevo al editor
  btnEditorAddSpot.addEventListener('click', () => {
    const randId = `P${currentFloor}-N-${Math.floor(10 + Math.random() * 90)}`;
    
    // Crear el cajón en la DB
    ParkingDB.insert('spots', {
      id: randId,
      floor: currentFloor,
      section: 'N',
      index: 99,
      x: 100,
      y: 100,
      width: 30,
      height: 38,
      type: 'Disponible'
    });

    showToast('Nuevo cajón insertado en X=100 Y=100. Edita sus coordenadas.');
    selectedEditorSpotId = randId;

    document.getElementById('edit-spot-name').value = randId;
    document.getElementById('edit-spot-type').value = 'Disponible';
    document.getElementById('edit-spot-x').value = 100;
    document.getElementById('edit-spot-y').value = 100;
    document.getElementById('edit-spot-w').value = 30;
    document.getElementById('edit-spot-h').value = 38;

    editorNoSelected.style.display = 'none';
    editorSelectedForm.style.display = 'block';

    mapGenerated = false;
    initSectorsGrid();
    generateEditorMapGrid();
  });

  // Tablas del Administrador
  function refreshAdminTables() {
    // 1. Cargar Usuarios
    const usersBody = document.getElementById('admin-users-table-body');
    if (usersBody) {
      usersBody.innerHTML = '';
      const list = ParkingDB.getTable('users');
      list.forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${u.name} ${u.paternal || ''}</strong></td>
          <td>${u.email}</td>
          <td>${u.phone || 'N/A'}</td>
          <td><span class="plate-tag" style="background:${u.role === 'admin' ? '#ef4444':'#10b981'}; color:white;">${u.role.toUpperCase()}</span></td>
          <td>Nivel ${u.level} (${u.points} XP)</td>
          <td>
            <button class="btn-change-photo btn-change-role" data-id="${u.id}" style="padding:4px 8px; font-size:0.75rem;"><i class="fas fa-user-tag"></i> Cambiar Rol</button>
          </td>
        `;
        usersBody.appendChild(row);
      });

      // Listener de cambio de rol
      document.querySelectorAll('.btn-change-role').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const user = ParkingDB.find('users', us => us.id === id);
          if (user) {
            const nuevoRol = user.role === 'admin' ? 'user' : 'admin';
            ParkingDB.update('users', user.id, { role: nuevoRol });
            showToast(`Rol de ${user.name} modificado a ${nuevoRol}`);
            refreshAdminTables();
          }
        });
      });
    }

    // 2. Cargar Reservaciones Activas
    const resBody = document.getElementById('admin-reservations-table-body');
    if (resBody) {
      resBody.innerHTML = '';
      const reservations = ParkingDB.getTable('reservations');
      if (reservations.length === 0) {
        resBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay reservas registradas.</td></tr>';
      } else {
        reservations.reverse().forEach(r => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${r.username}</strong></td>
            <td><strong>${r.spotId}</strong></td>
            <td>${new Date(r.startTime).toLocaleTimeString()}</td>
            <td><span class="plate-tag" style="background:#f59e0b; color:black;">${r.status}</span></td>
            <td>${r.status === 'Activa' ? `${r.remainingSeconds}s` : '--'}</td>
          `;
          resBody.appendChild(row);
        });
      }
    }

    // 3. Cargar Auditoría de Pagos
    const payBody = document.getElementById('admin-payments-table-body');
    if (payBody) {
      payBody.innerHTML = '';
      const payments = ParkingDB.getTable('payments');
      if (payments.length === 0) {
        payBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Ningún pago registrado aún.</td></tr>';
      } else {
        payments.reverse().forEach(p => {
          const row = document.createElement('tr');
          const tkt = ParkingDB.find('tickets', t => t.id === p.ticketId);
          row.innerHTML = `
            <td>TX-${p.id.toUpperCase()}</td>
            <td><strong style="font-family:monospace;">${tkt ? tkt.code : 'EXPIRED'}</strong></td>
            <td><span class="plate-tag">${p.metodoPago}</span></td>
            <td>${new Date(p.timestamp).toLocaleString()}</td>
            <td style="font-weight:700; color:#10b981;">$${p.monto.toFixed(2)}</td>
          `;
          payBody.appendChild(row);
        });
      }
    }

    // Mostrar Banner de Alerta de Emergencia activa en el Panel Admin
    const activeAlerts = ParkingDB.filter('support_alerts', a => a.status === 'Activa');
    const existingBanner = document.getElementById('admin-panic-alert-banner');
    if (existingBanner) existingBanner.remove();

    if (activeAlerts.length > 0) {
      const banner = document.createElement('div');
      banner.id = 'admin-panic-alert-banner';
      banner.style.cssText = `
        background: #ef4444;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 2rem;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: blink 1.5s infinite;
      `;
      
      const lastAlert = activeAlerts[activeAlerts.length - 1];
      banner.innerHTML = `
        <div>
          <i class="fas fa-exclamation-triangle"></i> ¡EMERGENCIA ACTIVA! Conductor ${lastAlert.name} solicita apoyo en el Cajón ${lastAlert.spotId} (Piso ${lastAlert.floor}). Tel: ${lastAlert.phone}
        </div>
        <button id="btn-resolve-panic" style="background:white; color:#ef4444; border:none; padding:0.4rem 0.8rem; border-radius:6px; font-weight:800; cursor:pointer;">Atendido</button>
      `;

      const dashArea = document.querySelector('#admin-view-container .admin-header');
      if (dashArea) dashArea.after(banner);

      document.getElementById('btn-resolve-panic').addEventListener('click', () => {
        activeAlerts.forEach(al => {
          ParkingDB.update('support_alerts', al.id, { status: 'Atendido' });
        });
        showToast('Alertas marcadas como atendidas.');
        refreshAdminTables();
      });
    }
  }

  /* ==========================================================================
     12. NAVEGACIÓN GENERAL ENTRE VISTAS Y REDIRECCIÓN DE ROLES
     ========================================================================== */
  const listView = document.getElementById('list-view-container');
  const visualMap = document.getElementById('visual-map-container');
  const activityView = document.getElementById('activity-view-container');
  const ticketsView = document.getElementById('tickets-view-container');
  const adminView = document.getElementById('admin-view-container');
  const dashboardHeader = document.getElementById('dashboard-header');
  const floorSelector = document.getElementById('floor-selector-container');

  const vehiclesView = document.getElementById('vehicles-view-container');
  const walletView = document.getElementById('wallet-view-container');
  const rewardsView = document.getElementById('rewards-view-container');
  const policiesView = document.getElementById('policies-view-container');
  const supportView = document.getElementById('support-view-container');
  const adminEditorView = document.getElementById('admin-editor-container');
  const adminUsersView = document.getElementById('admin-users-container');
  const adminReservationsView = document.getElementById('admin-reservations-container');
  const adminPaymentsView = document.getElementById('admin-payments-container');

  let currentView = 'list';

  // Cambiar contenedores visibles
  function switchToView(viewName) {
    currentView = viewName;

    // Ocultar todas las vistas
    listView.style.display = 'none';
    visualMap.style.display = 'none';
    activityView.style.display = 'none';
    ticketsView.style.display = 'none';
    adminView.style.display = 'none';
    dashboardHeader.style.display = 'none';
    floorSelector.style.display = 'none';

    vehiclesView.style.display = 'none';
    walletView.style.display = 'none';
    rewardsView.style.display = 'none';
    policiesView.style.display = 'none';
    supportView.style.display = 'none';
    adminEditorView.style.display = 'none';
    adminUsersView.style.display = 'none';
    adminReservationsView.style.display = 'none';
    adminPaymentsView.style.display = 'none';

    // Desmarcar elementos activos del sidebar
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));

    // Mostrar contenedor según ID
    switch(viewName) {
      case 'list':
        listView.style.display = 'grid';
        dashboardHeader.style.display = 'block';
        floorSelector.style.display = 'flex';
        document.getElementById('nav-sector-status').classList.add('active');
        initSectorsGrid();
        stopGeolocation();
        break;
      case 'map':
        visualMap.style.display = 'block';
        dashboardHeader.style.display = 'block';
        floorSelector.style.display = 'flex';
        generateMapGrid();
        startGeolocation();
        break;
      case 'tickets':
        ticketsView.style.display = 'block';
        document.getElementById('nav-tickets').classList.add('active');
        populateSimSpotDropdown();
        refreshActiveTicketUI();
        refreshTicketsHistoryTable();
        stopGeolocation();
        break;
      case 'activity':
        activityView.style.display = 'block';
        document.getElementById('nav-mi-actividad').classList.add('active');
        renderHistoryTable();
        stopGeolocation();
        break;
      case 'vehicles':
        vehiclesView.style.display = 'block';
        document.getElementById('nav-vehicles').classList.add('active');
        refreshVehiclesUI();
        stopGeolocation();
        break;
      case 'wallet':
        walletView.style.display = 'block';
        document.getElementById('nav-wallet').classList.add('active');
        refreshWalletUI();
        stopGeolocation();
        break;
      case 'rewards':
        rewardsView.style.display = 'block';
        document.getElementById('nav-rewards').classList.add('active');
        refreshRewardsUI();
        stopGeolocation();
        break;
      case 'policies':
        policiesView.style.display = 'block';
        document.getElementById('nav-policies').classList.add('active');
        stopGeolocation();
        break;
      case 'support':
        supportView.style.display = 'block';
        document.getElementById('nav-support').classList.add('active');
        stopGeolocation();
        break;
      
      // Vistas de Administrador
      case 'admin-editor':
        adminEditorView.style.display = 'block';
        floorSelector.style.display = 'flex';
        document.getElementById('nav-admin-editor').classList.add('active');
        generateEditorMapGrid();
        stopGeolocation();
        break;
      case 'admin-users':
        adminUsersView.style.display = 'block';
        document.getElementById('nav-admin-users').classList.add('active');
        refreshAdminTables();
        stopGeolocation();
        break;
      case 'admin-reservations':
        adminReservationsView.style.display = 'block';
        document.getElementById('nav-admin-reservations').classList.add('active');
        refreshAdminTables();
        stopGeolocation();
        break;
      case 'admin-payments':
        adminPaymentsView.style.display = 'block';
        document.getElementById('nav-admin-payments').classList.add('active');
        refreshAdminTables();
        stopGeolocation();
        break;
      case 'admin-stats':
        adminView.style.display = 'block';
        document.getElementById('nav-admin-stats').classList.add('active');
        loadAdminDashboard();
        stopGeolocation();
        break;
    }
  }

  // Clics de Navegación Sidebar Cliente
  document.getElementById('nav-sector-status').addEventListener('click', () => switchToView('list'));
  document.getElementById('nav-tickets').addEventListener('click', () => switchToView('tickets'));
  document.getElementById('nav-mi-actividad').addEventListener('click', () => switchToView('activity'));
  document.getElementById('nav-vehicles').addEventListener('click', () => switchToView('vehicles'));
  document.getElementById('nav-wallet').addEventListener('click', () => switchToView('wallet'));
  document.getElementById('nav-rewards').addEventListener('click', () => switchToView('rewards'));
  document.getElementById('nav-policies').addEventListener('click', () => switchToView('policies'));
  document.getElementById('nav-support').addEventListener('click', () => switchToView('support'));

  // Clics de Navegación Sidebar Administrador
  document.getElementById('nav-admin-editor').addEventListener('click', () => switchToView('admin-editor'));
  document.getElementById('nav-admin-users').addEventListener('click', () => switchToView('admin-users'));
  document.getElementById('nav-admin-reservations').addEventListener('click', () => switchToView('admin-reservations'));
  document.getElementById('nav-admin-payments').addEventListener('click', () => switchToView('admin-payments'));
  document.getElementById('nav-admin-stats').addEventListener('click', () => switchToView('admin-stats'));

  // Botón flotante verde de Mapa
  const btnToggleMap = document.getElementById('btn-toggle-map');
  btnToggleMap.addEventListener('click', () => {
    if (currentView !== 'map') switchToView('map');
    else switchToView('list');
  });

  // Selector de Piso (Tabs superiores)
  document.querySelectorAll('.floor-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.floor-tab').forEach(t => t.classList.remove('active'));
      currentFloor = parseInt(this.dataset.floor);

      // Activar tabs correspondientes
      document.querySelectorAll(`.floor-tab[data-floor="${currentFloor}"]`).forEach(t => t.classList.add('active'));

      // Título cabecera
      const mapTitle = document.getElementById('map-floor-title');
      const mapSubtitle = document.getElementById('map-floor-subtitle');
      if (mapTitle) mapTitle.innerText = `NORTH WING DECK - PISO ${currentFloor}`;
      if (mapSubtitle) mapSubtitle.innerText = `LEVEL 0${currentFloor} • ALTA DENSIDAD`;

      showToast(`Visualizando Piso ${currentFloor}`);

      // Actualizar grids
      initSectorsGrid();
      if (currentView === 'map') {
        mapGenerated = false;
        generateMapGrid();
      } else if (currentView === 'admin-editor') {
        generateEditorMapGrid();
      }
    });
  });

  // Botón de Perfil de Cabecera
  document.getElementById('btn-user-modal').addEventListener('click', () => {
    const userModal = document.getElementById('user-profile-modal');
    if (!currentUser) return;

    // Cargar apellidos y teléfono del localStorage fresco
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (user) {
      document.getElementById('input-edit-name').value = user.name;
      document.getElementById('input-edit-paternal').value = user.paternal || '';
      document.getElementById('input-edit-maternal').value = user.maternal || '';
      document.getElementById('input-edit-phone').value = user.phone || '';
      document.getElementById('input-edit-email').value = user.email;
    }
    userModal.style.display = 'flex';
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('user-profile-modal').style.display = 'none';
  });

  // Guardar datos del Perfil
  document.getElementById('btn-save-profile').addEventListener('click', () => {
    if (!currentUser) return;

    const name = document.getElementById('input-edit-name').value.trim();
    const paternal = document.getElementById('input-edit-paternal').value.trim();
    const maternal = document.getElementById('input-edit-maternal').value.trim();
    const phone = document.getElementById('input-edit-phone').value.trim();
    const email = document.getElementById('input-edit-email').value.trim();

    if (!name || !email) {
      showToast('Nombre y correo son obligatorios', 'warning');
      return;
    }

    ParkingDB.update('users', currentUser.id, {
      name, paternal, maternal, phone, email
    });

    // Actualizar sesión actual
    currentUser = ParkingDB.find('users', u => u.id === currentUser.id);
    sessionStorage.setItem('current_user', JSON.stringify(currentUser));

    setupSessionUI();
    document.getElementById('user-profile-modal').style.display = 'none';
    showToast('Perfil actualizado correctamente');
  });

  // Lógica para simular cambio de foto en el perfil
  document.getElementById('btn-change-photo').addEventListener('click', () => {
    const newPhotoUrl = prompt('Ingresa la URL ficticia de tu foto de perfil:', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200');
    if (newPhotoUrl) {
      ParkingDB.update('users', currentUser.id, { avatar: newPhotoUrl });
      const avatarEl = document.querySelector('.user-profile-card .avatar');
      if (avatarEl) {
        avatarEl.innerHTML = `<img src="${newPhotoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      }
      document.getElementById('modal-avatar-preview').innerHTML = `<img src="${newPhotoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      showToast('Foto de perfil actualizada correctamente');
    }
  });

  /* ==========================================================================
     13. TICKETS DIGITALES, CONTADORES Y TIMERS DE ACCESO
     ========================================================================== */
  const reservePlate = document.getElementById('reserve-vehicle-plate');
  const reserveModel = document.getElementById('reserve-vehicle-model');
  const reserveColor = document.getElementById('reserve-vehicle-color');
  const reserveUserName = document.getElementById('reserve-user-name');
  const reserveDuration = document.getElementById('reserve-duration');
  const reservationModal = document.getElementById('reservation-modal');

  // Abre el modal de reserva desde el Sidebar o Mapa
  const btnReserveSpot = document.getElementById('btn-reserve-spot');
  btnReserveSpot.addEventListener('click', () => {
    if (activeTicket) {
      showToast('Ya tienes un boleto activo en curso', 'warning');
      return;
    }
    if (!selectedSpotId) {
      showToast('Selecciona un cajón libre en el croquis', 'warning');
      return;
    }
    
    document.getElementById('reserve-spot-display').value = selectedSpotId;
    reserveUserName.value = `${currentUser.name} ${currentUser.paternal || ''}`;

    // Rellenar datos del vehículo si existe predeterminado
    const defaultVeh = ParkingDB.filter('vehicles', v => v.userId === currentUser.id).find(v => v.isDefault);
    if (defaultVeh) {
      reservePlate.value = defaultVeh.plate;
      reserveModel.value = `${defaultVeh.brand} ${defaultVeh.model}`;
      reserveColor.value = defaultVeh.color;
    }

    reservationModal.style.display = 'flex';
  });

  document.getElementById('btn-close-reservation-modal').addEventListener('click', () => {
    reservationModal.style.display = 'none';
  });

  // Confirmar y crear la Reservación con ticket digital
  document.getElementById('btn-confirm-reservation').addEventListener('click', () => {
    const plate = reservePlate.value.trim().toUpperCase();
    const model = reserveModel.value.trim();
    const color = reserveColor.value.trim();
    const conductor = reserveUserName.value.trim();

    if (!plate || !model || !color || !conductor) {
      showToast('Completa los campos del coche', 'warning');
      return;
    }

    // 1. Generación de Código alfanumérico único
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let codePart = '';
    for (let k = 0; k < 7; k++) codePart += chars.charAt(Math.floor(Math.random() * chars.length));
    
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const ticketCode = codePart + dd + mm + yyyy;

    const durationVal = reserveDuration.value;
    let limit = 60; // Tolerancia de llegada (60s demo)
    let tarifa = 10;

    if (durationVal === "10") {
      limit = 60; // 10 min = 60 segundos reales demo
      tarifa = 10.00;
    } else if (durationVal === "30") {
      limit = 180; // 30 min = 180 segundos reales demo
      tarifa = 25.00;
    } else if (durationVal === "60") {
      limit = 360; // 1 hora = 360 segundos reales demo
      tarifa = 45.00;
    }

    // Comprobar saldo en billetera
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    if (user.balance < tarifa) {
      showToast('Saldo insuficiente en tu billetera digital', 'danger');
      return;
    }

    // Cobrar tarifa de reservación
    const nuevoSaldo = user.balance - tarifa;
    ParkingDB.update('users', user.id, { balance: nuevoSaldo });

    // Registrar cobro en billetera
    ParkingDB.insert('wallet_transactions', {
      userId: user.id,
      date: new Date().toISOString(),
      concept: `Reserva Cajón ${selectedSpotId.substring(3)}`,
      method: 'Billetera',
      amount: -tarifa
    });

    // Crear el boleto activo
    const newTkt = ParkingDB.insert('tickets', {
      code: ticketCode,
      spotId: selectedSpotId,
      status: 'active',
      vehicleStatus: 'Reservado',
      entryTime: new Date().toISOString(),
      exitTime: null,
      paymentMethod: 'Billetera',
      tarifa: tarifa,
      totalPaid: tarifa,
      vehiclePlate: plate,
      vehicleModel: model,
      vehicleColor: color,
      conductor: conductor,
      userId: currentUser.id, // Guardar ID de usuario
      isSimulated: false
    });

    // Insertar reservación
    ParkingDB.insert('reservations', {
      ticketId: newTkt.id,
      spotId: selectedSpotId,
      username: conductor,
      startTime: new Date().toISOString(),
      limitSeconds: limit,
      remainingSeconds: limit,
      decisionSeconds: 0,
      status: 'Activa'
    });

    // Registrar en auditoría
    ParkingDB.insert('accessHistory', {
      ticketId: newTkt.id,
      type: 'Reserva',
      spotId: selectedSpotId
    });

    activeTicket = newTkt;
    addPoints(15); // Otorgar XP

    // Limpiar variables de selección
    selectedSpotId = null;
    reservationModal.style.display = 'none';

    // Refrescar
    initSectorsGrid();
    if (mapGenerated) generateMapGrid();
    refreshActiveTicketUI();
    refreshWalletUI();

    switchToView('tickets');
    showToast(`¡Reserva creada! Boleto: ${ticketCode}`);
  });

  // Hilo principal secundario: Ticker del temporizador de tolerancia
  setInterval(() => {
    const reservations = ParkingDB.getTable('reservations');
    const tickets = ParkingDB.getTable('tickets');
    let needsUpdate = false;

    reservations.forEach(res => {
      if (res.status === 'Activa') {
        res.remainingSeconds--;
        needsUpdate = true;

        // Mandar avisos sonoros/visuales de tiempo restante
        if (res.remainingSeconds === 15) {
          showToast('Tolerancia por vencer: quedan 15 segundos', 'warning');
        } else if (res.remainingSeconds === 5) {
          showToast('Tolerancia crítica: quedan 5 segundos', 'warning');
        }

        if (res.remainingSeconds <= 0) {
          res.status = 'Expirada_Pendiente';
          res.decisionSeconds = 60; // 60 segundos de tolerancia definitiva
          
          const tIdx = tickets.findIndex(t => t.id === res.ticketId);
          if (tIdx !== -1) {
            tickets[tIdx].vehicleStatus = 'Expiración Pendiente';
          }
          showToast('¡Tiempo de llegada agotado! Cajón liberándose...', 'warning');
        }
      } else if (res.status === 'Expirada_Pendiente') {
        res.decisionSeconds--;
        needsUpdate = true;

        if (res.decisionSeconds <= 0) {
          res.status = 'Perdida';
          const tIdx = tickets.findIndex(t => t.id === res.ticketId);
          if (tIdx !== -1) {
            tickets[tIdx].status = 'expired';
            tickets[tIdx].vehicleStatus = 'Expirado';
            tickets[tIdx].exitTime = new Date().toISOString();
          }

          ParkingDB.insert('accessHistory', {
            ticketId: res.ticketId,
            type: 'Expiración',
            spotId: res.spotId
          });

          if (activeTicket && activeTicket.id === res.ticketId) {
            activeTicket = null;
          }
        }
      }
    });

    if (needsUpdate) {
      ParkingDB.saveTable('reservations', reservations);
      ParkingDB.saveTable('tickets', tickets);
      initSectorsGrid();
      if (mapGenerated) generateMapGrid();
      
      if (currentUser && currentUser.role === 'admin') {
        refreshAdminTables();
      }
    }

    // Refrescar ticket activo en pantalla de cliente
    if (activeTicket) {
      const freshTkt = ParkingDB.find('tickets', t => t.id === activeTicket.id);
      if (freshTkt) {
        activeTicket = freshTkt;
        if (activeTicket.status === 'expired' || activeTicket.status === 'paid') {
          activeTicket = null;
          refreshActiveTicketUI();
        } else {
          updateActiveTicketUIValues();
        }
      }
    }
  }, 1000);

  // Botones de fase de Expiración Pendiente
  document.getElementById('btn-reserve-again').addEventListener('click', () => {
    if (!activeTicket) return;
    const res = ParkingDB.find('reservations', r => r.ticketId === activeTicket.id);
    if (res) {
      // Validar saldo para cobro de renovación de tolerancia
      const user = ParkingDB.find('users', u => u.id === currentUser.id);
      if (user.balance < activeTicket.tarifa) {
        showToast('Saldo insuficiente para renovar reservación', 'danger');
        return;
      }

      const nuevoSaldo = user.balance - activeTicket.tarifa;
      ParkingDB.update('users', user.id, { balance: nuevoSaldo });
      
      ParkingDB.insert('wallet_transactions', {
        userId: user.id,
        date: new Date().toISOString(),
        concept: `Renovación Cajón ${activeTicket.spotId.substring(3)}`,
        method: 'Billetera',
        amount: -activeTicket.tarifa
      });

      ParkingDB.update('reservations', res.id, {
        status: 'Activa',
        remainingSeconds: res.limitSeconds,
        decisionSeconds: 0
      });

      ParkingDB.update('tickets', activeTicket.id, {
        vehicleStatus: 'Reservado'
      });

      activeTicket = ParkingDB.find('tickets', t => t.id === activeTicket.id);

      showToast('Reserva renovada con éxito.');
      initSectorsGrid();
      if (mapGenerated) generateMapGrid();
      refreshActiveTicketUI();
      refreshWalletUI();
    }
  });

  document.getElementById('btn-lose-reservation').addEventListener('click', () => {
    if (!activeTicket) return;
    const res = ParkingDB.find('reservations', r => r.ticketId === activeTicket.id);
    if (res) {
      ParkingDB.update('reservations', res.id, { status: 'Perdida' });
      ParkingDB.update('tickets', activeTicket.id, {
        status: 'expired',
        vehicleStatus: 'Expirado',
        exitTime: new Date().toISOString()
      });

      ParkingDB.insert('accessHistory', {
        ticketId: activeTicket.id,
        type: 'Expiración',
        spotId: activeTicket.spotId
      });

      showToast('Has liberado la reservación del cajón.', 'warning');
      activeTicket = null;
      
      initSectorsGrid();
      if (mapGenerated) generateMapGrid();
      refreshActiveTicketUI();
    }
  });

  // Mostrar ticket físico
  function refreshActiveTicketUI() {
    const noTicket = document.getElementById('no-active-ticket');
    const wrapper = document.getElementById('active-ticket-wrapper');

    if (!activeTicket) {
      noTicket.style.display = 'block';
      wrapper.style.display = 'none';
      return;
    }

    noTicket.style.display = 'none';
    wrapper.style.display = 'block';

    document.getElementById('ticket-alphanumeric-code').innerText = activeTicket.code;
    document.getElementById('ticket-spot-id').innerText = activeTicket.spotId;
    document.getElementById('ticket-vehicle-plate').innerText = activeTicket.vehiclePlate;
    document.getElementById('ticket-vehicle-model').innerText = activeTicket.vehicleModel;

    const entry = new Date(activeTicket.entryTime);
    document.getElementById('ticket-entry-time').innerText = entry.toLocaleTimeString();

    // Rellenar QR
    const qrImg = document.getElementById('ticket-qr-img');
    const fallback = document.getElementById('ticket-barcode-fallback');
    
    qrImg.style.display = 'block';
    fallback.style.display = 'none';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activeTicket.code)}`;

    qrImg.onerror = () => {
      qrImg.style.display = 'none';
      fallback.style.display = 'block';
      document.getElementById('barcode-text').innerText = activeTicket.code;
    };
  }

  // Refrescar tiempo transcurrido en el ticket activo
  function updateActiveTicketUIValues() {
    if (!activeTicket) return;

    const statusBadge = document.getElementById('ticket-status-badge');
    const alertEl = document.getElementById('ticket-expiration-alert');
    const decisionEl = document.getElementById('ticket-expired-decision');
    const counterEl = document.getElementById('ticket-timer-counter');
    const priceEl = document.getElementById('ticket-price-counter');
    const timeLabelEl = document.getElementById('timer-kpi-label');

    statusBadge.innerText = activeTicket.vehicleStatus;
    
    // Ocultar/Mostrar botones de cancelación
    if (activeTicket.vehicleStatus === 'Reservado' || activeTicket.vehicleStatus === 'Expiración Pendiente') {
      btnCancelReservation.style.display = 'flex';
    } else {
      btnCancelReservation.style.display = 'none';
    }

    if (activeTicket.vehicleStatus === 'Expiración Pendiente') {
      statusBadge.style.background = '#ef4444';
      statusBadge.style.color = 'white';
      
      alertEl.style.display = 'none';
      decisionEl.style.display = 'flex';
      timeLabelEl.innerText = 'TIEMPO EXPENDIDO';

      const res = ParkingDB.find('reservations', r => r.ticketId === activeTicket.id);
      if (res) {
        document.getElementById('ticket-decision-countdown').innerText = res.decisionSeconds;
        counterEl.innerText = 'EXPIRED';
        priceEl.innerText = `$${activeTicket.tarifa.toFixed(2)}`;
      }
    } else if (activeTicket.vehicleStatus === 'Reservado') {
      statusBadge.style.background = '';
      statusBadge.style.color = '';
      
      alertEl.style.display = 'flex';
      decisionEl.style.display = 'none';
      timeLabelEl.innerText = 'TOLERANCIA DE LLEGADA';

      const res = ParkingDB.find('reservations', r => r.ticketId === activeTicket.id);
      if (res) {
        document.getElementById('ticket-expiration-countdown').innerText = res.remainingSeconds;
        const m = Math.floor(res.remainingSeconds / 60);
        const s = res.remainingSeconds % 60;
        counterEl.innerText = `00:${m < 10 ? '0':''}${m}:${s < 10 ? '0':''}${s}`;
        priceEl.innerText = `$${activeTicket.tarifa.toFixed(2)}`;
      }
    } else {
      // Estado: Estacionado
      statusBadge.style.background = '';
      statusBadge.style.color = '';
      
      alertEl.style.display = 'none';
      decisionEl.style.display = 'none';
      timeLabelEl.innerText = 'TIEMPO ACUMULADO';

      const entryTime = new Date(activeTicket.entryTime).getTime();
      const elapsedSec = Math.floor((Date.now() - entryTime) / 1000);

      const h = Math.floor(elapsedSec / 3600);
      const m = Math.floor((elapsedSec % 3600) / 60);
      const s = elapsedSec % 60;
      counterEl.innerText = `${h < 10 ? '0':''}${h}:${m < 10 ? '0':''}${m}:${s < 10 ? '0':''}${s}`;

      // Costo acumulado: Tarifa base + $0.20 pesos por segundo
      const calculatedPrice = activeTicket.tarifa + elapsedSec * 0.20;
      priceEl.innerText = `$${calculatedPrice.toFixed(2)}`;
    }
  }

  /* ==========================================================================
     14. PASARELA DE PAGOS Y FACTURA SIMULADA
     ========================================================================== */
  const btnPayTicket = document.getElementById('btn-pay-ticket');
  const paymentModal = document.getElementById('payment-modal');
  const btnClosePayModal = document.getElementById('btn-close-payment-modal');

  const payTicketCode = document.getElementById('pay-ticket-code');
  const payTicketSpot = document.getElementById('pay-ticket-spot');
  const payTicketTime = document.getElementById('pay-ticket-time');
  const paySubtotal = document.getElementById('pay-subtotal');
  const payTax = document.getElementById('pay-tax');
  const payTotal = document.getElementById('pay-total');
  const payBtnAmount = document.getElementById('pay-btn-amount');

  const methodCard = document.getElementById('method-card');
  const methodCash = document.getElementById('method-cash');
  const cardFields = document.getElementById('card-fields-wrapper');
  const cashFields = document.getElementById('cash-fields-wrapper');
  const btnInsertCash = document.getElementById('btn-insert-cash');
  const btnSubmitPayment = document.getElementById('btn-submit-payment');
  
  let selectedMethod = 'Tarjeta';

  btnPayTicket.addEventListener('click', () => {
    if (!activeTicket) return;

    let elapsedSec = 0;
    let totalCost = activeTicket.tarifa;

    if (activeTicket.vehicleStatus === 'Estacionado') {
      const entryTime = new Date(activeTicket.entryTime).getTime();
      elapsedSec = Math.floor((Date.now() - entryTime) / 1000);
      totalCost += elapsedSec * 0.20;
    }

    const sub = totalCost / 1.16;
    const tax = totalCost - sub;

    payTicketCode.innerText = activeTicket.code;
    payTicketSpot.innerText = activeTicket.spotId;

    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    payTicketTime.innerText = `${h < 10 ? '0':''}${h}:${m < 10 ? '0':''}${m}:${s < 10 ? '0':''}${s}`;

    paySubtotal.innerText = `$${sub.toFixed(2)}`;
    payTax.innerText = `$${tax.toFixed(2)}`;
    payTotal.innerText = `$${totalCost.toFixed(2)}`;
    payBtnAmount.innerText = `$${totalCost.toFixed(2)}`;

    // Reset de métodos
    selectedMethod = 'Tarjeta';
    methodCard.classList.add('active');
    methodCash.classList.remove('active');
    cardFields.style.display = 'block';
    cashFields.style.display = 'none';

    paymentModal.style.display = 'flex';
  });

  methodCard.addEventListener('click', () => {
    selectedMethod = 'Tarjeta';
    methodCard.classList.add('active');
    methodCash.classList.remove('active');
    cardFields.style.display = 'block';
    cashFields.style.display = 'none';
  });

  methodCash.addEventListener('click', () => {
    selectedMethod = 'Efectivo';
    methodCash.classList.add('active');
    methodCard.classList.remove('active');
    cardFields.style.display = 'none';
    cashFields.style.display = 'block';
  });

  btnInsertCash.addEventListener('click', () => {
    showToast('Billetes procesados por la validadora física.');
  });

  btnClosePayModal.addEventListener('click', () => paymentModal.style.display = 'none');

  // Procesar pago total y liquidación
  btnSubmitPayment.addEventListener('click', () => {
    if (!activeTicket) return;

    let elapsedSec = 0;
    let totalCost = activeTicket.tarifa;

    if (activeTicket.vehicleStatus === 'Estacionado') {
      const entryTime = new Date(activeTicket.entryTime).getTime();
      elapsedSec = Math.floor((Date.now() - entryTime) / 1000);
      totalCost += elapsedSec * 0.20;
    }

    // Validar cobro de billetera si el usuario lo salda de ahí o simula tarjeta
    const user = ParkingDB.find('users', u => u.id === currentUser.id);
    
    // Si prefiere saldo de billetera o es simulación
    if (selectedMethod === 'Tarjeta') {
      if (user.balance < totalCost) {
        showToast('Saldo insuficiente en billetera digital. Recarga saldo o paga en efectivo.', 'danger');
        return;
      }
      
      const nuevoSaldo = user.balance - totalCost;
      ParkingDB.update('users', user.id, { balance: nuevoSaldo });

      // Registrar transacción
      ParkingDB.insert('wallet_transactions', {
        userId: user.id,
        date: new Date().toISOString(),
        concept: `Liquidación Ticket ${activeTicket.code.substring(0,7)}`,
        method: 'Billetera',
        amount: -totalCost
      });
    }

    // Guardar pago
    const pmt = ParkingDB.insert('payments', {
      ticketId: activeTicket.id,
      monto: totalCost,
      metodoPago: selectedMethod,
      timestamp: new Date().toISOString()
    });

    // Actualizar ticket
    ParkingDB.update('tickets', activeTicket.id, {
      status: 'paid',
      vehicleStatus: 'Liquidado',
      exitTime: new Date().toISOString(),
      paymentMethod: selectedMethod,
      totalPaid: totalCost
    });

    // Historial accesos
    ParkingDB.insert('accessHistory', {
      ticketId: activeTicket.id,
      type: 'Salida',
      spotId: activeTicket.spotId
    });

    // Sumar XP por completar el ciclo
    ParkingDB.update('users', user.id, {
      points: user.points + 25,
      visits: user.visits + 1
    });

    updateLevelUI();
    refreshWalletUI();

    // Rellenar comprobante para modal impreso
    document.getElementById('rec-trans-id').innerText = 'TX-' + pmt.id.toUpperCase();
    document.getElementById('rec-ticket-code').innerText = activeTicket.code;
    document.getElementById('rec-spot').innerText = activeTicket.spotId;
    document.getElementById('rec-vehicle').innerText = activeTicket.vehicleModel;
    document.getElementById('rec-plate').innerText = activeTicket.vehiclePlate;
    
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    const s = elapsedSec % 60;
    document.getElementById('rec-duration').innerText = `${h}h ${m}m ${s}s`;
    
    document.getElementById('rec-method').innerText = selectedMethod.toUpperCase();
    document.getElementById('rec-amount').innerText = `$${totalCost.toFixed(2)}`;

    paymentModal.style.display = 'none';
    document.getElementById('receipt-modal').style.display = 'flex';

    activeTicket = null;
    selectedSpotId = null;

    initSectorsGrid();
    if (mapGenerated) generateMapGrid();
    refreshActiveTicketUI();
  });

  document.getElementById('btn-close-receipt').addEventListener('click', () => {
    document.getElementById('receipt-modal').style.display = 'none';
    switchToView('list');
    showToast('Ciclo completado. Comprobante impreso.');
  });

  /* ==========================================================================
     15. SIMULADORES DE ENTRADA Y SALIDA FÍSICOS (BARRERAS)
     ========================================================================== */
  const btnSimEntry = document.getElementById('btn-sim-entry');
  const btnSimExit = document.getElementById('btn-sim-exit');
  const btnSimSearch = document.getElementById('btn-sim-search');
  const simSpotSelect = document.getElementById('sim-spot-select');
  const simPlate = document.getElementById('sim-plate');
  const simVehicle = document.getElementById('sim-vehicle');
  const simCodeInput = document.getElementById('sim-ticket-code-input');

  function populateSimSpotDropdown() {
    if (!simSpotSelect) return;
    simSpotSelect.innerHTML = '';

    const spots = ParkingDB.getTable('spots');
    const activeTkts = ParkingDB.filter('tickets', t => t.status === 'active');
    const occupiedIds = activeTkts.map(t => t.spotId);

    spots.forEach(s => {
      if (!occupiedIds.includes(s.id) && s.type !== 'Fuera de Servicio') {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = s.id;
        simSpotSelect.appendChild(opt);
      }
    });
  }

  // Simular ingreso de vehículo en cajón
  btnSimEntry.addEventListener('click', () => {
    const spot = simSpotSelect.value;
    const plate = simPlate.value.trim().toUpperCase() || 'SIM-' + Math.floor(100 + Math.random() * 900);
    const model = simVehicle.value.trim() || 'Simulado Coche';

    if (!spot) {
      showToast('No hay cajones libres', 'warning');
      return;
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let k = 0; k < 7; k++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '20052026';

    const tkt = ParkingDB.insert('tickets', {
      code: code,
      spotId: spot,
      status: 'active',
      vehicleStatus: 'Estacionado',
      entryTime: new Date().toISOString(),
      exitTime: null,
      paymentMethod: 'N/A',
      tarifa: 15.00,
      totalPaid: 0,
      vehiclePlate: plate,
      vehicleModel: model,
      vehicleColor: 'Negro',
      conductor: currentUser.name,
      userId: currentUser.id, // Guardar ID de usuario
      isSimulated: true
    });

    ParkingDB.insert('accessHistory', {
      ticketId: tkt.id,
      type: 'Entrada Directa',
      spotId: spot
    });

    activeTicket = tkt;

    // Reset inputs
    simPlate.value = '';
    simVehicle.value = '';

    initSectorsGrid();
    if (mapGenerated) generateMapGrid();
    populateSimSpotDropdown();
    refreshActiveTicketUI();
    refreshTicketsHistoryTable();

    showToast(`Vehículo ingresado de forma simulada en ${spot}`);
  });

  // Buscar boleto existente
  btnSimSearch.addEventListener('click', () => {
    const q = simCodeInput.value.trim();
    if (!q) return;

    const tkt = ParkingDB.find('tickets', t => (t.code === q || t.vehiclePlate === q) && t.status === 'active');
    if (tkt) {
      activeTicket = tkt;
      refreshActiveTicketUI();
      showToast(`Boleto cargado: ${tkt.code}`);
    } else {
      showToast('Boleto no encontrado', 'danger');
    }
  });

  // Simular Salida
  btnSimExit.addEventListener('click', () => {
    const q = simCodeInput.value.trim();
    const target = q ? ParkingDB.find('tickets', t => (t.code === q || t.vehiclePlate === q) && t.status === 'active') : activeTicket;

    if (!target) {
      showToast('Introduce un código o selecciona un boleto activo', 'warning');
      return;
    }

    activeTicket = target;
    btnPayTicket.click();
    simCodeInput.value = '';
  });

  function refreshTicketsHistoryTable() {
    const tickets = ParkingDB.getTable('tickets');
    const tbody = document.getElementById('tickets-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (tickets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros en la base de datos.</td></tr>';
      return;
    }

    tickets.reverse().forEach(t => {
      const row = document.createElement('tr');
      const inTime = new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const outTime = t.exitTime ? new Date(t.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
      
      let badge = `<span class="badge-available" style="padding:2px 8px; font-size:0.65rem;">ACTIVO</span>`;
      if (t.status === 'paid') badge = `<span class="badge-available" style="padding:2px 8px; font-size:0.65rem;">PAGADO</span>`;
      else if (t.status === 'expired') badge = `<span class="badge-occupied" style="padding:2px 8px; font-size:0.65rem; background:rgba(220,38,38,0.1); color:#ef4444;">EXPIRADO</span>`;
      else if (t.status === 'cancelled') badge = `<span class="badge-occupied" style="padding:2px 8px; font-size:0.65rem; background:rgba(220,38,38,0.1); color:#ef4444;">CANCELADO</span>`;

      row.innerHTML = `
        <td><strong style="font-family:monospace;">${t.code}</strong></td>
        <td><strong>${t.spotId}</strong></td>
        <td>${badge}</td>
        <td>${t.vehiclePlate} (${t.vehicleModel})</td>
        <td>${inTime} / ${outTime}</td>
        <td>$${t.totalPaid.toFixed(2)}</td>
        <td><button class="btn-change-photo btn-view-old-ticket" data-id="${t.id}" style="padding:3px 8px; font-size:0.7rem;"><i class="fas fa-eye"></i></button></td>
      `;
      tbody.appendChild(row);
    });

    document.querySelectorAll('.btn-view-old-ticket').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const fresh = ParkingDB.find('tickets', t => t.id === id);
        if (fresh) {
          activeTicket = fresh;
          refreshActiveTicketUI();
          showToast(`Boleto de historial cargado: ${fresh.code}`);
        }
      });
    });
  }

  /* ==========================================================================
     16. GUARDAR Y ENCONTRAR VEHÍCULO
     ========================================================================== */
  document.getElementById('btn-save-car').addEventListener('click', () => {
    if (!activeTicket) {
      showToast('Necesitas tener un cajón reservado u ocupado primero', 'warning');
      return;
    }
    savedCarSpotId = activeTicket.spotId;
    registerArrival(); // Simular arribo en caso de guardado directo
    showToast('Ubicación del vehículo guardada exitosamente.', 'success');
  });

  document.getElementById('btn-find-car').addEventListener('click', () => {
    if (!savedCarSpotId) {
      showToast('No has guardado ninguna ubicación de vehículo', 'warning');
      return;
    }

    const fm = savedCarSpotId.match(/^P(\d)-/);
    if (fm) {
      const fl = parseInt(fm[1]);
      if (currentFloor !== fl) {
        document.querySelector(`.floor-tab[data-floor="${fl}"]`).click();
      }
    }

    switchToView('map');
    showToast(`Ubicación de tu auto encontrada en cajón ${savedCarSpotId.substring(3)}. Trazando ruta...`);
    
    const block = mapBlocksData.find(b => b.id === savedCarSpotId);
    if (block) {
      calculateIntelligentPathTo(block.x, block.y);
    }
  });

  // Botón encontrar lugar
  document.getElementById('btn-find-spot').addEventListener('click', () => {
    if (!activeTicket) {
      showToast('Debes tener una reservación para poder guiarte', 'warning');
      return;
    }

    const fm = activeTicket.spotId.match(/^P(\d)-/);
    if (fm) {
      const fl = parseInt(fm[1]);
      if (currentFloor !== fl) {
        document.querySelector(`.floor-tab[data-floor="${fl}"]`).click();
      }
    }

    switchToView('map');
    showToast(`Trazando ruta de guiado al cajón reservado ${activeTicket.spotId.substring(3)}`);
    
    const block = mapBlocksData.find(b => b.id === activeTicket.spotId);
    if (block) {
      calculateIntelligentPathTo(block.x, block.y);
    }
  });

  // Botón del Mapa alternativo para reservar
  document.getElementById('btn-map-reserve-spot').addEventListener('click', () => {
    document.getElementById('btn-reserve-spot').click();
  });

  /* ==========================================================================
     17. CONTROLES DE MOVIMIENTO TECLADO Y GPS SIMULADOS
     ========================================================================== */
  window.addEventListener('keydown', (e) => {
    if (currentView !== 'map' || pathPoints.length === 0) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      updatePlayerPosition(pathProgress + 0.03);
      addPoints(1);
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      updatePlayerPosition(pathProgress - 0.03);
    }
  });

  let geoWatchId = null;
  let lastLat = null, lastLon = null;

  function startGeolocation() {
    if ("geolocation" in navigator) {
      geoWatchId = navigator.geolocation.watchPosition((pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        if (lastLat !== null && lastLon !== null) {
          const dist = Math.abs(lat - lastLat) + Math.abs(lon - lastLon);
          if (dist > 0.000002 && pathPoints.length > 0) {
            updatePlayerPosition(pathProgress + 0.02);
            addPoints(2);
          }
        }
        lastLat = lat; lastLon = lon;
      }, (err) => console.warn(err), { enableHighAccuracy: true });
    }
  }

  function stopGeolocation() {
    if (geoWatchId !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(geoWatchId);
      geoWatchId = null;
    }
  }

  /* ==========================================================================
     18. PANEL KPI ESTADÍSTICOS ADMINISTRADOR
     ========================================================================== */
  function loadAdminDashboard() {
    const tickets = ParkingDB.getTable('tickets');
    const payments = ParkingDB.getTable('payments');
    const reservations = ParkingDB.getTable('reservations');
    const access = ParkingDB.getTable('accessHistory');

    let totalRevenue = 0;
    payments.forEach(p => totalRevenue += p.monto);

    const activeResCount = reservations.filter(r => r.status === 'Activa').length;
    const occupiedCount = tickets.filter(t => t.status === 'active').length;

    document.getElementById('kpi-revenue').innerText = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('kpi-occupancy').innerText = `${occupiedCount}/320`;
    document.getElementById('kpi-occupancy-percent').innerText = `${((occupiedCount / 320) * 100).toFixed(0)}% ocupación`;
    document.getElementById('kpi-reservations').innerText = activeResCount;
    document.getElementById('kpi-access-count').innerText = access.length;

    // 1. Calcular estadísticas detalladas (Añadido)
    const paidTickets = tickets.filter(t => t.status === 'paid' && t.exitTime && t.entryTime);
    let avgTimeStr = '0s';
    if (paidTickets.length > 0) {
      let totalElapsed = 0;
      paidTickets.forEach(t => {
        const entry = new Date(t.entryTime).getTime();
        const exit = new Date(t.exitTime).getTime();
        totalElapsed += Math.max(0, Math.floor((exit - entry) / 1000));
      });
      const avgElapsed = Math.floor(totalElapsed / paidTickets.length);
      if (avgElapsed >= 3600) {
        avgTimeStr = `${(avgElapsed / 3600).toFixed(1)}h`;
      } else if (avgElapsed >= 60) {
        avgTimeStr = `${(avgElapsed / 60).toFixed(1)}m`;
      } else {
        avgTimeStr = `${avgElapsed}s`;
      }
    }
    const statAvgTimeEl = document.getElementById('stat-avg-time');
    if (statAvgTimeEl) statAvgTimeEl.innerText = avgTimeStr;

    const sectorCounts = {};
    tickets.forEach(t => {
      const parts = t.spotId.split('-');
      if (parts.length > 1) {
        const sec = parts[1];
        sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
      }
    });
    let popularSector = 'Ninguno';
    let maxCount = 0;
    for (const sec in sectorCounts) {
      if (sectorCounts[sec] > maxCount) {
        maxCount = sectorCounts[sec];
        popularSector = `Sector ${sec}`;
      }
    }
    const statPopularSectorEl = document.getElementById('stat-most-popular-sector');
    if (statPopularSectorEl) statPopularSectorEl.innerText = popularSector;

    const totalRes = reservations.length;
    let efficiencyStr = '0%';
    if (totalRes > 0) {
      const completedRes = reservations.filter(r => r.status === 'Completada').length;
      efficiencyStr = `${((completedRes / totalRes) * 100).toFixed(0)}%`;
    }
    const statEfficiencyEl = document.getElementById('stat-reservation-efficiency');
    if (statEfficiencyEl) statEfficiencyEl.innerText = efficiencyStr;

    // 2. Renderizar usuarios dentro del estacionamiento (Añadido)
    const activeParkedUsersBody = document.getElementById('active-parked-users-body');
    if (activeParkedUsersBody) {
      activeParkedUsersBody.innerHTML = '';
      const activeTickets = ParkingDB.filter('tickets', t => t.status === 'active' && t.vehicleStatus === 'Estacionado');
      if (activeTickets.length === 0) {
        activeParkedUsersBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay usuarios dentro del estacionamiento actualmente.</td></tr>';
      } else {
        activeTickets.forEach(t => {
          const user = ParkingDB.find('users', u => u.id === t.userId) || ParkingDB.find('users', u => `${u.name} ${u.paternal || ''}`.trim() === t.conductor);
          const userName = user ? `${user.name} ${user.paternal || ''}`.trim() : t.conductor;
          const userEmail = user ? user.email : 'carlos@admin.com'; // Admin fallback or similar if simulation
          const entryDate = new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${userName}</strong></td>
            <td>${userEmail}</td>
            <td><span class="plate-tag" style="background:var(--primary-color); color:white;">${t.spotId}</span></td>
            <td>${t.vehiclePlate} (${t.vehicleModel})</td>
            <td>${entryDate}</td>
          `;
          activeParkedUsersBody.appendChild(row);
        });
      }
    }

    // Actualizar gráficos SVG de sector
    let countA = 0, countB = 0, countC = 0;
    tickets.filter(t => t.status === 'active').forEach(t => {
      const parts = t.spotId.split('-');
      if (parts.length > 1) {
        const sec = parts[1];
        if (sec === 'A') countA++;
        else if (sec === 'B') countB++;
        else if (sec === 'C') countC++;
      }
    });

    const pctA = (countA / 40) * 100;
    const pctB = (countB / 40) * 100;
    const pctC = (countC / 40) * 100;

    const barA = document.getElementById('bar-sector-a');
    const barB = document.getElementById('bar-sector-b');
    const barC = document.getElementById('bar-sector-c');

    const hA = (pctA / 100) * 150;
    const hB = (pctB / 100) * 150;
    const hC = (pctC / 100) * 150;

    if (barA) {
      barA.setAttribute('height', hA);
      barA.setAttribute('y', 170 - hA);
    }
    const lblA = document.getElementById('lbl-sector-a');
    if (lblA) {
      lblA.innerText = `${pctA.toFixed(0)}%`;
      lblA.setAttribute('y', 160 - hA);
    }

    if (barB) {
      barB.setAttribute('height', hB);
      barB.setAttribute('y', 170 - hB);
    }
    const lblB = document.getElementById('lbl-sector-b');
    if (lblB) {
      lblB.innerText = `${pctB.toFixed(0)}%`;
      lblB.setAttribute('y', 160 - hB);
    }

    if (barC) {
      barC.setAttribute('height', hC);
      barC.setAttribute('y', 170 - hC);
    }
    const lblC = document.getElementById('lbl-sector-c');
    if (lblC) {
      lblC.innerText = `${pctC.toFixed(0)}%`;
      lblC.setAttribute('y', 160 - hC);
    }

    renderDatabaseTable();
  }

  // 19. Registrar el Service Worker de la PWA (Añadido)
  if ('serviceWorker' in navigator) {
    const registerSW = () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('Service Worker registrado con éxito. Scope:', reg.scope);
        })
        .catch(err => {
          console.error('Error al registrar el Service Worker:', err);
        });
    };
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }

});
