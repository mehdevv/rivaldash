/**
 * Admin Dashboard - Game Management System
 * Handles authentication, player management, and quest management
 */

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.players = [];
        this.quests = [];
        this.leaderboard = [];
        this.daygrades = {}; // Store daily grades by date
        this.missionSubmissions = {}; // Store daily mission submissions by date
        this.feedbackHistory = []; // Store feedback history
        this.currentTab = 'daygrades'; // Track current active tab
        
        this.init();
        this.setupMidnightRefresh();
    }
    
    async init() {
        console.log('🚀 Initializing Admin Dashboard...');
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Debug Firebase connection
        this.debugFirebaseConnection();
        
        // Setup authentication listener
        this.setupAuthListener();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    debugFirebaseConnection() {
        console.log('🔍 Debugging Firebase connection...');
        console.log('Firebase Auth:', window.auth);
        console.log('Firebase DB:', window.db);
        console.log('Current User:', window.auth?.currentUser);
        console.log('Auth Domain:', window.auth?.config?.authDomain);
        console.log('Project ID:', window.auth?.config?.projectId);
        
        // Make debug function available globally
        window.debugAdminFirebase = () => {
            console.log('=== ADMIN DASHBOARD FIREBASE DEBUG ===');
            console.log('Auth:', window.auth);
            console.log('DB:', window.db);
            console.log('Current User:', window.auth?.currentUser);
            console.log('Auth State:', window.auth?.currentUser ? 'Logged In' : 'Not Logged In');
            
            if (window.auth?.currentUser) {
                console.log('User Email:', window.auth.currentUser.email);
                console.log('User UID:', window.auth.currentUser.uid);
            }
        };
        
        console.log('✅ Firebase debug function available as window.debugAdminFirebase()');
    }
    
    waitForFirebase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.auth && window.db) {
                    console.log('✅ Firebase is ready');
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    setupAuthListener() {
        window.onAuthStateChanged(window.auth, async (user) => {
            if (user) {
                console.log('👤 Admin logged in:', user.email);
                this.currentUser = user;
                await this.checkAdminRole(user);
            } else {
                console.log('👋 Admin not logged in, redirecting to login page');
                this.currentUser = null;
                this.redirectToLogin();
            }
        });
    }
    
    async checkAdminRole(user) {
        try {
            console.log('🔍 Checking admin role for user:', user.email, 'UID:', user.uid);
            
            const adminDoc = await window.getDoc(window.doc(window.db, 'admin_users', user.uid));
            
            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                console.log('✅ Admin role verified');
                this.showDashboard();
                await this.loadData();
            } else {
                console.log('❌ Admin role not found, attempting to create...');
                
                // Check if this is the default admin user or any admin user
                if (user.email === 'adminfaouzi@gmail.com' || user.email.includes('admin')) {
                    console.log('🔧 Creating admin role for admin user...');
                    await this.createAdminRole(user);
                } else {
                        console.log('❌ Not an admin user, redirecting to login');
                    this.showError('Access denied. Admin privileges required.');
                    await window.signOut(window.auth);
                        this.redirectToLogin();
                }
            }
        } catch (error) {
            console.error('❌ Error checking admin role:', error);
            
            // If there's an error, try to create admin role for default admin
            if (user.email === 'adminfaouzi@gmail.com') {
                console.log('🔧 Error occurred, attempting to create admin role...');
                try {
                    await this.createAdminRole(user);
                } catch (createError) {
                    console.error('❌ Failed to create admin role:', createError);
                    this.showError('Error setting up admin access. Please check Firebase configuration.');
                }
            } else {
                this.showError('Error verifying admin access.');
                this.redirectToLogin();
            }
        }
    }
    
    async createAdminRole(user) {
        try {
            console.log('🔧 Creating admin role document...');
            
            await window.setDoc(window.doc(window.db, 'admin_users', user.uid), {
                role: 'admin',
                email: user.email,
                createdAt: new Date().toISOString(),
                createdBy: 'system'
            });
            
            console.log('✅ Admin role created successfully');
            this.showDashboard();
            await this.loadData();
            
        } catch (error) {
            console.error('❌ Failed to create admin role:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // Players button
        const playersBtn = document.getElementById('playersButton');
        if (playersBtn) {
            playersBtn.addEventListener('click', () => this.goToPlayersPage());
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Add quest button
        const addQuestBtn = document.getElementById('addQuestBtn');
        if (addQuestBtn) {
            addQuestBtn.addEventListener('click', () => this.showQuestModal());
        }
        
        // Tab navigation
        const daygradesTab = document.getElementById('daygradesTab');
        if (daygradesTab) {
            daygradesTab.addEventListener('click', () => this.switchTab('daygrades'));
        }
        
        const feedbackTab = document.getElementById('feedbackTab');
        if (feedbackTab) {
            feedbackTab.addEventListener('click', () => this.switchTab('feedback'));
        }
        
        const missionsTab = document.getElementById('missionsTab');
        if (missionsTab) {
            missionsTab.addEventListener('click', () => this.switchTab('missions'));
        }
        
            // Add buttons for each tab
        
        const addFeedbackBtn = document.getElementById('addFeedbackBtn');
        if (addFeedbackBtn) {
            addFeedbackBtn.addEventListener('click', () => this.showFeedbackModal());
        }
        
        
        // Modal close buttons
        const closeQuestModal = document.getElementById('closeQuestModal');
        if (closeQuestModal) {
            closeQuestModal.addEventListener('click', () => this.hideQuestModal());
        }
        
        // Cancel buttons
        const cancelQuestBtn = document.getElementById('cancelQuestBtn');
        if (cancelQuestBtn) {
            cancelQuestBtn.addEventListener('click', () => this.hideQuestModal());
        }
        
        // Form submissions
        const questForm = document.getElementById('questForm');
        if (questForm) {
            questForm.addEventListener('submit', (e) => this.handleQuestSubmit(e));
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideQuestModal();
            }
        });
        
        // Success notification close button
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            closeNotification.addEventListener('click', () => this.hideSuccessNotification());
        }
        
        // Emoji selection handlers
        this.setupEmojiHandlers();
        
        // Start quest timer updates
        this.startQuestTimerUpdates();
    }
    
    async handleLogout() {
        try {
            await window.signOut(window.auth);
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    }
    
    redirectToLogin() {
        console.log('🔄 Redirecting to login page...');
        window.location.href = 'login.html';
    }
    
    showDashboard() {
        // Update admin name
        const adminName = document.getElementById('adminName');
        if (adminName && this.currentUser) {
            adminName.textContent = this.currentUser.email.split('@')[0];
        }
    }
    
    showError(message) {
        alert(message); // You can replace this with a better error display
    }
    
    // Email validation helper method
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Helper method to format last login date
    formatLastLogin(lastLoginDate) {
        if (!lastLoginDate) {
            return 'Never';
        }
        
        const date = new Date(lastLoginDate);
        const now = new Date();
        
        // Reset time to start of day for accurate day comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const loginDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = today - loginDay;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Setup emoji selection handlers
    setupEmojiHandlers() {
        const emojiOptions = document.querySelectorAll('.emoji-option');
        const questLogoInput = document.getElementById('questLogo');
        
        emojiOptions.forEach(option => {
            option.addEventListener('click', () => {
                if (questLogoInput) {
                    questLogoInput.value = option.dataset.emoji;
                }
            });
        });
    }
    
    // Start quest timer updates
    startQuestTimerUpdates() {
        // Update timers every second
        setInterval(() => {
            this.updateQuestTimers();
        }, 1000);
    }
    
    // Update quest timers
    updateQuestTimers() {
        const questItems = document.querySelectorAll('.quest-item');
        questItems.forEach(item => {
            const timerElement = item.querySelector('.quest-timer');
            if (timerElement && timerElement.dataset.endTime) {
                const endTime = new Date(timerElement.dataset.endTime);
                const now = new Date();
                const timeLeft = endTime - now;
                
                if (timeLeft <= 0) {
                    // Quest has expired - show time since expiration
                    const timeSinceExpiry = Math.abs(timeLeft);
                    const expiredText = this.formatTimeSinceExpiry(timeSinceExpiry);
                    timerElement.textContent = `Expired ${expiredText} ago`;
                    timerElement.className = 'quest-timer expired';
                    
                    // Add expired styling to the entire quest item
                    item.classList.add('quest-expired');
                } else {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                    
                    if (hours > 0) {
                        timerElement.textContent = `${hours}h ${minutes}m`;
                    } else if (minutes > 0) {
                        timerElement.textContent = `${minutes}m ${seconds}s`;
                    } else {
                        timerElement.textContent = `${seconds}s`;
                    }
                    
                    // Remove expired styling
                    item.classList.remove('quest-expired');
                    
                    // Change styling based on time remaining
                    if (timeLeft < 60000) { // Less than 1 minute
                        timerElement.className = 'quest-timer ending';
                    } else if (timeLeft < 3600000) { // Less than 1 hour
                        timerElement.className = 'quest-timer ending';
                    } else {
                        timerElement.className = 'quest-timer active';
                    }
                }
            }
        });
    }
    
    // Format quest time remaining
    formatQuestTimeRemaining(endTime) {
        const end = new Date(endTime);
        const now = new Date();
        const timeLeft = end - now;
        
        if (timeLeft <= 0) {
            const timeSinceExpiry = Math.abs(timeLeft);
            const expiredText = this.formatTimeSinceExpiry(timeSinceExpiry);
            return { text: `Expired ${expiredText} ago`, class: 'expired' };
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        let text;
        if (hours > 0) {
            text = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            text = `${minutes}m ${seconds}s`;
        } else {
            text = `${seconds}s`;
        }
        
        let className = 'active';
        if (timeLeft < 60000) { // Less than 1 minute
            className = 'ending';
        } else if (timeLeft < 3600000) { // Less than 1 hour
            className = 'ending';
        }
        
        return { text, class: className };
    }
    
    // Format time since expiry
    formatTimeSinceExpiry(timeSinceExpiry) {
        const days = Math.floor(timeSinceExpiry / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeSinceExpiry % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeSinceExpiry % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeSinceExpiry % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    showSuccessNotification(email, password) {
        const notification = document.getElementById('successNotification');
        const emailSpan = document.getElementById('createdEmail');
        const passwordSpan = document.getElementById('createdPassword');
        
        if (notification && emailSpan && passwordSpan) {
            emailSpan.textContent = email;
            passwordSpan.textContent = password;
            notification.classList.add('show');
        }
    }
    
    hideSuccessNotification() {
        const notification = document.getElementById('successNotification');
        if (notification) {
            notification.classList.remove('show');
        }
    }
    
    async loadData() {
        console.log('📊 Loading dashboard data...');
        
        try {
            // Load players first, then load leaderboard (which depends on players data)
            await this.loadPlayers();
            await this.loadLeaderboard();
            await this.loadQuests();
            await this.loadFeedback();
            await this.loadMissions();
            await this.loadDaygrades();
            
            console.log('✅ Dashboard data loaded');
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    async loadPlayers() {
        try {
            const playersSnapshot = await window.getDocs(window.collection(window.db, 'users'));
            this.players = [];
            
            playersSnapshot.forEach((doc) => {
                const playerData = doc.data();
                this.players.push({
                    id: doc.id,
                    ...playerData
                });
            });
            
            this.updateQuestPlayerSelect();
        } catch (error) {
            console.error('❌ Error loading players:', error);
        }
    }
    
    async loadQuests() {
        try {
            const questsSnapshot = await window.getDocs(window.collection(window.db, 'quests'));
            this.quests = [];
            
            questsSnapshot.forEach((doc) => {
                const questData = doc.data();
                // Only show active quests in the main list
                if (questData.status !== 'completed') {
                    this.quests.push({
                        id: doc.id,
                        ...questData
                    });
                }
            });
            
            this.renderQuests();
        } catch (error) {
            console.error('❌ Error loading quests:', error);
        }
    }
    
    async loadFeedback() {
        try {
            console.log('📝 Loading feedback data...');
            await this.loadFeedbackFromFirebase();
            this.renderFeedback();
        } catch (error) {
            console.error('❌ Error loading feedback:', error);
        }
    }
    
    async loadMissions() {
        try {
            console.log('🎯 Loading missions data...');
            await this.loadMissionsFromFirebase();
            this.renderMissions();
        } catch (error) {
            console.error('❌ Error loading missions:', error);
        }
    }
    
        async loadDaygrades() {
            try {
                console.log('📊 Loading daygrades data...');
                await this.loadDaygradesFromFirebase();
                this.renderDaygrades();
            } catch (error) {
                console.error('❌ Error loading daygrades:', error);
        }
    }
    
    async loadLeaderboard() {
        try {
            console.log('🏆 Loading leaderboard...');
            console.log('📊 Available players:', this.players.length);
            
            // Get top 5 players by level, then by experience
            const topPlayers = this.players
                .sort((a, b) => {
                    if (b.level !== a.level) {
                        return b.level - a.level;
                    }
                    return b.experience - a.experience;
                })
                .slice(0, 5);
            
            this.leaderboard = topPlayers;
            console.log('🏆 Leaderboard loaded with', topPlayers.length, 'players');
            this.renderLeaderboard();
        } catch (error) {
            console.error('❌ Error loading leaderboard:', error);
        }
    }
    
    renderLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) {
            console.warn('⚠️ Leaderboard list element not found');
            return;
        }
        
        console.log('🎨 Rendering leaderboard with', this.leaderboard.length, 'players');
        
        if (this.leaderboard.length === 0) {
            leaderboardList.innerHTML = '<div class="empty-state"><h4>No players found</h4><p>Players will appear here once they start playing</p></div>';
            return;
        }
        
        leaderboardList.innerHTML = this.leaderboard.map((player, index) => `
            <div class="leaderboard-item rank-${index + 1}">
                <div class="player-avatar">
                    ${player.name ? player.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div class="player-info">
                    <div class="player-name">${player.name || 'Unknown Player'}</div>
                    <div class="player-level">Level ${player.level || 1}</div>
                </div>
                <div class="rank-badge">#${index + 1}</div>
            </div>
        `).join('');
        
        console.log('✅ Leaderboard rendered successfully');
    }
    
    // Method to force refresh leaderboard (for debugging)
    async refreshLeaderboard() {
        console.log('🔄 Force refreshing leaderboard...');
        await this.loadLeaderboard();
    }
    
    
    renderQuests() {
        const questsList = document.getElementById('questsList');
        if (!questsList) return;
        
        if (this.quests.length === 0) {
            questsList.innerHTML = '<div class="empty-state"><h4>No quests found</h4><p>Create your first quest to get started</p></div>';
            return;
        }
        
        questsList.innerHTML = this.quests.map(quest => {
            const timerInfo = this.formatQuestTimeRemaining(quest.endTime);
            const assignedPlayer = quest.assignedPlayer ? 
                this.players.find(p => p.id === quest.assignedPlayer)?.name || 'Unknown Player' : 
                'All Players';
            
            // Check quest status
            const isCompleted = quest.status === 'completed';
            const isPlayerDone = quest.status === 'player_done';
            const isExpired = timerInfo.class === 'expired';
            
            return `
                <div class="quest-item ${isCompleted ? 'quest-completed' : ''} ${isPlayerDone ? 'quest-player-done' : ''} ${isExpired ? 'quest-expired' : ''}">
                    <div class="quest-info">
                        <div class="quest-logo">${quest.logo || '📍'}</div>
                        <div class="quest-details">
                            <div class="quest-title">
                                ${quest.name}
                                <span class="quest-timer ${timerInfo.class}" data-end-time="${quest.endTime}">
                                    ${isCompleted ? '✅ Completed' : isPlayerDone ? '⏳ Waiting for Approval' : timerInfo.text}
                                </span>
                            </div>
                            <div class="quest-subtitle">${quest.description}</div>
                            <div class="quest-subtitle">Assigned to: ${assignedPlayer}</div>
                            <div class="quest-rewards">
                                <span class="reward-badge reward-xp">+${quest.xpReward || 0} XP</span>
                                <span class="reward-badge reward-coins">+${quest.coinsReward || 0} DZD</span>
                            </div>
                        </div>
                    </div>
                    <div class="quest-actions">
                        ${isCompleted ? `
                            <span class="quest-status-completed">✅ Completed & Rewarded</span>
                        ` : isPlayerDone ? `
                            <button class="btn btn-warning" onclick="adminDashboard.approveQuest('${quest.id}')" title="Approve quest completion and award rewards">
                                ✓ Approve & Reward
                            </button>
                        ` : `
                            <button class="btn btn-success" onclick="adminDashboard.approveQuest('${quest.id}')" title="Approve quest completion and award rewards">
                                ✓ Approve
                            </button>
                        `}
                        <button class="btn btn-info" onclick="adminDashboard.duplicateQuest('${quest.id}')" title="Duplicate this quest">
                            📋
                        </button>
                        <button class="btn btn-primary" onclick="adminDashboard.editQuest('${quest.id}')">Edit</button>
                        <button class="btn btn-danger" onclick="adminDashboard.deleteQuest('${quest.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
        renderFeedback() {
            const feedbackList = document.getElementById('feedbackList');
            if (!feedbackList) return;
            
            if (this.feedbackHistory.length === 0) {
            feedbackList.innerHTML = '<div class="empty-state"><h4>No feedback sent yet</h4><p>Click "Add Feedback" to send feedback to players</p></div>';
                return;
            }
            
            // Show feedback history (most recent first)
            const sortedFeedback = this.feedbackHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            feedbackList.innerHTML = sortedFeedback.map(feedback => `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <div class="feedback-type ${feedback.type}">
                            ${feedback.type === 'positive' ? '✅' : '❌'} ${feedback.type.toUpperCase()}
                        </div>
                        <div class="feedback-time">${new Date(feedback.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="feedback-content">
                        <h4>${feedback.title}</h4>
                        <p><strong>To:</strong> ${feedback.playerName}</p>
                        <p><strong>Message:</strong> ${feedback.message}</p>
                        <p><strong>Sent by:</strong> ${feedback.sentByName || 'Admin'}</p>
                    </div>
                    <div class="feedback-actions">
                        <span class="feedback-status ${feedback.status}">
                            ${feedback.status === 'read' ? '✅ Read by Player' : '⏳ Pending Player Read'}
                        </span>
                        <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteFeedback('${feedback.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        
        async saveFeedbackToFirebase(feedback) {
            try {
                // Save to player's feedback collection
                const playerFeedbackRef = doc(db, 'playerFeedback', feedback.playerId);
                const playerFeedbackSnap = await getDoc(playerFeedbackRef);
                
                let playerFeedbacks = [];
                if (playerFeedbackSnap.exists()) {
                    playerFeedbacks = playerFeedbackSnap.data().feedbacks || [];
                }
                
                playerFeedbacks.push(feedback);
                
                await setDoc(playerFeedbackRef, {
                    playerId: feedback.playerId,
                    playerName: feedback.playerName,
                    feedbacks: playerFeedbacks,
                    lastUpdated: new Date().toISOString()
                });
                
                // Also save to admin feedback history
                const adminFeedbackRef = doc(db, 'adminFeedback', 'history');
                const adminFeedbackSnap = await getDoc(adminFeedbackRef);
                
                let adminFeedbacks = [];
                if (adminFeedbackSnap.exists()) {
                    adminFeedbacks = adminFeedbackSnap.data().feedbacks || [];
                }
                
                adminFeedbacks.push(feedback);
                
                await setDoc(adminFeedbackRef, {
                    feedbacks: adminFeedbacks,
                    lastUpdated: new Date().toISOString()
                });
                
            } catch (error) {
                console.error('❌ Error saving feedback to Firebase:', error);
                throw error;
            }
        }
    
    renderMissions() {
        const missionList = document.getElementById('missionList');
        if (!missionList) return;
        
        if (this.players.length === 0) {
            missionList.innerHTML = '<div class="empty-state"><h4>No players found</h4><p>Players will appear here once they register</p></div>';
            return;
        }
        
        const today = new Date().toISOString().split('T')[0];
        const todaySubmissions = this.missionSubmissions[today] || {};
        
        let html = '<div class="missions-header">';
        html += `<h4>Daily Mission Submissions - ${new Date().toLocaleDateString()}</h4>`;
        html += '<p>View what players submitted for today\'s missions</p>';
        html += '</div>';
        
        html += '<div class="players-missions-list">';
        
        this.players.forEach(player => {
            const submission = todaySubmissions[player.id];
            const hasSubmitted = submission && submission.status === 'submitted';
            const submissionCount = submission ? submission.submissions.length : 0;
            
            html += `
                <div class="player-mission-card ${hasSubmitted ? 'submitted' : ''}" data-player-id="${player.id}">
                    <div class="player-mission-header">
                        <div class="player-mission-info">
                            <div class="player-mission-avatar">
                                <img src="${player.skin || 'default-skin.png'}" alt="${player.name}" class="player-skin" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div class="player-fallback" style="display: none;">${player.name.charAt(0).toUpperCase()}</div>
                            </div>
                            <div class="player-mission-details">
                                <h5>${player.name}</h5>
                                <p>${submissionCount} submission${submissionCount !== 1 ? 's' : ''} today</p>
                            </div>
                        </div>
                        <div class="mission-status">
                            <div class="status-dot ${hasSubmitted ? 'submitted' : 'pending'}"></div>
                        </div>
                    </div>
                    
                    <div class="mission-actions">
                        <button class="view-submissions-btn" data-player-id="${player.id}">
                            ${hasSubmitted ? 'View Submissions' : 'No Submissions'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        missionList.innerHTML = html;
        
        // Add event listeners
        this.setupMissionsEventListeners();
    }
    
    setupMissionsEventListeners() {
        // View submissions buttons
        document.querySelectorAll('.view-submissions-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.getAttribute('data-player-id');
                this.viewPlayerSubmissions(playerId);
            });
        });
    }
    
    viewPlayerSubmissions(playerId) {
        const today = new Date().toISOString().split('T')[0];
            const player = this.players.find(p => p.id === playerId);
        const submission = this.missionSubmissions[today]?.[playerId];
        
        if (!submission || !submission.submissions || submission.submissions.length === 0) {
            this.showError(`${player?.name || 'Player'} has no submissions for today`);
            return;
        }
        
        // Create modal content
        let modalContent = `
            <div class="submissions-modal">
                <div class="submissions-header">
                    <h3>${player?.name || 'Player'}'s Submissions - ${new Date().toLocaleDateString()}</h3>
                    <button class="close-submissions-btn">&times;</button>
                </div>
                <div class="submissions-content">
        `;
        
        submission.submissions.forEach((sub, index) => {
            modalContent += `
                <div class="submission-item">
                    <div class="submission-header">
                        <h4>Submission ${index + 1}</h4>
                        <span class="submission-time">${new Date(sub.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="submission-details">
                        <p><strong>Mission:</strong> ${sub.missionName || 'Daily Mission'}</p>
                        <p><strong>Description:</strong> ${sub.description}</p>
                        ${sub.evidence ? `<p><strong>Evidence:</strong> <a href="${sub.evidence}" target="_blank">View Evidence</a></p>` : ''}
                        ${sub.notes ? `<p><strong>Notes:</strong> ${sub.notes}</p>` : ''}
                    </div>
                </div>
            `;
        });
        
        modalContent += `
                </div>
            </div>
        `;
        
        // Show modal
        this.showSubmissionsModal(modalContent);
    }
    
    showSubmissionsModal(content) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = content;
        
        // Add to body
        document.body.appendChild(modalOverlay);
        
        // Add close event listener
        const closeBtn = modalOverlay.querySelector('.close-submissions-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modalOverlay);
            });
        }
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });
    }
    
        renderDaygrades() {
            const daygradesList = document.getElementById('daygradesList');
            if (!daygradesList) return;
            
            if (this.players.length === 0) {
                daygradesList.innerHTML = '<div class="empty-state"><h4>No players found</h4><p>Players will appear here once they register</p></div>';
                return;
            }
            
            const today = new Date().toISOString().split('T')[0];
            const todayGrades = this.daygrades[today] || {};
            
            let html = '<div class="daygrades-header">';
            html += `<h4>Daily Grades - ${new Date().toLocaleDateString()}</h4>`;
            html += '<p>Grade each player out of 5 for today\'s performance</p>';
            html += '</div>';
            
            html += '<div class="players-grading-list">';
            
            this.players.forEach(player => {
                const currentGrade = todayGrades[player.id] || '';
                const gradeValue = currentGrade ? currentGrade.grade : '';
                const isGraded = gradeValue !== '';
                
                html += `
                    <div class="player-grade-card ${isGraded ? 'graded' : ''}" data-player-id="${player.id}">
                        <div class="player-grade-header">
                            <div class="player-grade-info">
                                <div class="player-grade-avatar">
                                    <img src="${player.skin || 'default-skin.png'}" alt="${player.name}" class="player-skin" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <div class="player-fallback" style="display: none;">${player.name.charAt(0).toUpperCase()}</div>
                                </div>
                                <div class="player-grade-details">
                                    <h5>${player.name}</h5>
                                </div>
                            </div>
                            <div class="grade-status">
                                <div class="status-dot ${isGraded ? 'graded' : 'pending'}"></div>
                            </div>
                        </div>
                        
                        <div class="star-grading">
                            <div class="stars-container">
                                ${[1, 2, 3, 4, 5].map(star => `
                                    <button class="star-btn ${parseInt(gradeValue) >= star ? 'active' : ''}" 
                                            data-grade="${star}" 
                                            data-player-id="${player.id}">
                                        ⭐
                                    </button>
                                `).join('')}
                            </div>
                            <div class="grade-actions">
                                <button class="clear-grade-btn" data-player-id="${player.id}">Clear</button>
                                <button class="save-grade-btn" data-player-id="${player.id}">Save</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            daygradesList.innerHTML = html;
            
            // Add event listeners for grade inputs
            this.setupDaygradesEventListeners();
        }
        
        setupDaygradesEventListeners() {
            // Star rating buttons - just for visual selection
            document.querySelectorAll('.star-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const playerId = e.target.getAttribute('data-player-id');
                    const grade = e.target.getAttribute('data-grade');
                    this.selectStarGrade(playerId, grade);
                });
            });
            
            // Save grade buttons
            document.querySelectorAll('.save-grade-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const playerId = e.target.getAttribute('data-player-id');
                    this.savePlayerGrade(playerId);
                });
            });
            
            // Clear grade buttons
            document.querySelectorAll('.clear-grade-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const playerId = e.target.getAttribute('data-player-id');
                    this.clearPlayerGrade(playerId);
                });
            });
        }
        
        selectStarGrade(playerId, grade) {
            // Update visual selection without saving
            const card = document.querySelector(`[data-player-id="${playerId}"]`);
            if (!card) return;
            
            const stars = card.querySelectorAll('.star-btn');
            stars.forEach((star, index) => {
                if (index < parseInt(grade)) {
                    star.classList.add('active');
        } else {
                    star.classList.remove('active');
                }
            });
            
            // Store selected grade temporarily
            card.setAttribute('data-selected-grade', grade);
        }
        
        async savePlayerGrade(playerId) {
            try {
                const card = document.querySelector(`[data-player-id="${playerId}"]`);
                if (!card) return;
                
                const selectedGrade = card.getAttribute('data-selected-grade');
                if (!selectedGrade) {
                    this.showError('Please select a grade first');
                    return;
                }
                
                const today = new Date().toISOString().split('T')[0];
                const player = this.players.find(p => p.id === playerId);
                const playerName = player ? player.name : 'Unknown Player';
                
                // Initialize daygrades for today if not exists
                if (!this.daygrades[today]) {
                    this.daygrades[today] = {};
                }
                
                // Save grade data
                this.daygrades[today][playerId] = {
                    grade: selectedGrade,
                    timestamp: new Date().toISOString(),
                    gradedBy: this.currentUser.uid
                };
                
                // Save to Firebase
                await this.saveDaygradesToFirebase(today);
                
                // Update UI
                this.renderDaygrades();
                
                console.log(`✅ Grade saved for player ${playerId}: ${selectedGrade}/5`);
                
                // Show success message with star count
                const starText = selectedGrade === '1' ? 'star' : 'stars';
                this.showSuccess(`${playerName} now has ${selectedGrade} ${starText} ⭐`);
                
            } catch (error) {
                console.error('❌ Error saving grade:', error);
                this.showError('Failed to save grade');
            }
        }
        
        async clearPlayerGrade(playerId) {
            try {
                const today = new Date().toISOString().split('T')[0];
                const player = this.players.find(p => p.id === playerId);
                const playerName = player ? player.name : 'Unknown Player';
                
                // Clear visual selection
                const card = document.querySelector(`[data-player-id="${playerId}"]`);
                if (card) {
                    const stars = card.querySelectorAll('.star-btn');
                    stars.forEach(star => star.classList.remove('active'));
                    card.removeAttribute('data-selected-grade');
                }
                
                // Clear saved grade if exists
                if (this.daygrades[today] && this.daygrades[today][playerId]) {
                    delete this.daygrades[today][playerId];
                    
                    // Save to Firebase
                    await this.saveDaygradesToFirebase(today);
                    
                    // Update UI
                    this.renderDaygrades();
                    
                    console.log(`✅ Grade cleared for player ${playerId}`);
                    this.showSuccess(`${playerName}'s grade has been cleared`);
                } else {
                    console.log(`✅ Visual selection cleared for player ${playerId}`);
                    this.showSuccess('Selection cleared');
                }
                
            } catch (error) {
                console.error('❌ Error clearing grade:', error);
                this.showError('Failed to clear grade');
            }
        }
        
        async saveDaygradesToFirebase(date) {
            try {
                const daygradesRef = doc(db, 'daygrades', date);
                await setDoc(daygradesRef, this.daygrades[date], { merge: true });
            } catch (error) {
                console.error('❌ Error saving daygrades to Firebase:', error);
                throw error;
            }
        }
        
        async loadDaygradesFromFirebase() {
            try {
                const today = new Date().toISOString().split('T')[0];
                const daygradesRef = doc(db, 'daygrades', today);
                const daygradesSnap = await getDoc(daygradesRef);
                
                if (daygradesSnap.exists()) {
                    this.daygrades[today] = daygradesSnap.data();
                } else {
                    this.daygrades[today] = {};
                }
                
                console.log('📊 Daygrades loaded from Firebase');
            } catch (error) {
                console.error('❌ Error loading daygrades:', error);
            }
        }
        
        async loadMissionsFromFirebase() {
            try {
                const today = new Date().toISOString().split('T')[0];
                const missionsRef = doc(db, 'missions', today);
                const missionsSnap = await getDoc(missionsRef);
                
                if (missionsSnap.exists()) {
                    this.missionSubmissions[today] = missionsSnap.data();
                } else {
                    this.missionSubmissions[today] = {};
                }
                
                console.log('🎯 Missions loaded from Firebase');
            } catch (error) {
                console.error('❌ Error loading missions:', error);
            }
        }
        
        async loadFeedbackFromFirebase() {
            try {
                // Load admin feedback history
                const adminFeedbackRef = doc(db, 'adminFeedback', 'history');
                const adminFeedbackSnap = await getDoc(adminFeedbackRef);
                
                if (adminFeedbackSnap.exists()) {
                    this.feedbackHistory = adminFeedbackSnap.data().feedbacks || [];
                } else {
                    this.feedbackHistory = [];
                }
                
                console.log('📝 Feedback loaded from Firebase');
            } catch (error) {
                console.error('❌ Error loading feedback:', error);
            }
        }
        
        async saveMissionsToFirebase(date) {
            try {
                const missionsRef = doc(db, 'missions', date);
                await setDoc(missionsRef, this.missionSubmissions[date], { merge: true });
                console.log('🎯 Missions saved to Firebase for', date);
            } catch (error) {
                console.error('❌ Error saving missions to Firebase:', error);
                throw error;
            }
        }
        
        // Method to add a mission submission (can be called from game)
        async addMissionSubmission(playerId, submissionData) {
            try {
                const today = new Date().toISOString().split('T')[0];
                
                // Initialize missions for today if not exists
                if (!this.missionSubmissions[today]) {
                    this.missionSubmissions[today] = {};
                }
                
                // Initialize player submissions if not exists
                if (!this.missionSubmissions[today][playerId]) {
                    this.missionSubmissions[today][playerId] = {
                        playerId: playerId,
                        playerName: this.players.find(p => p.id === playerId)?.name || 'Unknown Player',
                        status: 'submitted',
                        submissions: []
                    };
                }
                
                // Add new submission
                const submission = {
                    id: Date.now().toString(),
                    missionName: submissionData.missionName || 'Daily Mission',
                    description: submissionData.description || '',
                    evidence: submissionData.evidence || '',
                    notes: submissionData.notes || '',
                    timestamp: new Date().toISOString()
                };
                
                this.missionSubmissions[today][playerId].submissions.push(submission);
                
                // Save to Firebase
                await this.saveMissionsToFirebase(today);
                
                // Update UI if on missions tab
                if (this.currentTab === 'missions') {
                    this.renderMissions();
                }
                
                console.log(`✅ Mission submission added for player ${playerId}`);
                return true;
                
            } catch (error) {
                console.error('❌ Error adding mission submission:', error);
                return false;
            }
        }
        
        // Method to send feedback to player (can be called from game)
        async sendFeedbackToPlayer(playerId, feedbackData) {
            try {
                const player = this.players.find(p => p.id === playerId);
                if (!player) {
                    console.error('❌ Player not found:', playerId);
                    return false;
                }
                
                const feedback = {
                    id: Date.now().toString(),
                    playerId: playerId,
                    playerName: player.name || 'Unknown Player',
                    type: feedbackData.type || 'positive',
                    title: feedbackData.title || 'Feedback',
                    message: feedbackData.message || '',
                    timestamp: new Date().toISOString(),
                    sentBy: this.currentUser?.uid || 'system',
                    sentByName: this.currentUser?.displayName || 'Admin',
                    status: 'unread',
                    gameNotification: true
                };
                
                // Save to Firebase
                await this.saveFeedbackToFirebase(feedback);
                
                // Add to local history
                this.feedbackHistory.push(feedback);
                
                // Update UI if on feedback tab
                if (this.currentTab === 'feedback') {
                    this.renderFeedback();
                }
                
                console.log(`✅ Feedback sent to player ${player.name}`);
                return true;
                
            } catch (error) {
                console.error('❌ Error sending feedback:', error);
                return false;
            }
        }
        
        // Method to mark feedback as read (called by player from game)
        async markFeedbackAsReadByPlayer(feedbackId, playerId) {
            try {
                // Find feedback in local history
                const feedback = this.feedbackHistory.find(f => f.id === feedbackId);
                if (!feedback) {
                    console.error('❌ Feedback not found:', feedbackId);
                    return false;
                }
                
                // Verify this feedback belongs to the player
                if (feedback.playerId !== playerId) {
                    console.error('❌ Feedback does not belong to this player');
                    return false;
                }
                
                // Update status
                feedback.status = 'read';
                feedback.readAt = new Date().toISOString();
                
                // Update in Firebase - both player and admin collections
                await this.updateFeedbackInFirebase(feedback);
                
                // Update UI if on feedback tab
                if (this.currentTab === 'feedback') {
                    this.renderFeedback();
                }
                
                console.log(`✅ Feedback marked as read by player: ${feedbackId}`);
                return true;
                
            } catch (error) {
                console.error('❌ Error marking feedback as read by player:', error);
                return false;
            }
        }
        
        // Method to delete feedback
        async deleteFeedback(feedbackId) {
            try {
                if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
                    return;
                }
                
                // Find feedback in local history
                const feedback = this.feedbackHistory.find(f => f.id === feedbackId);
                if (!feedback) {
                    console.error('❌ Feedback not found:', feedbackId);
                    return;
                }
                
                // Remove from local history
                this.feedbackHistory = this.feedbackHistory.filter(f => f.id !== feedbackId);
                
                // Remove from Firebase - both player and admin collections
                await this.removeFeedbackFromFirebase(feedback);
                
                // Update UI
                this.renderFeedback();
                
                console.log(`✅ Feedback deleted: ${feedbackId}`);
                this.showSuccess('Feedback deleted successfully');
                
            } catch (error) {
                console.error('❌ Error deleting feedback:', error);
                this.showError('Failed to delete feedback');
            }
        }
        
        // Helper method to update feedback in Firebase
        async updateFeedbackInFirebase(feedback) {
            try {
                // Update player's feedback collection
                const playerFeedbackRef = doc(db, 'playerFeedback', feedback.playerId);
                const playerFeedbackSnap = await getDoc(playerFeedbackRef);
                
                if (playerFeedbackSnap.exists()) {
                    let playerFeedbacks = playerFeedbackSnap.data().feedbacks || [];
                    const feedbackIndex = playerFeedbacks.findIndex(f => f.id === feedback.id);
                    
                    if (feedbackIndex !== -1) {
                        playerFeedbacks[feedbackIndex] = feedback;
                        
                        await setDoc(playerFeedbackRef, {
                            playerId: feedback.playerId,
                            playerName: feedback.playerName,
                            feedbacks: playerFeedbacks,
                            lastUpdated: new Date().toISOString()
                        });
                    }
                }
                
                // Update admin feedback history
                const adminFeedbackRef = doc(db, 'adminFeedback', 'history');
                const adminFeedbackSnap = await getDoc(adminFeedbackRef);
                
                if (adminFeedbackSnap.exists()) {
                    let adminFeedbacks = adminFeedbackSnap.data().feedbacks || [];
                    const feedbackIndex = adminFeedbacks.findIndex(f => f.id === feedback.id);
                    
                    if (feedbackIndex !== -1) {
                        adminFeedbacks[feedbackIndex] = feedback;
                        
                        await setDoc(adminFeedbackRef, {
                            feedbacks: adminFeedbacks,
                            lastUpdated: new Date().toISOString()
                        });
                    }
                }
                
            } catch (error) {
                console.error('❌ Error updating feedback in Firebase:', error);
                throw error;
            }
        }
        
        // Helper method to remove feedback from Firebase
        async removeFeedbackFromFirebase(feedback) {
            try {
                // Remove from player's feedback collection
                const playerFeedbackRef = doc(db, 'playerFeedback', feedback.playerId);
                const playerFeedbackSnap = await getDoc(playerFeedbackRef);
                
                if (playerFeedbackSnap.exists()) {
                    let playerFeedbacks = playerFeedbackSnap.data().feedbacks || [];
                    playerFeedbacks = playerFeedbacks.filter(f => f.id !== feedback.id);
                    
                    await setDoc(playerFeedbackRef, {
                        playerId: feedback.playerId,
                        playerName: feedback.playerName,
                        feedbacks: playerFeedbacks,
                        lastUpdated: new Date().toISOString()
                    });
                }
                
                // Remove from admin feedback history
                const adminFeedbackRef = doc(db, 'adminFeedback', 'history');
                const adminFeedbackSnap = await getDoc(adminFeedbackRef);
                
                if (adminFeedbackSnap.exists()) {
                    let adminFeedbacks = adminFeedbackSnap.data().feedbacks || [];
                    adminFeedbacks = adminFeedbacks.filter(f => f.id !== feedback.id);
                    
                    await setDoc(adminFeedbackRef, {
                        feedbacks: adminFeedbacks,
                        lastUpdated: new Date().toISOString()
                    });
                }
                
            } catch (error) {
                console.error('❌ Error removing feedback from Firebase:', error);
                throw error;
            }
        }
        
        setupMidnightRefresh() {
            // Calculate time until next midnight
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0); // Next midnight
            
            const timeUntilMidnight = midnight.getTime() - now.getTime();
            
            console.log(`🕛 Next daygrades refresh scheduled for: ${midnight.toLocaleString()}`);
            
            // Set timeout for midnight refresh
            setTimeout(() => {
                this.refreshDaygradesForNewDay();
                
                // Set up daily refresh interval (every 24 hours)
                setInterval(() => {
                    this.refreshDaygradesForNewDay();
                }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
                
            }, timeUntilMidnight);
        }
        
        refreshDaygradesForNewDay() {
            console.log('🔄 Refreshing daygrades for new day...');
            
            // Clear current day's grades
            this.daygrades = {};
            
            // Clear any visual selections in the UI
            document.querySelectorAll('.player-grade-card').forEach(card => {
                const stars = card.querySelectorAll('.star-btn');
                stars.forEach(star => star.classList.remove('active'));
                card.removeAttribute('data-selected-grade');
            });
            
            // Re-render the daygrades UI to show blank state
            if (this.currentTab === 'daygrades') {
                this.renderDaygrades();
            }
            
            // Show notification
            this.showSuccess('New day started! All players reset to 0 stars. Ready for fresh grading.');
            
            console.log('✅ Daygrades refreshed for new day - all players reset to blank');
        }
    
    updateQuestPlayerSelect() {
        const questPlayerSelect = document.getElementById('questPlayer');
        if (!questPlayerSelect) return;
        
        questPlayerSelect.innerHTML = '<option value="">All Players</option>' +
            this.players.map(player => 
                `<option value="${player.id}">${player.name || player.email}</option>`
            ).join('');
    }
    
    
    showQuestModal(questId = null) {
        const modal = document.getElementById('questModal');
        const title = document.getElementById('questModalTitle');
        const form = document.getElementById('questForm');
        
        if (questId) {
            // Edit mode
            const quest = this.quests.find(q => q.id === questId);
            if (quest) {
                title.textContent = 'Edit Quest';
                document.getElementById('questId').value = quest.id;
                document.getElementById('questLogo').value = quest.logo || '📍';
                document.getElementById('questName').value = quest.name || '';
                document.getElementById('questDescription').value = quest.description || '';
                document.getElementById('questXP').value = quest.xpReward || 0;
                document.getElementById('questCoins').value = quest.coinsReward || 0;
                document.getElementById('questPlayer').value = quest.assignedPlayer || '';
                document.getElementById('questEndTime').value = quest.endTime || '';
                document.getElementById('questVerificationName').value = quest.verificationName || '';
                document.getElementById('questVerificationLink').value = quest.verificationLink || '';
            }
        } else {
            // Add mode
            title.textContent = 'Add Quest';
            form.reset();
            document.getElementById('questId').value = '';
            document.getElementById('questLogo').value = '📍'; // Default emoji
            
            // Set default end time to 24 hours from now
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('questEndTime').value = tomorrow.toISOString().slice(0, 16);
        }
        
        modal.classList.add('show');
    }
    
    hideQuestModal() {
        const modal = document.getElementById('questModal');
        modal.classList.remove('show');
    }
    
    goToPlayersPage() {
        window.location.href = 'players.html';
    }
    
    // Placeholder methods for new sections
        showFeedbackModal() {
            console.log('📝 Opening feedback modal...');
            this.showFeedbackForm();
        }
        
        showFeedbackForm() {
            const feedbackModal = document.getElementById('feedbackModal');
            if (!feedbackModal) return;
            
            // Populate player dropdown
            this.populateFeedbackPlayerSelect();
            
            // Show modal
            feedbackModal.style.display = 'flex';
            
            // Add event listeners for modal
            this.setupFeedbackModalEventListeners();
        }
        
        populateFeedbackPlayerSelect() {
            const playerSelect = document.getElementById('feedbackPlayer');
            if (!playerSelect) return;
            
            // Clear existing options except first one
            playerSelect.innerHTML = '<option value="">Choose a player...</option>';
            
            // Add players
            this.players.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                playerSelect.appendChild(option);
            });
        }
        
        setupFeedbackModalEventListeners() {
            // Close modal buttons
            const closeBtn = document.getElementById('closeFeedbackModal');
            const cancelBtn = document.getElementById('cancelFeedbackBtn');
            const feedbackForm = document.getElementById('feedbackForm');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideFeedbackModal());
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.hideFeedbackModal());
            }
            
            if (feedbackForm) {
                feedbackForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleFeedbackSubmit();
                });
            }
        }
        
        hideFeedbackModal() {
            const feedbackModal = document.getElementById('feedbackModal');
            if (feedbackModal) {
                feedbackModal.style.display = 'none';
            }
        }
        
        async handleFeedbackSubmit() {
            try {
                const playerId = document.getElementById('feedbackPlayer').value;
                const feedbackType = document.getElementById('feedbackType').value;
                const title = document.getElementById('feedbackTitle').value.trim();
                const message = document.getElementById('feedbackMessage').value.trim();
                
                // Validation
                if (!playerId) {
                    this.showError('Please select a player');
                    return;
                }
                
                if (!feedbackType) {
                    this.showError('Please select feedback type');
                    return;
                }
                
                if (!title) {
                    this.showError('Please enter a title');
                    return;
                }
                
                if (!message) {
                    this.showError('Please enter a message');
                    return;
                }
                
                // Create feedback object
                const feedback = {
                    id: Date.now().toString(),
                    playerId: playerId,
                    playerName: this.players.find(p => p.id === playerId)?.name || 'Unknown Player',
                    type: feedbackType,
                    title: title,
                    message: message,
                    timestamp: new Date().toISOString(),
                    sentBy: this.currentUser.uid,
                    sentByName: this.currentUser.displayName || 'Admin',
                    status: 'unread',
                    gameNotification: true
                };
                
                // Save to Firebase
                await this.saveFeedbackToFirebase(feedback);
                
                // Hide modal
                this.hideFeedbackModal();
                
                // Clear form
                document.getElementById('feedbackForm').reset();
                
                console.log(`✅ Feedback sent to player ${feedback.playerName}`);
                this.showSuccess(`Feedback sent to ${feedback.playerName}! They will see it in their game.`);
                
        } catch (error) {
                console.error('❌ Error sending feedback:', error);
                this.showError('Failed to send feedback');
            }
        }
    
    showMissionModal() {
        console.log('🎯 Mission modal - Coming soon!');
        alert('Mission Management - Coming soon!');
    }
    
        showDaygradeModal() {
            console.log('📊 Daygrade modal - Already implemented in tab!');
            // Switch to daygrades tab if not already active
            if (this.currentTab !== 'daygrades') {
                this.switchTab('daygrades');
            }
        }
    
    switchTab(tabName) {
        console.log(`🔄 Switching to ${tabName} tab`);
        
        // Update current tab
        this.currentTab = tabName;
        
        // Remove active class from all tabs and panels
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        // Add active class to selected tab and panel
        const selectedTab = document.getElementById(`${tabName}Tab`);
        const selectedPanel = document.getElementById(`${tabName}Content`);
        
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedPanel) selectedPanel.classList.add('active');
        
        // Load data for the selected tab
        this.loadTabData(tabName);
    }
    
    loadTabData(tabName) {
        switch (tabName) {
            case 'daygrades':
                this.renderDaygrades();
                break;
            case 'feedback':
                this.renderFeedback();
                break;
            case 'missions':
                this.renderMissions();
                break;
        }
    }
    
    
    async handleQuestSubmit(e) {
        e.preventDefault();
        
        const formData = {
            logo: document.getElementById('questLogo').value || '📍',
            name: document.getElementById('questName').value,
            description: document.getElementById('questDescription').value,
            xpReward: parseInt(document.getElementById('questXP').value) || 0,
            coinsReward: parseInt(document.getElementById('questCoins').value) || 0,
            assignedPlayer: document.getElementById('questPlayer').value || null,
            endTime: document.getElementById('questEndTime').value,
            verificationName: document.getElementById('questVerificationName').value,
            verificationLink: document.getElementById('questVerificationLink').value,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        const questId = document.getElementById('questId').value;
        
        try {
            if (questId) {
                // Update existing quest
                await window.updateDoc(window.doc(window.db, 'quests', questId), {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Quest updated');
            } else {
                // Create new quest
                const newQuestRef = window.doc(window.collection(window.db, 'quests'));
                await window.setDoc(newQuestRef, formData);
                console.log('✅ Quest created');
            }
            
            this.hideQuestModal();
            await this.loadQuests();
        } catch (error) {
            console.error('❌ Error saving quest:', error);
            this.showError('Failed to save quest');
        }
    }
    
    
    editQuest(questId) {
        this.showQuestModal(questId);
    }
    
    async duplicateQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) {
            this.showError('Quest not found');
            return;
        }
        
        try {
            // Create a copy of the quest with modified name and timestamps
            const duplicatedQuest = {
                logo: quest.logo || '📍',
                name: `${quest.name} (Copy)`,
                description: quest.description,
                xpReward: quest.xpReward || 0,
                coinsReward: quest.coinsReward || 0,
                assignedPlayer: quest.assignedPlayer || null,
                endTime: this.getDefaultEndTime(), // Set new end time
                verificationName: quest.verificationName || '',
                verificationLink: quest.verificationLink || '',
                status: 'active',
                createdAt: new Date().toISOString()
            };
            
            // Create new quest document in Firestore
            const newQuestRef = window.doc(window.collection(window.db, 'quests'));
            await window.setDoc(newQuestRef, duplicatedQuest);
            
            console.log('✅ Quest duplicated successfully');
            this.showSuccessMessage(`Quest "${quest.name}" has been duplicated successfully!`);
            
            // Refresh quests list
            await this.loadQuests();
            
        } catch (error) {
            console.error('❌ Error duplicating quest:', error);
            this.showError('Failed to duplicate quest');
        }
    }
    
    getDefaultEndTime() {
        // Set default end time to 24 hours from now
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 16); // Format for datetime-local input
    }
    
    // Notify the game about stat updates for real-time updates
    notifyGameOfStatUpdate(playerId, updatedStats) {
        try {
            // Try to find the game window and notify it
            if (window.opener && window.opener.game && window.opener.game.auth) {
                // If admin dashboard was opened from the game
                window.opener.game.auth.handleExternalStatUpdate(updatedStats);
            } else {
                // Try to find any open game window
                const gameWindows = window.parent.frames || [];
                for (let i = 0; i < gameWindows.length; i++) {
                    try {
                        if (gameWindows[i].game && gameWindows[i].game.auth) {
                            gameWindows[i].game.auth.handleExternalStatUpdate(updatedStats);
                            break;
                        }
                    } catch (e) {
                        // Cross-origin or window closed, continue
                    }
                }
            }
            
            // Also try to use localStorage as a fallback for real-time updates
            const statUpdate = {
                playerId: playerId,
                stats: updatedStats,
                timestamp: Date.now()
            };
            localStorage.setItem('playerStatUpdate', JSON.stringify(statUpdate));
            
            // Trigger a custom event that the game can listen to
            window.dispatchEvent(new CustomEvent('playerStatsUpdated', {
                detail: { playerId, stats: updatedStats }
            }));
            
        } catch (error) {
            console.log('Could not notify game directly, using localStorage fallback');
        }
    }
    
    async deleteQuest(questId) {
        if (!confirm('Are you sure you want to delete this quest? This action cannot be undone.')) {
            return;
        }
        
        try {
            await window.deleteDoc(window.doc(window.db, 'quests', questId));
            console.log('✅ Quest deleted');
            await this.loadQuests();
        } catch (error) {
            console.error('❌ Error deleting quest:', error);
            this.showError('Failed to delete quest');
        }
    }
    
    async approveQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) {
            this.showError('Quest not found');
            return;
        }
        
        console.log('🔍 Quest data:', quest);
        console.log('🔍 Available players:', this.players.map(p => ({ id: p.id, name: p.name, email: p.email })));
        
        // Find the assigned player - try multiple lookup methods
        let player = null;
        if (quest.assignedPlayer && quest.assignedPlayer.trim() !== '') {
            // Try to find by exact ID match
            player = this.players.find(p => p.id === quest.assignedPlayer);
            
            // If not found, try to find by email (in case assignedPlayer is an email)
            if (!player) {
                player = this.players.find(p => p.email === quest.assignedPlayer);
            }
            
            // If still not found, try to find by name (in case assignedPlayer is a name)
            if (!player) {
                player = this.players.find(p => p.name === quest.assignedPlayer);
            }
        }
        
        console.log('🔍 Found player:', player);
        
        if (!player) {
            if (!quest.assignedPlayer || quest.assignedPlayer.trim() === '') {
                this.showError('This quest is assigned to "All Players". Please assign it to a specific player before approving.');
                return;
            } else {
                const errorMsg = `No player found for assignment: "${quest.assignedPlayer}". Please check if the player exists and is properly assigned.`;
                this.showError(errorMsg);
                return;
            }
        }
        
        // Check if quest is already completed
        if (quest.status === 'completed') {
            this.showError('This quest has already been completed and rewarded.');
            return;
        }
        
        // Different confirmation message based on quest status
        let confirmMessage;
        if (quest.status === 'player_done') {
            confirmMessage = `Approve quest completion for ${player.name}?\n\nPlayer has marked this quest as done.\n\nRewards to be given:\n• ${quest.xpReward || 0} XP\n• ${quest.coinsReward || 0} DZD\n\nThis action cannot be undone.`;
        } else {
            confirmMessage = `Approve quest completion for ${player.name}?\n\nRewards:\n• ${quest.xpReward || 0} XP\n• ${quest.coinsReward || 0} DZD\n\nThis action cannot be undone.`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            // Update player stats
            const currentExperience = player.experience || 0;
            const currentLevel = player.level || 1;
            const xpReward = quest.xpReward || 0;
            const newPoints = (player.points || 0) + (quest.coinsReward || 0);
            
            // Calculate new experience and level
            let newExperience = currentExperience + xpReward;
            let newLevel = currentLevel;
            
            // Check if player leveled up (level 1: 100 XP, level 2: 200 XP, etc.)
            while (newLevel < 10 && newExperience >= (newLevel * 100)) {
                newExperience -= (newLevel * 100); // Subtract XP needed for current level
                newLevel++;
            }
            
            // Cap at level 10
            if (newLevel > 10) {
                newLevel = 10;
                newExperience = 0; // Reset XP when reaching max level
            }
            
            await window.updateDoc(window.doc(window.db, 'users', player.id), {
                experience: newExperience,
                points: newPoints,
                level: newLevel
            });
            
            console.log(`✅ Quest approved for ${player.name}: +${quest.xpReward || 0} XP, +${quest.coinsReward || 0} DZD`);
            
            // Mark quest as completed
            await window.updateDoc(window.doc(window.db, 'quests', questId), {
                status: 'completed',
                completedAt: new Date().toISOString(),
                completedBy: player.id
            });
            
            // Show success message with level up notification
            let successMessage;
            if (quest.status === 'player_done') {
                successMessage = `Quest approved and rewarded! ${player.name} received ${quest.xpReward || 0} XP and ${quest.coinsReward || 0} DZD.`;
            } else {
                successMessage = `Quest approved! ${player.name} received ${quest.xpReward || 0} XP and ${quest.coinsReward || 0} DZD.`;
            }
            
            if (newLevel > currentLevel) {
                const levelsGained = newLevel - currentLevel;
                successMessage += `\n\n🎉 LEVEL UP! ${player.name} reached level ${newLevel}! (${levelsGained} level${levelsGained > 1 ? 's' : ''} gained)`;
                if (newLevel >= 10) {
                    successMessage += `\n🏆 MAX LEVEL REACHED!`;
                } else {
                    const xpNeeded = newLevel * 100;
                    successMessage += `\n📊 New XP: ${newExperience}/${xpNeeded}`;
                }
            }
            this.showSuccessMessage(successMessage);
            
            // Refresh data
            await this.loadPlayers();
            await this.loadLeaderboard();
            await this.loadQuests();
            
            // Notify the game about the stat update for real-time updates
            this.notifyGameOfStatUpdate(player.id, {
                level: newLevel,
                experience: newExperience,
                points: newPoints
            });
            
        } catch (error) {
            console.error('❌ Error approving quest:', error);
            this.showError('Failed to approve quest');
        }
    }
    
    showSuccessMessage(message) {
        // Create a temporary success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    showSuccess(message) {
        // Alias for showSuccessMessage for consistency
        this.showSuccessMessage(message);
    }
}

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
    
    // Make refresh methods available globally for debugging
    window.refreshLeaderboard = () => {
        if (window.adminDashboard) {
            return window.adminDashboard.refreshLeaderboard();
        } else {
            console.log("❌ Admin dashboard not initialized yet");
        }
    };
    
    // Make mission submission method available globally for game integration
    window.addMissionSubmission = (playerId, submissionData) => {
        if (window.adminDashboard) {
            return window.adminDashboard.addMissionSubmission(playerId, submissionData);
        } else {
            console.log("❌ Admin dashboard not initialized yet");
            return Promise.resolve(false);
        }
    };
    
    // Make feedback sending method available globally for game integration
    window.sendFeedbackToPlayer = (playerId, feedbackData) => {
        if (window.adminDashboard) {
            return window.adminDashboard.sendFeedbackToPlayer(playerId, feedbackData);
        } else {
            console.log("❌ Admin dashboard not initialized yet");
            return Promise.resolve(false);
        }
    };
    
    // Make feedback read method available globally for game integration
    window.markFeedbackAsReadByPlayer = (feedbackId, playerId) => {
        if (window.adminDashboard) {
            return window.adminDashboard.markFeedbackAsReadByPlayer(feedbackId, playerId);
        } else {
            console.log("❌ Admin dashboard not initialized yet");
            return Promise.resolve(false);
        }
    };
});