import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, child } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// --- Firebase Configuration ---
// PASTE YOUR CONFIG FROM FIREBASE CONSOLE HERE
const firebaseConfig = {
    apiKey: "AIzaSyDROsyq05_2_yOSM36e_fMZWAAMDMlI3Zw",
    authDomain: "spotandsolve-event.firebaseapp.com",
    databaseURL: "https://spotandsolve-event-default-rtdb.firebaseio.com",
    projectId: "spotandsolve-event",
    storageBucket: "spotandsolve-event.firebasestorage.app",
    messagingSenderId: "376969722817",
    appId: "1:376969722817:web:18409d04a8fb1c28ae4d40"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    const cred1 = document.getElementById('credit-1');
    const cred2 = document.getElementById('credit-2');
    const introOverlay = document.getElementById('intro-overlay');
    const loginOverlay = document.getElementById('login-overlay');
    const instrOverlay = document.getElementById('instructions-overlay');
    const mainContent = document.getElementById('main-content');
    const meterBar = document.querySelector('.meter-bar');
    const meterText = document.querySelector('.meter-text');
    const title = document.getElementById('reveal-title');
    const flagInput = document.getElementById('flag-input');
    const submitFlagBtn = document.getElementById('submit-flag');
    const flagFeedback = document.getElementById('flag-feedback');

    // --- Challenge Data & Flags ---
    const challengeFlags = {
        'module_01': 'MIL_GAR_FAW_LDN_UK', // Internal keys for some
        'module_02': 'mahatma gadhi',
        'module_03': '12 minutes',
        'module_04': '6.9069n79.8689e',
        'module_05': 'phare du risbon'
    };

    // --- Session & Timer State ---
    let startTime = null;
    let timerInterval = null;
    let missionAttempts = 0;

    // --- DOM Elements ---
    const challengeModal = document.getElementById('challenge-modal');
    const modalStartScreen = document.getElementById('modal-start-screen');
    const modalContent = document.getElementById('modal-mission-content');
    const startMissionBtn = document.getElementById('start-mission-btn');
    const timerDisplay = document.getElementById('modal-timer');

    // Additional Modal Controls
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalDiff = document.getElementById('modal-diff');
    const modalDownload = document.getElementById('modal-download');
    const modal = challengeModal; // Alias for consistency

    // --- Core Data Initialization (Firebase) ---
    async function initData() {
        const dbRef = ref(db);
        try {
            const snapshot = await get(child(dbRef, `users/admin`));
            if (!snapshot.exists()) {
                await set(ref(db, 'users/admin'), {
                    password: 'admin123',
                    role: 'admin',
                    solvedChallenges: [],
                    challengeDetails: {},
                    totalPoints: 0,
                    status: 'ACTIVE',
                    lastActive: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("Firebase Init Error:", e);
        }
    }
    initData();

    // --- Session Management ---
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');

    if (isLoggedIn === 'true') {
        // Skip intro and login
        [cred1, cred2, introOverlay, loginOverlay, instrOverlay].forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.classList.add('hidden');
            }
        });

        if (userRole === 'admin' && !window.location.href.includes('admin.html')) {
            window.location.href = 'admin.html';
            return;
        }

        if (window.location.href.includes('admin.html')) {
            if (userRole !== 'admin') {
                window.location.href = 'index.html';
                return;
            }
            listenToAdminData();
        } else {
            if (mainContent) {
                mainContent.classList.remove('hidden');
                mainContent.classList.add('visible');
            }
            initializeHUD();
            syncUserDataLocally();
        }
    } else {
        if (window.location.href.includes('admin.html') || window.location.href.includes('dashboard.html')) {
            window.location.href = 'index.html';
            return;
        }
        if (cred1) startCinematicSequence();
    }

    async function syncUserDataLocally() {
        const username = localStorage.getItem('currentUsername');
        if (!username) return;

        onValue(ref(db, `users/${username}`), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                localStorage.setItem('solvedChallenges', JSON.stringify(data.solvedChallenges || []));
                localStorage.setItem('challengeDetails', JSON.stringify(data.challengeDetails || {}));
                updateChallengeUI();
            }
        });
    }

    function startCinematicSequence() {
        if (!cred1 || !cred2) return;

        // 1. Start Credit 1
        const cred1Text = cred1.querySelector('.reveal-fade');
        if (cred1Text) cred1Text.classList.add('animate-reveal-fade');

        setTimeout(() => {
            if (cred1) cred1.style.opacity = '0';
            setTimeout(() => {
                if (cred1) cred1.style.display = 'none';
                // 2. Start Credit 2
                if (cred2) {
                    cred2.classList.remove('hidden');
                    const cred2Text = cred2.querySelector('.reveal-fade');
                    if (cred2Text) cred2Text.classList.add('animate-reveal-fade');
                }

                setTimeout(() => {
                    if (cred2) cred2.style.opacity = '0';
                    setTimeout(() => {
                        if (cred2) cred2.style.display = 'none';
                        // 3. Show Title Reveal
                        if (introOverlay) {
                            introOverlay.classList.remove('hidden');
                            startTitleReveal();
                        }
                    }, 1000);
                }, 3000);
            }, 1000);
        }, 3000);
    }

    function startTitleReveal() {
        // Scramble Text Effect
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@!&*";
        const originalText = title.innerText;
        let iteration = 0;

        const interval = setInterval(() => {
            if (!title) {
                clearInterval(interval);
                return;
            }
            title.innerText = title.innerText.split("")
                .map((char, index) => {
                    if (index < iteration) return originalText[index];
                    return chars[Math.floor(Math.random() * 26)];
                })
                .join("");

            if (iteration >= originalText.length) clearInterval(interval);
            iteration += 1 / 3;
        }, 50);

        // Loading Bar Simulation
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 5;
            if (progress > 100) progress = 100;

            if (meterBar) meterBar.style.width = `${progress}%`;
            if (meterText) meterText.innerText = `INITIALIZING INTEL_LINK... [${Math.floor(progress)}%]`;

            if (progress === 100) {
                clearInterval(progressInterval);
                setTimeout(dismissIntro, 800);
            }
        }, 100);
    }

    function dismissIntro() {
        if (introOverlay) {
            introOverlay.style.opacity = '0';
            setTimeout(() => {
                introOverlay.style.display = 'none';
                // 4. Show Login
                const loginOvr = document.getElementById('login-overlay');
                if (loginOvr) loginOvr.classList.remove('hidden');
            }, 1000);
        }
    }

    // --- Auth Logic (Firebase) ---
    const loginTriggerBtn = document.getElementById('login-trigger');
    const authFeedback = document.getElementById('auth-feedback');

    if (loginTriggerBtn) {
        loginTriggerBtn.addEventListener('click', async () => {
            const activeTab = document.querySelector('.auth-tab.active');
            const mode = activeTab ? activeTab.getAttribute('data-mode') : 'login';

            const username = document.getElementById('auth-id')?.value.trim();
            const password = document.getElementById('auth-token')?.value.trim();
            const gmail = document.getElementById('auth-gmail')?.value.trim();
            const phone = document.getElementById('auth-phone')?.value.trim();

            if (authFeedback) authFeedback.innerText = '';

            // Input Validation
            if (mode === 'register') {
                if (!username || !password || !gmail || !phone) {
                    if (authFeedback) authFeedback.innerText = 'ERROR: ALL_FIELDS_REQUIRED_FOR_REGISTRATION';
                    return;
                }

                const userSnapshot = await get(ref(db, `users/${username}`));
                if (userSnapshot.exists()) {
                    if (authFeedback) authFeedback.innerText = 'ERROR: USERNAME_ALREADY_EXISTS';
                    return;
                }

                // Create New Account
                await set(ref(db, `users/${username}`), {
                    password: password,
                    email: gmail,
                    phone: phone,
                    role: 'player', // Users can only register as players
                    solvedChallenges: [],
                    challengeDetails: {},
                    totalPoints: 0,
                    status: 'ACTIVE',
                    lastActive: new Date().toISOString()
                });

                if (authFeedback) {
                    authFeedback.innerText = 'SUCCESS: ACCOUNT_CREATED. YOU_CAN_NOW_LOGIN';
                    authFeedback.style.color = 'var(--accent-secondary)';
                }
                // Switch to login tab automatically
                const loginTab = document.querySelector('.auth-tab[data-mode="login"][data-role="player"]');
                if (loginTab) loginTab.click();
                return;
            }

            // Login Logic
            const snapshot = await get(ref(db, `users/${username}`));
            if (!snapshot.exists() || snapshot.val().password !== password) {
                if (authFeedback) {
                    authFeedback.style.color = '#ff4d4d';
                    authFeedback.innerText = 'ERROR: INVALID_IDENTIFIER_OR_TOKEN';
                }
                return;
            }

            const user = snapshot.val();
            // SUCCESS_LOGIN
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', user.role);
            localStorage.setItem('currentUsername', username);

            const loginOverlayElem = document.getElementById('login-overlay');
            if (loginOverlayElem) loginOverlayElem.style.opacity = '0';

            setTimeout(() => {
                if (loginOverlayElem) loginOverlayElem.style.display = 'none';
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    const instrOvr = document.getElementById('instructions-overlay');
                    if (instrOvr) instrOvr.classList.remove('hidden');

                    // Also update legacy solved state for this user
                    syncUserDataLocally();
                }
            }, 800);
        });
    }

    // Logout Logic
    const logoutBtn = document.getElementById('logout-trigger');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear(); // Clear all local storage related to session
            window.location.href = 'index.html';
        });
    }

    // Instructions Transition -> Home
    const startMissionTriggerBtn = document.getElementById('start-mission-trigger');
    if (startMissionTriggerBtn) {
        startMissionTriggerBtn.addEventListener('click', () => {
            const instrOverlayElem = document.getElementById('instructions-overlay');
            if (instrOverlayElem) instrOverlayElem.style.opacity = '0';
            setTimeout(() => {
                if (instrOverlayElem) instrOverlayElem.style.display = 'none';
                if (mainContent) {
                    mainContent.classList.remove('hidden');
                    mainContent.classList.add('visible');
                }
                initializeHUD();
            }, 800);
        });
    }

    // --- Hero Interactivity ---
    const terminal = document.getElementById('live-terminal');
    const logs = [
        "FETCHING_SATELLITE_DATA...",
        "DECRYPTING_PACKET_STREAM...",
        "TRIANGULATING_TARGET_VECTOR...",
        "ACCESSING_LOCAL_GRID_08...",
        "PATCHING_INTO_CCTV_FEED...",
        "NEURAL_LINK_ESTABLISHED",
        "ANALYZING_VISUAL_MARKERS...",
        "SIGNAL_STRENGTH: NOMINAL",
        "ANOMALY_DETECTED: SEC_04",
        "BYPASSING_FIREWALL_v2.1..."
    ];

    let logIndex = 0;
    if (terminal) {
        setInterval(() => {
            const line = document.createElement('p');
            line.classList.add('terminal-line');
            line.innerText = `> ${logs[logIndex]}`;
            terminal.appendChild(line);

            if (terminal.children.length > 5) {
                terminal.removeChild(terminal.firstChild);
            }

            logIndex = (logIndex + 1) % logs.length;
        }, 2000);
    }

    // Dynamic HUD Coordinates
    const latSpan = document.getElementById('hud-lat');
    const lngSpan = document.getElementById('hud-long');

    if (latSpan && lngSpan) {
        setInterval(() => {
            const lat = (Math.random() * 180 - 90).toFixed(4);
            const lng = (Math.random() * 360 - 180).toFixed(4);
            latSpan.innerText = lat;
            lngSpan.innerText = lng;
        }, 3000);
    }

    function initializeHUD() {
        const hudInner = document.querySelector('.hud-inner');
        if (hudInner && !document.querySelector('.radar-sweep')) {
            const sweep = document.createElement('div');
            sweep.classList.add('radar-sweep');
            hudInner.appendChild(sweep);
        }
    }

    // Auth Tab Switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update button text based on mode
            const mode = tab.getAttribute('data-mode');
            if (loginTriggerBtn) {
                loginTriggerBtn.innerText = (mode === 'register') ? 'CREATE_ACCOUNT_CORE' : 'AUTHORIZE_ACCESS';
            }
            if (authFeedback) authFeedback.innerText = '';

            // Toggle Registration Only Fields
            const regOnlyFields = document.querySelectorAll('.reg-only');
            regOnlyFields.forEach(field => {
                field.style.display = (mode === 'register') ? 'block' : 'none';
            });
        });
    });

    // --- Challenge Logic (Firebase) ---
    document.querySelectorAll('.challenge-card').forEach(card => {
        card.addEventListener('click', () => {
            const data = card.dataset;
            modalTitle.innerText = data.title;
            modalDesc.innerText = data.desc;
            modalDiff.innerText = data.diff;
            modalDownload.dataset.file = data.img;
            modal.dataset.currentId = data.id;

            // Reset Flag UI
            if (flagInput) flagInput.value = '';
            if (flagFeedback) flagFeedback.innerText = '';

            // Setup Timer & Start Screen
            missionAttempts = 0;
            if (timerInterval) clearInterval(timerInterval);

            const currentSolved = JSON.parse(localStorage.getItem('solvedChallenges') || '[]');
            const savedStart = localStorage.getItem(`mission_start_${data.id}`);

            if (currentSolved.includes(data.id)) {
                // Already solved
                modalStartScreen.classList.add('hidden');
                modalContent.classList.remove('hidden');
                timerDisplay.innerText = 'MISSION_COMPLETE';
            } else if (savedStart) {
                // Check if already timed out (1 hour = 3600s)
                const elapsedSinceStart = (Date.now() - parseInt(savedStart)) / 1000;
                if (elapsedSinceStart >= 3600) {
                    // Mission timed out - allow restart
                    localStorage.removeItem(`mission_start_${data.id}`);
                    modalStartScreen.classList.remove('hidden');
                    modalContent.classList.add('hidden');
                    timerDisplay.innerText = 'TIME_ELAPSED: 00:00';
                } else {
                    // Resume Mission
                    modalStartScreen.classList.add('hidden');
                    modalContent.classList.remove('hidden');
                    resumeMissionTimer(data.id, savedStart);
                }
            } else {
                // Fresh Start Screen
                modalStartScreen.classList.remove('hidden');
                modalContent.classList.add('hidden');
                timerDisplay.innerText = 'TIME_ELAPSED: 00:00';
            }

            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        });
    });

    function resumeMissionTimer(id, savedStart) {
        startTime = parseInt(savedStart);
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);

            // 1-Hour Timeout (3600 seconds)
            if (elapsed >= 3600) {
                clearInterval(timerInterval);
                timerDisplay.innerText = 'MISSION_TIMEOUT';
                localStorage.removeItem(`mission_start_${id}`);
                // Provide a way to restart after some time or on next open
                return;
            }

            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            const hrs = Math.floor(elapsed / 3600);

            if (hrs > 0) {
                timerDisplay.innerText = `TIME: ${hrs}h ${mins % 60}m ${secs}s`;
            } else {
                timerDisplay.innerText = `TIME: ${mins}:${secs}`;
            }
        }, 1000);
    }

    // --- Start Mission Logic ---
    if (startMissionBtn) {
        startMissionBtn.addEventListener('click', () => {
            const id = modal.dataset.currentId;
            modalStartScreen.classList.add('hidden');
            modalContent.classList.remove('hidden');

            const now = Date.now();
            localStorage.setItem(`mission_start_${id}`, now);
            resumeMissionTimer(id, now);
        });
    }

    // --- Close Modal & Cleanup ---
    const modalCloseBtn = document.querySelector('.modal-close');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (modal) {
                modal.classList.add('hidden');
                setTimeout(() => { modal.style.display = 'none'; }, 600);
            }
        });
    }

    // --- Flag Submission Logic ---
    if (submitFlagBtn) {
        submitFlagBtn.addEventListener('click', async () => {
            const challengeId = modal.dataset.currentId;
            const enteredFlag = flagInput.value.trim();
            let isCorrect = false;
            missionAttempts++;

            const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normEntered = normalize(enteredFlag);

            const checks = {
                'module_01': () => normEntered === normalize("Millicent Garrett Fawcett and (london, unitedkindom)") || enteredFlag.toLowerCase() === "millicent garrett fawcett and (london, unitedkindom)",
                'module_02': () => normEntered === normalize("mahatma gadhi") || normEntered === normalize("mahatma gandhi"),
                'module_03': () => ["12minutes", "12mins", "12"].includes(normEntered),
                'module_04': () => normEntered.includes("6.9069") && normEntered.includes("79.8689"),
                'module_05': () => normEntered === normalize("phare du risbon") || normEntered === normalize("phare du risban")
            };

            if (checks[challengeId]()) {
                isCorrect = true;
            } else {
                isCorrect = (enteredFlag === challengeFlags[challengeId]);
            }

            if (isCorrect) {
                if (timerInterval) clearInterval(timerInterval);
                const timeTaken = Math.floor((Date.now() - startTime) / 1000);

                // Scoring Logic: Start with 1000, lose 50 per incorrect attempt, lose 1 per 2 seconds
                const score = Math.max(100, 1000 - (missionAttempts - 1) * 50 - Math.floor(timeTaken / 2));

                // Advanced Tier Rating
                let tier = 'C';
                if (score >= 900) tier = 'S';
                else if (score >= 750) tier = 'A';
                else if (score >= 500) tier = 'B';

                flagFeedback.innerText = `ACCESS_GRANTED // FLAG_VERIFIED // TIER: ${tier}`;
                flagFeedback.style.color = 'var(--accent-secondary)';

                localStorage.removeItem(`mission_start_${challengeId}`);
                await saveProgressFirebase(challengeId, timeTaken, score, tier);
            } else {
                flagFeedback.innerText = 'ACCESS_DENIED // INVALID_TOKEN';
                flagFeedback.style.color = '#ff4d4d';
            }
        });
    }

    async function saveProgressFirebase(id, timeTaken, score, tier) {
        const username = localStorage.getItem('currentUsername');
        if (!username) return;

        const snapshot = await get(ref(db, `users/${username}`));
        const user = snapshot.val();

        const solvedChallenges = user.solvedChallenges || [];
        if (!solvedChallenges.includes(id)) {
            solvedChallenges.push(id);
        }

        const challengeDetails = user.challengeDetails || {};
        challengeDetails[id] = { timeTaken, score, tier, solvedAt: new Date().toISOString() };

        const totalPoints = Object.values(challengeDetails).reduce((sum, d) => sum + d.score, 0);

        await update(ref(db, `users/${username}`), {
            solvedChallenges, challengeDetails, totalPoints,
            lastActive: new Date().toISOString()
        });
    }

    function updateChallengeUI() {
        const solved = JSON.parse(localStorage.getItem('solvedChallenges') || '[]');
        document.querySelectorAll('.challenge-card').forEach(card => {
            if (solved.includes(card.dataset.id)) {
                card.classList.add('solved');
                const btn = card.querySelector('.btn-text');
                if (btn) btn.innerText = 'MISSION_COMPLETE ✓';
            }
        });
    }

    // Initial UI Update
    updateChallengeUI();

    // Forced Download Logic (Simplifed via .intel extension)
    if (modalDownload) {
        modalDownload.addEventListener('click', (e) => {
            e.preventDefault();
            const fileName = modalDownload.dataset.file;

            const a = document.createElement('a');
            a.href = fileName;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    // Scroll Animation Observer (unchanged logic)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('animate-reveal');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card-tactical, .challenge-card, .section-title').forEach(el => observer.observe(el));

    function listenToAdminData() {
        onValue(ref(db, 'users'), (snapshot) => {
            const usersData = snapshot.val() || {};
            const userList = Object.keys(usersData).map(username => ({
                username, ...usersData[username]
            })).filter(u => u.role !== 'admin');

            renderAdminDashboard(userList);
        });
    }

    function renderAdminDashboard(userList) {
        // Update Stats
        const statActive = document.getElementById('stat-active-operators');
        const statMissions = document.getElementById('stat-missions-completed');

        if (statActive) statActive.innerText = userList.length;
        if (statMissions) {
            const totalMissions = userList.reduce((sum, user) => sum + (user.solvedChallenges?.length || 0), 0);
            statMissions.innerText = totalMissions;
        }

        // Leaderboard
        const leaderboardBody = document.getElementById('leaderboard-body');
        if (leaderboardBody) {
            leaderboardBody.innerHTML = '';

            // Sort by points desc
            userList.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

            userList.forEach((user, index) => {
                const row = document.createElement('tr');
                const rank = index + 1;
                let rankClass = '';
                if (rank === 1) rankClass = 'rank-gold';
                else if (rank === 2) rankClass = 'rank-silver';
                else if (rank === 3) rankClass = 'rank-bronze';

                const level = (user.totalPoints || 0) > 3000 ? 'ELITE' : ((user.totalPoints || 0) > 1500 ? 'VETERAN' : 'RECON');
                const statusTag = `<span class="tag-online">ACTIVE</span>`;

                row.innerHTML = `
                    <td class="${rankClass}">#${rank.toString().padStart(2, '0')}</td>
                    <td class="mono">${user.username}</td>
                    <td>${level}</td>
                    <td>${(user.solvedChallenges?.length || 0)}/05</td>
                    <td>${user.totalPoints || 0}</td>
                    <td>${statusTag}</td>
                `;
                leaderboardBody.appendChild(row);
            });

            if (userList.length === 0) {
                leaderboardBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-dim);">NO_OPERATOR_DATA_AVAILABLE</td></tr>';
            }
        }
    }

    // --- Admin Export & Monitoring Logic ---
    const downloadBtn = document.getElementById('download-excel');
    const refreshBtn = document.getElementById('refresh-data');
    const examineBtn = document.getElementById('examine-data');
    const previewModal = document.getElementById('data-preview-modal');
    const closePreviewBtn = document.getElementById('close-preview');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadAsExcel);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Data is now real-time via onValue, so just trigger feedback
            if (authFeedback) {
                authFeedback.innerText = 'SUCCESS: DATA_SYNC_COMPLETE';
                authFeedback.style.color = 'var(--accent-secondary)';
                setTimeout(() => { if (authFeedback.innerText.includes('SYNC')) authFeedback.innerText = ''; }, 3000);
            }
        });
    }
    if (examineBtn) {
        examineBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openDataPreview();
        });
    }
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
            if (previewModal) previewModal.classList.add('hidden');
        });
    }

    async function downloadAsExcel() {
        const snapshot = await get(ref(db, 'users'));
        const usersData = snapshot.val() || {};
        const userList = Object.keys(usersData).map(username => ({
            username,
            ...usersData[username]
        })).filter(u => u.role !== 'admin');

        const headers = ["IDENTIFIER", "ROLE", "GMAIL", "PHONE", "SOLVED_COUNT", "INTEL_POINTS", "SOLVED_IDS", "LAST_ACTIVE"];
        const rows = userList.map(u => [
            u.username,
            u.role,
            u.email || 'N/A',
            u.phone || 'N/A',
            (u.solvedChallenges?.length || 0),
            (u.totalPoints || 0),
            (u.solvedChallenges?.join("|") || ''),
            u.lastActive
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `OPERATOR_LOG_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function openDataPreview() {
        const snapshot = await get(ref(db, 'users'));
        const usersData = snapshot.val() || {};
        const userList = Object.keys(usersData).map(username => ({
            username,
            ...usersData[username]
        })).filter(u => u.role !== 'admin');

        const headers = ["ID", "EMAIL", "PHONE", "MISSIONS", "POINTS", "LAST_ACTIVE"];
        const headerRow = document.getElementById('preview-headers');
        const body = document.getElementById('preview-body');

        if (headerRow) {
            headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');
        }

        if (body) {
            body.innerHTML = userList.map(u => `
                <tr>
                    <td class="mono">${u.username}</td>
                    <td>${u.email || '---'}</td>
                    <td>${u.phone || '---'}</td>
                    <td>${(u.solvedChallenges?.length || 0)}</td>
                    <td>${(u.totalPoints || 0)}</td>
                    <td style="font-size: 0.6rem;">${u.lastActive}</td>
                </tr>
            `).join('');

            if (userList.length === 0) {
                body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">NO_DATA</td></tr>';
            }
        }

        if (previewModal) {
            previewModal.classList.remove('hidden');
        }
    }
});
