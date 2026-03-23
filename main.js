// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDROsyq05_2_yOSM36e_fMZWAAMDMlI3Zw",
    authDomain: "spotandsolve-event.firebaseapp.com",
    databaseURL: "https://spotandsolve-event-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "spotandsolve-event",
    storageBucket: "spotandsolve-event.firebasestorage.app",
    messagingSenderId: "376969722817",
    appId: "1:376969722817:web:18409d04a8fb1c28ae4d40"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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

    // --- Error Handling Failsafe ---
    window.onerror = function(msg, url, line) {
        console.error("GLOBAL_FAULT_DETECTED:", msg, "at", url, ":", line);
        // FORCE DISMISS INTRO IF STUCK
        if (cred1 && cred1.style.display !== 'none') {
            setTimeout(dismissIntroForce, 5000);
        }
    };

    function dismissIntroForce() {
        [cred1, cred2, introOverlay].forEach(el => { if(el) { el.style.opacity = '0'; setTimeout(() => el.style.display='none', 800); }});
        if (loginOverlay) loginOverlay.classList.remove('hidden');
    }

    // --- Challenge Data & Flags ---
    const challengeFlags = {
        'module_01': 'MIL_GAR_FAW_LDN_UK', 
        'module_02': 'mahatma gadhi',
        'module_03': '12 minutes',
        'module_04': '6.9069n79.8689e',
        'module_05': 'phare_du_risban'
    };

    // --- Session & Timer State ---
    let startTime = null;
    let timerInterval = null;
    let missionAttempts = 0;

    const challengeModal = document.getElementById('challenge-modal');
    const modalStartScreen = document.getElementById('modal-start-screen');
    const modalContent = document.getElementById('modal-mission-content');
    const startMissionBtn = document.getElementById('start-mission-btn');
    const timerDisplay = document.getElementById('modal-timer');
    
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalDiff = document.getElementById('modal-diff');
    const modalDownload = document.getElementById('modal-download');
    const modal = challengeModal;

    // --- Core Data Initialization (Compat) ---
    function initData() {
        console.log("FIREBASE_INIT: ATTEMPTING_CONNECTION...");
        db.ref('users/admin').once('value').then(snapshot => {
            console.log("FIREBASE_INIT: CONNECTION_SUCCESSFUL");
            if (!snapshot.exists()) {
                db.ref('users/admin').set({
                    password: 'admin123',
                    role: 'admin',
                    solvedChallenges: [],
                    challengeDetails: {},
                    totalPoints: 0,
                    status: 'ACTIVE',
                    lastActive: new Date().toISOString()
                }).catch(e => console.error("INIT_ADMIN_SET_FAILED:", e));
            }
        }).catch(err => {
            console.error("FIREBASE_INIT_FAILED:", err);
            if (authFeedback) {
                authFeedback.style.color = '#ff4d4d';
                authFeedback.innerText = `DB_CONNECTION_ERROR: ${err.code || 'UNKNOWN'}`;
            }
        });
    }
    initData();

    // --- Session Management ---
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');

    if (isLoggedIn === 'true') {
        [cred1, cred2, introOverlay, loginOverlay, instrOverlay].forEach(el => {
            if(el) {
                el.style.display = 'none';
                el.classList.add('hidden');
            }
        });
        
        if (userRole === 'admin' && !window.location.href.includes('admin.html')) {
            window.location.href = 'admin.html';
        } else if (window.location.href.includes('admin.html')) {
            if (userRole !== 'admin') {
                window.location.href = 'index.html';
            } else {
                listenToAdminData();
            }
        } else {
            if (mainContent) {
                mainContent.classList.remove('hidden');
                mainContent.classList.add('visible');
            }
            initializeHUD();
            syncUserDataLocally();
        }
    } else {
        if (window.location.href.includes('admin.html')) {
            window.location.href = 'index.html';
        } else if (cred1) {
            startCinematicSequence();
        }
    }

    function syncUserDataLocally() {
        const username = localStorage.getItem('currentUsername');
        if (!username) return;
        
        db.ref(`users/${username}`).on('value', (snapshot) => {
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
        const cred1Text = cred1.querySelector('.reveal-fade');
        if (cred1Text) cred1Text.classList.add('animate-reveal-fade');

        setTimeout(() => {
            if (cred1) cred1.style.opacity = '0';
            setTimeout(() => {
                if (cred1) cred1.style.display = 'none';
                if (cred2) {
                    cred2.classList.remove('hidden');
                    const cred2Text = cred2.querySelector('.reveal-fade');
                    if (cred2Text) cred2Text.classList.add('animate-reveal-fade');
                }
                
                setTimeout(() => {
                    if (cred2) cred2.style.opacity = '0';
                    setTimeout(() => {
                        if (cred2) cred2.style.display = 'none';
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
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@!&*";
        const titleText = title.innerText;
        let iteration = 0;

        const interval = setInterval(() => {
            if (!title) {
                clearInterval(interval);
                return;
            }
            title.innerText = title.innerText.split("")
                .map((char, index) => {
                    if(index < iteration) return titleText[index];
                    return chars[Math.floor(Math.random() * 26)];
                })
                .join("");
            
            if(iteration >= titleText.length) clearInterval(interval);
            iteration += 1 / 3;
        }, 50);

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
                if (loginOverlay) loginOverlay.classList.remove('hidden');
            }, 1000);
        }
    }

    // --- Auth Logic ---
    const loginTriggerBtn = document.getElementById('login-trigger');
    const authFeedback = document.getElementById('auth-feedback');
    
    if (loginTriggerBtn) {
        loginTriggerBtn.addEventListener('click', () => {
            const activeTab = document.querySelector('.auth-tab.active');
            const mode = activeTab ? activeTab.getAttribute('data-mode') : 'login';
            
            const username = document.getElementById('auth-id')?.value.trim();
            const password = document.getElementById('auth-token')?.value.trim();
            const gmail = document.getElementById('auth-gmail')?.value.trim();
            const phone = document.getElementById('auth-phone')?.value.trim();
            
            if (authFeedback) authFeedback.innerText = '';

            if (mode === 'register') {
                if (!username || !password || !gmail || !phone) {
                    if (authFeedback) authFeedback.innerText = 'ERROR: ALL_FIELDS_REQUIRED';
                    return;
                }
                
                db.ref(`users/${username}`).once('value').then((snapshot) => {
                    if (snapshot.exists()) {
                        if (authFeedback) authFeedback.innerText = 'ERROR: USERNAME_EXISTS';
                        return;
                    }
                    
                    db.ref(`users/${username}`).set({
                        password, email: gmail, phone, role: 'player',
                        solvedChallenges: [], challengeDetails: {}, totalPoints: 0,
                        status: 'ACTIVE', lastActive: new Date().toISOString()
                    }).then(() => {
                        if (authFeedback) {
                            authFeedback.innerText = 'SUCCESS: ACCOUNT_CREATED';
                            authFeedback.style.color = 'var(--accent-secondary)';
                        }
                        document.querySelector('.auth-tab[data-mode="login"]')?.click();
                    }).catch(err => {
                        console.error("REG_SET_ERROR:", err);
                        if (authFeedback) {
                            authFeedback.style.color = '#ff4d4d';
                            authFeedback.innerText = `REG_ERROR: ${err.code || 'PERMISSION_DENIED'}`;
                        }
                    });
                }).catch(err => {
                    console.error("REG_CHECK_ERROR:", err);
                    if (authFeedback) {
                        authFeedback.style.color = '#ff4d4d';
                        authFeedback.innerText = `DB_ERROR: ${err.code || 'PERMISSION_DENIED'}`;
                    }
                });
                return;
            }

            // Login
            db.ref(`users/${username}`).once('value').then(snapshot => {
                if (!snapshot.exists() || snapshot.val().password !== password) {
                    if (authFeedback) {
                        authFeedback.style.color = '#ff4d4d';
                        authFeedback.innerText = 'ERROR: INVALID_CREDENTIALS';
                    }
                    return;
                }

                const user = snapshot.val();
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('currentUsername', username);
                
                if (authFeedback) {
                    authFeedback.style.color = 'var(--accent-secondary)';
                    authFeedback.innerText = 'SUCCESS: AUTH_GRANTED';
                }

                if (loginOverlay) loginOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (loginOverlay) {
                        loginOverlay.style.display = 'none';
                        loginOverlay.classList.add('hidden');
                    }
                    if (user.role === 'admin') window.location.href = 'admin.html';
                    else {
                        instrOverlay?.classList.remove('hidden');
                        syncUserDataLocally();
                    }
                }, 800);
            }).catch(err => {
                console.error("LOGIN_ERROR:", err);
                if (authFeedback) {
                    authFeedback.style.color = '#ff4d4d';
                    authFeedback.innerText = `ERROR: ${err.code || 'CONNECTION_FAILED'}`;
                    if (err.code === 'PERMISSION_DENIED') {
                        authFeedback.innerText += " - CHECK_FIREBASE_RULES";
                    }
                }
            });
        });
    }

    document.getElementById('logout-trigger')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'index.html';
    });

    document.getElementById('start-mission-trigger')?.addEventListener('click', () => {
        if (instrOverlay) instrOverlay.style.opacity = '0';
        setTimeout(() => {
            if (instrOverlay) instrOverlay.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('hidden');
                mainContent.classList.add('visible');
            }
            initializeHUD();
        }, 800);
    });

    // --- Hero Interactivity ---
    const terminal = document.getElementById('live-terminal');
    const logs = ["FETCHING_SATELLITE_DATA...", "DECRYPTING_PACKET_STREAM...", "TRIANGULATING_TARGET_VECTOR...", "ACCESSING_LOCAL_GRID_08...", "PATCHING_INTO_CCTV_FEED...", "NEURAL_LINK_ESTABLISHED", "ANALYZING_VISUAL_MARKERS...", "SIGNAL_STRENGTH: NOMINAL", "ANOMALY_DETECTED: SEC_04", "BYPASSING_FIREWALL_v2.1..."];
    let logIndex = 0;
    if (terminal) {
        setInterval(() => {
            const line = document.createElement('p');
            line.classList.add('terminal-line');
            line.innerText = `> ${logs[logIndex]}`;
            terminal.appendChild(line);
            if(terminal.children.length > 5) terminal.removeChild(terminal.firstChild);
            logIndex = (logIndex + 1) % logs.length;
        }, 2000);
    }

    const latSpan = document.getElementById('hud-lat');
    const lngSpan = document.getElementById('hud-long');
    if (latSpan && lngSpan) {
        setInterval(() => {
            latSpan.innerText = (Math.random() * 180 - 90).toFixed(4);
            lngSpan.innerText = (Math.random() * 360 - 180).toFixed(4);
        }, 3000);
    }

    function initializeHUD() {
        const hudInner = document.querySelector('.hud-inner');
        if(hudInner && !document.querySelector('.radar-sweep')) {
            const sweep = document.createElement('div');
            sweep.classList.add('radar-sweep');
            hudInner.appendChild(sweep);
        }
    }

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const mode = tab.getAttribute('data-mode');
            if (loginTriggerBtn) loginTriggerBtn.innerText = (mode === 'register') ? 'CREATE_ACCOUNT_CORE' : 'AUTHORIZE_ACCESS';
            if (authFeedback) authFeedback.innerText = '';
            document.querySelectorAll('.reg-only').forEach(f => f.style.display = (mode === 'register') ? 'block' : 'none');
        });
    });

    // --- Challenge Logic ---
    document.querySelectorAll('.challenge-card').forEach(card => {
        card.addEventListener('click', () => {
            const data = card.dataset;
            modalTitle.innerText = data.title;
            modalDesc.innerText = data.desc;
            modalDiff.innerText = data.diff;
            modalDownload.dataset.file = data.img;
            modal.dataset.currentId = data.id;

            if(flagInput) flagInput.value = '';
            if(flagFeedback) flagFeedback.innerText = '';
            missionAttempts = 0;
            if (timerInterval) clearInterval(timerInterval);
            
            const solved = JSON.parse(localStorage.getItem('solvedChallenges') || '[]');
            const savedStart = localStorage.getItem(`mission_start_${data.id}`);

            if (solved.includes(data.id)) {
                modalStartScreen.classList.add('hidden');
                modalContent.classList.remove('hidden');
                timerDisplay.innerText = 'MISSION_COMPLETE';
            } else if (savedStart) {
                const elapsed = (Date.now() - parseInt(savedStart)) / 1000;
                if (elapsed >= 3600) {
                    localStorage.removeItem(`mission_start_${data.id}`);
                    modalStartScreen.classList.remove('hidden');
                    modalContent.classList.add('hidden');
                    timerDisplay.innerText = 'TIME_ELAPSED: 00:00';
                } else {
                    modalStartScreen.classList.add('hidden');
                    modalContent.classList.remove('hidden');
                    resumeMissionTimer(data.id, savedStart);
                }
            } else {
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
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed >= 3600) {
                clearInterval(timerInterval);
                timerDisplay.innerText = 'MISSION_TIMEOUT';
                localStorage.removeItem(`mission_start_${id}`);
                return;
            }
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            const hrs = Math.floor(elapsed / 3600);
            timerDisplay.innerText = hrs > 0 ? `TIME: ${hrs}h ${mins % 60}m ${secs}s` : `TIME: ${mins}:${secs}`;
        }, 1000);
    }

    startMissionBtn?.addEventListener('click', () => {
        const id = modal.dataset.currentId;
        modalStartScreen.classList.add('hidden');
        modalContent.classList.remove('hidden');
        const now = Date.now();
        localStorage.setItem(`mission_start_${id}`, now);
        resumeMissionTimer(id, now);
    });

    document.querySelector('.modal-close')?.addEventListener('click', () => {
        modal.classList.add('hidden');
        setTimeout(() => { modal.style.display = 'none'; }, 600);
    });

    submitFlagBtn?.addEventListener('click', () => {
        const challengeId = modal.dataset.currentId;
        const enteredFlag = flagInput.value.trim();
        let isCorrect = false;
        missionAttempts++;

        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normEntered = normalize(enteredFlag);
        
        const checks = {
            'module_01': () => normEntered === normalize("Millicent Garrett Fawcett and (london, unitedkindom)"),
            'module_02': () => normEntered === normalize("mahatma gadhi") || normEntered === normalize("mahatma gandhi"),
            'module_03': () => ["12minutes", "12mins", "12"].includes(normEntered),
            'module_04': () => normEntered.includes("6.9069") && normEntered.includes("79.8689"),
            'module_05': () => normEntered === normalize("phare du risbon") || normEntered === normalize("phare du risban")
        };

        if (checks[challengeId] && checks[challengeId]()) isCorrect = true;
        else if (enteredFlag === challengeFlags[challengeId]) isCorrect = true;

        if (isCorrect) {
            if (timerInterval) clearInterval(timerInterval);
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);
            const score = Math.max(100, 1000 - (missionAttempts - 1) * 50 - Math.floor(timeTaken / 2));
            const tier = score >= 900 ? 'S' : (score >= 750 ? 'A' : (score >= 500 ? 'B' : 'C'));

            flagFeedback.innerText = `ACCESS_GRANTED // FLAG_VERIFIED // TIER: ${tier}`;
            flagFeedback.style.color = 'var(--accent-secondary)';
            
            localStorage.removeItem(`mission_start_${challengeId}`);
            saveProgressFirebase(challengeId, timeTaken, score, tier);
        } else {
            flagFeedback.innerText = 'ACCESS_DENIED // INVALID_TOKEN';
            flagFeedback.style.color = '#ff4d4d';
        }
    });

    function saveProgressFirebase(id, timeTaken, score, tier) {
        const username = localStorage.getItem('currentUsername');
        if (!username) return;

        db.ref(`users/${username}`).once('value').then(snapshot => {
            const user = snapshot.val();
            const solvedChallenges = user.solvedChallenges || [];
            if (!solvedChallenges.includes(id)) solvedChallenges.push(id);
            
            const challengeDetails = user.challengeDetails || {};
            challengeDetails[id] = { timeTaken, score, tier, solvedAt: new Date().toISOString() };
            
            const totalPoints = Object.values(challengeDetails).reduce((sum, d) => sum + d.score, 0);
            
            db.ref(`users/${username}`).update({
                solvedChallenges, challengeDetails, totalPoints,
                lastActive: new Date().toISOString()
            });
        });
    }

    function updateChallengeUI() {
        const solved = JSON.parse(localStorage.getItem('solvedChallenges') || '[]');
        document.querySelectorAll('.challenge-card').forEach(card => {
            if (solved.includes(card.dataset.id)) {
                card.classList.add('solved');
                const btn = card.querySelector('.btn-text');
                if(btn) btn.innerText = 'MISSION_COMPLETE ✓';
            }
        });
    }

    function listenToAdminData() {
        db.ref('users').on('value', (snapshot) => {
            const usersData = snapshot.val() || {};
            const userList = Object.keys(usersData).map(username => ({
                username, ...usersData[username]
            })).filter(u => u.role !== 'admin');
            
            renderAdminDashboard(userList);
        });
    }

    function renderAdminDashboard(userList) {
        const statActive = document.getElementById('stat-active-operators');
        const statMissions = document.getElementById('stat-missions-completed');
        if(statActive) statActive.innerText = userList.length;
        if(statMissions) statMissions.innerText = userList.reduce((sum, u) => sum + (u.solvedChallenges?.length || 0), 0);
        
        const leaderboardBody = document.getElementById('leaderboard-body');
        if (leaderboardBody) {
            userList.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
            leaderboardBody.innerHTML = userList.map((user, index) => {
                const rank = index + 1;
                const level = user.totalPoints > 3000 ? 'ELITE' : (user.totalPoints > 1500 ? 'VETERAN' : 'RECON');
                return `<tr>
                    <td class="${rank <= 3 ? ['rank-gold','rank-silver','rank-bronze'][rank-1] : ''}">#${rank.toString().padStart(2, '0')}</td>
                    <td class="mono">${user.username}</td>
                    <td>${level}</td>
                    <td>${(user.solvedChallenges?.length || 0)}/05</td>
                    <td>${user.totalPoints || 0}</td>
                    <td><span class="tag-online">ACTIVE</span></td>
                </tr>`;
            }).join('') || '<tr><td colspan="6">NO_OPERATOR_DATA</td></tr>';
        }
    }

    // Export & Monitoring
    document.getElementById('download-excel')?.addEventListener('click', () => {
        db.ref('users').once('value').then(snapshot => {
            const usersData = snapshot.val() || {};
            const userList = Object.keys(usersData).map(username => ({
                username, ...usersData[username]
            })).filter(u => u.role !== 'admin');

            const headers = ["IDENTIFIER", "GMAIL", "PHONE", "SOLVED_COUNT", "POINTS", "LAST_ACTIVE"];
            const rows = userList.map(u => [u.username, u.email || 'N/A', u.phone || 'N/A', (u.solvedChallenges?.length || 0), u.totalPoints || 0, u.lastActive]);
            let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", `OPERATOR_LOG.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    document.getElementById('examine-data')?.addEventListener('click', (e) => {
        e.preventDefault();
        openDataPreview();
    });

    function openDataPreview() {
        db.ref('users').once('value').then(snapshot => {
            const usersData = snapshot.val() || {};
            const userList = Object.keys(usersData).map(username => ({ username, ...usersData[username] })).filter(u => u.role !== 'admin');
            
            const head = document.getElementById('preview-headers');
            if (head) head.innerHTML = ["ID", "EMAIL", "PHONE", "MISSIONS", "POINTS"].map(h => `<th>${h}</th>`).join('');
            
            const body = document.getElementById('preview-body');
            if (body) body.innerHTML = userList.map(u => `<tr>
                <td class="mono">${u.username}</td>
                <td>${u.email || '---'}</td>
                <td>${u.phone || '---'}</td>
                <td>${u.solvedChallenges?.length || 0}</td>
                <td>${u.totalPoints || 0}</td>
            </tr>`).join('') || '<tr><td colspan="5">NO_DATA</td></tr>';
            
            document.getElementById('data-preview-modal')?.classList.remove('hidden');
        });
    }

    const closePrev = document.getElementById('close-preview');
    if (closePrev) {
        closePrev.addEventListener('click', () => {
            document.getElementById('data-preview-modal')?.classList.add('hidden');
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('animate-reveal'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card-tactical, .challenge-card, .section-title').forEach(el => observer.observe(el));
});
