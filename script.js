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
        // Messages button
        const messagesBtn = document.getElementById('messagesButton');
        if (messagesBtn) {
            messagesBtn.addEventListener('click', () => this.showMessagesModal());
        }
        
        // Players button
        const playersBtn = document.getElementById('playersButton');
        if (playersBtn) {
            playersBtn.addEventListener('click', () => this.goToPlayersPage());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshButton');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh());
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
        
        const closeMessagesModal = document.getElementById('closeMessagesModal');
        if (closeMessagesModal) {
            closeMessagesModal.addEventListener('click', () => this.hideMessagesModal());
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
    
    async handleRefresh() {
        const refreshBtn = document.getElementById('refreshButton');
        if (!refreshBtn) return;
        
        try {
            // Add spinning animation to the button
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
            
            console.log('🔄 Refreshing dashboard data...');
            
            // Reload all data
            await this.loadData();
            
            console.log('✅ Dashboard data refreshed successfully');
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
            this.showError('Failed to refresh data');
        } finally {
            // Remove spinning animation after a short delay
            setTimeout(() => {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }, 500);
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
            
            // Ensure all displays are rendered immediately
            this.renderLeaderboard();
            this.renderQuests();
            this.renderFeedback();
            this.renderMissions();
            this.renderDaygrades();
            
            console.log('✅ Dashboard data loaded and displayed');
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
            
            // Sort quests by creation date (newest first)
            this.quests.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA; // Descending order (newest first)
            });
            
            console.log('📋 Quests loaded and sorted by creation date (newest first)');
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
                            <div class="quest-subtitle quest-created-date">Created: ${new Date(quest.createdAt).toLocaleString()}</div>
                            ${isPlayerDone ? `
                                <div class="quest-review-indicator">
                                    <span class="review-badge">🔍 NEEDS REVIEW</span>
                                    <span class="review-subtitle">Player has marked this quest as completed</span>
                                </div>
                            ` : ''}
                            ${quest.playerJustification ? `
                                <div class="quest-justification">
                                    <div class="justification-header">
                                        <span class="justification-label">📝 Player Justification:</span>
                                        <span class="justification-status ${quest.playerJustification.status}">${quest.playerJustification.status === 'pending_review' ? 'Pending Review' : 'Reviewed'}</span>
                                    </div>
                                    <div class="justification-message">${quest.playerJustification.message}</div>
                                    <div class="justification-meta">
                                        <span class="justification-player">From: ${quest.playerJustification.playerName}</span>
                                        <span class="justification-time">${new Date(quest.playerJustification.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            ` : ''}
                            <div class="quest-rewards">
                                <span class="reward-badge reward-task">Task: ${quest.task ? quest.task.charAt(0).toUpperCase() + quest.task.slice(1) : 'Not specified'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="quest-actions">
                        ${isCompleted ? `
                            <span class="quest-status-completed">✅ Completed & Rewarded</span>
                        ` : isExpired ? `
                            <span class="quest-status-expired">⏰ Quest Expired</span>
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
            
            feedbackList.innerHTML = sortedFeedback.map((feedback, index) => {
                // Check if this is a newly added feedback (within last 5 seconds)
                const isNew = (Date.now() - new Date(feedback.timestamp).getTime()) < 5000;
                
                return `
                    <div class="feedback-item ${isNew ? 'feedback-new' : ''}" data-feedback-id="${feedback.id}">
                        <div class="feedback-header">
                            <div class="feedback-type ${feedback.type}">
                                ${feedback.type === 'positive' ? '✅' : feedback.type === 'negative' ? '❌' : '⚖️'} ${feedback.type.toUpperCase()}
                            </div>
                            <div class="feedback-time">${new Date(feedback.timestamp).toLocaleString()}</div>
                        </div>
                        <div class="feedback-content">
                            <h4>${feedback.title}</h4>
                            <p><strong>To:</strong> ${feedback.playerName}</p>
                            <p><strong>Message:</strong> ${feedback.message}</p>
                            <p><strong>Sent by:</strong> ${feedback.sentByName || 'Admin'}</p>
                            ${feedback.xpReward !== 0 ? `<p><strong>XP Reward:</strong> <span class="xp-reward ${feedback.xpReward > 0 ? 'xp-positive' : 'xp-negative'}">${feedback.xpReward > 0 ? '+' : ''}${feedback.xpReward} XP</span></p>` : ''}
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
                `;
            }).join('');
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
                
                // Update UI immediately
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
                    
                    // Update UI immediately
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
                
                // Update UI immediately
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
        this.populatePlayerChecklist('questPlayerChecklist', 'questSelectAll');
    }
    
    populatePlayerChecklist(checklistId, selectAllId) {
        const checklist = document.getElementById(checklistId);
        const selectAllCheckbox = document.getElementById(selectAllId);
        
        if (!checklist || !selectAllCheckbox) return;
        
        // Clear existing content
        checklist.innerHTML = '';
        
        // Add individual player checkboxes
        this.players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-checkbox-item';
            playerItem.innerHTML = `
                <input type="checkbox" id="${checklistId}_${player.id}" value="${player.id}" class="player-checkbox">
                <div class="player-checkbox-info">
                    <div class="player-checkbox-avatar">${player.name ? player.name.charAt(0).toUpperCase() : '?'}</div>
                    <span class="player-checkbox-name">${player.name || player.email}</span>
                    <span class="player-checkbox-level">Lv.${player.level || 1}</span>
                </div>
            `;
            checklist.appendChild(playerItem);
        });
        
        // Setup event listeners
        this.setupChecklistEventListeners(checklistId, selectAllId);
    }
    
    setupChecklistEventListeners(checklistId, selectAllId) {
        const checklist = document.getElementById(checklistId);
        const selectAllCheckbox = document.getElementById(selectAllId);
        const playerCheckboxes = checklist.querySelectorAll('.player-checkbox');
        
        // Select All functionality
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            playerCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });
        
        // Individual checkbox functionality
        playerCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checkedCount = Array.from(playerCheckboxes).filter(cb => cb.checked).length;
                const totalCount = playerCheckboxes.length;
                
                // Update select all checkbox state
                if (checkedCount === 0) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                } else if (checkedCount === totalCount) {
                    selectAllCheckbox.checked = true;
                    selectAllCheckbox.indeterminate = false;
                } else {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = true;
                }
            });
        });
        
        // Click on player item to toggle checkbox
        checklist.addEventListener('click', (e) => {
            const playerItem = e.target.closest('.player-checkbox-item');
            if (playerItem && !e.target.matches('input[type="checkbox"]')) {
                const checkbox = playerItem.querySelector('.player-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        });
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
                document.getElementById('questTask').value = quest.task || '';
                // Set the selected player in the checklist
                this.setSelectedPlayerInChecklist('questPlayerChecklist', quest.assignedPlayer);
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
            
            // Clear the checklist for new quest
            this.clearChecklist('questPlayerChecklist', 'questSelectAll');
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
    
    showMessagesModal() {
        const modal = document.getElementById('messagesModal');
        if (modal) {
            modal.classList.add('show');
            this.loadMessages();
        }
    }
    
    hideMessagesModal() {
        const modal = document.getElementById('messagesModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    async loadMessages() {
        try {
            if (!window.db) {
                console.error('❌ Firebase not initialized');
                this.renderMessages([]);
                return;
            }
            
            // Load messages from Firebase
            const messagesRef = window.collection(window.db, 'admin_messages');
            const messagesSnapshot = await window.getDocs(messagesRef);
            
            const messages = [];
            messagesSnapshot.forEach(doc => {
                const messageData = doc.data();
                messages.push({
                    id: doc.id,
                    ...messageData
                });
            });
            
            // Sort by timestamp (newest first)
            messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            console.log(`📧 Loaded ${messages.length} messages from Firebase`);
            this.renderMessages(messages);
            
        } catch (error) {
            console.error('❌ Error loading messages from Firebase:', error);
            this.renderMessages([]);
        }
    }
    
    renderMessages(messages) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<div class="empty-state"><h4>No messages</h4><p>No justification messages received yet</p></div>';
            return;
        }
        
        messagesList.innerHTML = messages.map(message => {
            const timeAgo = this.formatTimeAgo(new Date(message.timestamp));
            const isUnread = message.status === 'unread';
            
            return `
                <div class="message-item ${isUnread ? 'unread' : ''}">
                    <div class="message-header">
                        <div>
                            <div class="message-player">From: ${message.playerName}</div>
                            <div class="message-quest">Quest: ${message.questName}</div>
                        </div>
                        <div class="message-time">${timeAgo}</div>
                    </div>
                    <div class="message-content">${message.message}</div>
                    <div class="message-actions">
                        <span class="message-status ${message.status}">${message.status === 'unread' ? 'Unread' : 'Read'}</span>
                        ${isUnread ? `<button class="btn btn-primary" onclick="adminDashboard.markAsRead('${message.id}')">Mark as Read</button>` : ''}
                        <button class="btn btn-danger delete-message-btn" onclick="adminDashboard.deleteMessage('${message.id}')" title="Delete message">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update notification badge
        this.updateMessageCount(messages.filter(m => m.status === 'unread').length);
    }
    
    async markAsRead(messageId) {
        try {
            // Update Firebase
            if (window.db) {
                const messageRef = window.doc(window.db, 'admin_messages', messageId);
                await window.updateDoc(messageRef, {
                    status: 'read',
                    readAt: new Date().toISOString()
                });
            }
            
            // Update UI
            const messageItem = document.querySelector(`[onclick*="${messageId}"]`).closest('.message-item');
            if (messageItem) {
                messageItem.classList.remove('unread');
                const statusElement = messageItem.querySelector('.message-status');
                statusElement.textContent = 'Read';
                statusElement.className = 'message-status read';
                
                // Remove the "Mark as Read" button
                const markAsReadBtn = messageItem.querySelector('button[onclick*="markAsRead"]');
                if (markAsReadBtn) {
                    markAsReadBtn.remove();
                }
            }
            
            // Update notification count
            const unreadCount = document.querySelectorAll('.message-item.unread').length;
            this.updateMessageCount(unreadCount);
            
            console.log(`✅ Message ${messageId} marked as read`);
            
        } catch (error) {
            console.error('❌ Error marking message as read:', error);
            this.showError('Failed to mark message as read');
        }
    }
    
    async deleteMessage(messageId) {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
            return;
        }
        
        try {
            // Delete from Firebase
            if (window.db) {
                const messageRef = window.doc(window.db, 'admin_messages', messageId);
                await window.deleteDoc(messageRef);
            }
            
            // Remove from UI
            const messageItem = document.querySelector(`[onclick*="deleteMessage('${messageId}')"]`).closest('.message-item');
            if (messageItem) {
                messageItem.style.transition = 'opacity 0.3s ease';
                messageItem.style.opacity = '0';
                setTimeout(() => {
                    messageItem.remove();
                    
                    // Update notification count
                    const unreadCount = document.querySelectorAll('.message-item.unread').length;
                    this.updateMessageCount(unreadCount);
                    
                    // If no messages left, show empty state
                    const messagesList = document.getElementById('messagesList');
                    if (messagesList && messagesList.querySelectorAll('.message-item').length === 0) {
                        messagesList.innerHTML = '<div class="empty-state"><h4>No messages</h4><p>No justification messages received yet</p></div>';
                    }
                }, 300);
            }
            
            console.log(`✅ Message ${messageId} deleted`);
            
        } catch (error) {
            console.error('❌ Error deleting message:', error);
            this.showError('Failed to delete message');
        }
    }
    
    
    updateMessageCount(count) {
        const badge = document.getElementById('messageCount');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
    
    // Placeholder methods for new sections
        showFeedbackModal() {
            console.log('📝 Opening feedback modal...');
            this.showFeedbackForm();
        }
        
        showFeedbackForm() {
            const feedbackModal = document.getElementById('feedbackModal');
            if (!feedbackModal) return;
            
            // Populate player checklist
            this.populateFeedbackPlayerSelect();
            
            // Clear the checklist for new feedback
            this.clearChecklist('feedbackPlayerChecklist', 'feedbackSelectAll');
            
            // Show modal
            feedbackModal.style.display = 'flex';
            
            // Add event listeners for modal
            this.setupFeedbackModalEventListeners();
        }
        
        populateFeedbackPlayerSelect() {
            this.populatePlayerChecklist('feedbackPlayerChecklist', 'feedbackSelectAll');
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
                const selectedPlayers = this.getSelectedPlayers('feedbackPlayerChecklist');
                const feedbackType = document.getElementById('feedbackType').value;
                const feedbackXP = parseInt(document.getElementById('feedbackXP').value) || 0;
                const title = document.getElementById('feedbackTitle').value.trim();
                const message = document.getElementById('feedbackMessage').value.trim();
                
                // Show loading overlay and disable submit button
                this.showModalLoading('feedbackModal', 'feedbackLoadingOverlay');
                this.disableSubmitButton('feedbackForm');
                
                // Validation
                if (selectedPlayers.length === 0) {
                    this.showError('Please select at least one player');
                    this.hideModalLoading('feedbackModal', 'feedbackLoadingOverlay');
                    this.enableSubmitButton('feedbackForm');
                    return;
                }
                
                if (!feedbackType) {
                    this.showError('Please select feedback type');
                    this.hideModalLoading('feedbackModal', 'feedbackLoadingOverlay');
                    this.enableSubmitButton('feedbackForm');
                    return;
                }
                
                if (!title) {
                    this.showError('Please enter a title');
                    this.hideModalLoading('feedbackModal', 'feedbackLoadingOverlay');
                    this.enableSubmitButton('feedbackForm');
                    return;
                }
                
                if (!message) {
                    this.showError('Please enter a message');
                    this.hideModalLoading('feedbackModal', 'feedbackLoadingOverlay');
                    this.enableSubmitButton('feedbackForm');
                    return;
                }
                
                // Validate XP range
                if (feedbackXP < -5 || feedbackXP > 5) {
                    this.showError('XP reward must be between -5 and +5');
                    this.hideModalLoading('feedbackModal', 'feedbackLoadingOverlay');
                    this.enableSubmitButton('feedbackForm');
                    return;
                }
                
                // Create feedback for each selected player
                let sentCount = 0;
                const playerNames = [];
                
                for (const playerId of selectedPlayers) {
                    const player = this.players.find(p => p.id === playerId);
                    if (!player) continue;
                    
                const feedback = {
                        id: `${Date.now()}_${playerId}`,
                    playerId: playerId,
                        playerName: player.name || 'Unknown Player',
                    type: feedbackType,
                    title: title,
                    message: message,
                    xpReward: feedbackXP,
                    timestamp: new Date().toISOString(),
                    sentBy: this.currentUser.uid,
                    sentByName: this.currentUser.displayName || 'Admin',
                    status: 'unread',
                    gameNotification: true
                };
                
                // Save to Firebase
                await this.saveFeedbackToFirebase(feedback);
                
                // Apply XP reward to player if not zero
                if (feedbackXP !== 0) {
                    await this.applyXPToPlayer(playerId, feedbackXP);
                }
                
                // Add to local feedback history immediately
                this.feedbackHistory.push(feedback);
                    
                    sentCount++;
                    playerNames.push(player.name || 'Unknown Player');
                }
                
                // Always update UI immediately (regardless of current tab)
                this.renderFeedback();
                
                // If not on feedback tab, switch to it to show the new feedback
                if (this.currentTab !== 'feedback') {
                    this.switchTab('feedback');
                }
                
                // Remove the "new" highlight after 5 seconds
                setTimeout(() => {
                    this.renderFeedback();
                }, 5000);
                
                // Hide modal
                this.hideFeedbackModal();
                
                // Clear form
                document.getElementById('feedbackForm').reset();
                document.getElementById('feedbackXP').value = '0';
                
                console.log(`✅ Feedback sent to ${sentCount} player(s)`);
                
                // Create success message with XP info
                let successMessage;
                if (sentCount === 1) {
                    successMessage = `Feedback sent to ${playerNames[0]}! They will see it in their game.`;
                if (feedbackXP !== 0) {
                        successMessage += `\n\n${feedbackXP > 0 ? '➕' : '➖'} ${Math.abs(feedbackXP)} XP ${feedbackXP > 0 ? 'added to' : 'removed from'} ${playerNames[0]}.`;
                    }
                } else {
                    successMessage = `Feedback sent to ${sentCount} players! They will see it in their game.`;
                    if (feedbackXP !== 0) {
                        successMessage += `\n\n${feedbackXP > 0 ? '➕' : '➖'} ${Math.abs(feedbackXP)} XP ${feedbackXP > 0 ? 'added to' : 'removed from'} each player.`;
                    }
                }
                
                this.showSuccess(successMessage);
                
        } catch (error) {
                console.error('❌ Error sending feedback:', error);
                this.showError('Failed to send feedback');
            } finally {
                // Hide loading overlay and re-enable submit button
                this.hideModalLoading('feedbackModal', 'feedbackLoadingOverlay');
                this.enableSubmitButton('feedbackForm');
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
    
        // Method to force refresh all displays
        refreshAllDisplays() {
            this.renderLeaderboard();
            this.renderQuests();
            this.renderFeedback();
            this.renderMissions();
            this.renderDaygrades();
        }
        
        // Method to apply XP to a player
        async applyXPToPlayer(playerId, xpAmount) {
            try {
                const player = this.players.find(p => p.id === playerId);
                if (!player) {
                    console.error('❌ Player not found:', playerId);
                    return false;
                }
                
                const currentExperience = player.experience || 0;
                const currentLevel = player.level || 1;
                let newExperience = currentExperience + xpAmount;
                let newLevel = currentLevel;
                
                // Handle negative XP (can't go below 0)
                if (newExperience < 0) {
                    newExperience = 0;
                }
                
                // Check if player leveled up or down
                while (newLevel < 10 && newExperience >= (newLevel * 100)) {
                    newExperience -= (newLevel * 100);
                    newLevel++;
                }
                
                // Handle level down (if XP goes negative and affects level)
                while (newLevel > 1 && newExperience < 0) {
                    newLevel--;
                    newExperience += (newLevel * 100);
                }
                
                // Cap at level 10
                if (newLevel > 10) {
                    newLevel = 10;
                    newExperience = 0;
                }
                
                // Update player in Firebase
                await window.updateDoc(window.doc(window.db, 'users', playerId), {
                    experience: newExperience,
                    level: newLevel
                });
                
                // Update local player data
                player.experience = newExperience;
                player.level = newLevel;
                
                console.log(`✅ Applied ${xpAmount} XP to ${player.name}. New level: ${newLevel}, XP: ${newExperience}`);
                
                // Refresh leaderboard to show updated stats
                this.renderLeaderboard();
                
                return true;
                
            } catch (error) {
                console.error('❌ Error applying XP to player:', error);
                return false;
            }
        }
    
    
    async handleQuestSubmit(e) {
        e.preventDefault();
        
        const questId = document.getElementById('questId').value;
        const selectedPlayers = this.getSelectedPlayers('questPlayerChecklist');
        
        // Show loading overlay and disable submit button
        this.showModalLoading('questModal', 'questLoadingOverlay');
        this.disableSubmitButton('questForm');
        
        // Validation
        if (!questId && selectedPlayers.length === 0) {
            this.showError('Please select at least one player for the quest');
            this.hideModalLoading('questModal', 'questLoadingOverlay');
            this.enableSubmitButton('questForm');
            return;
        }
        
        const baseFormData = {
            logo: document.getElementById('questLogo').value || '📍',
            name: document.getElementById('questName').value,
            description: document.getElementById('questDescription').value,
            task: document.getElementById('questTask').value,
            endTime: document.getElementById('questEndTime').value,
            verificationName: document.getElementById('questVerificationName').value,
            verificationLink: document.getElementById('questVerificationLink').value,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        try {
            if (questId) {
                // Update existing quest (single quest)
                const quest = this.quests.find(q => q.id === questId);
                if (quest) {
                await window.updateDoc(window.doc(window.db, 'quests', questId), {
                        ...baseFormData,
                        assignedPlayer: selectedPlayers.length > 0 ? selectedPlayers[0] : quest.assignedPlayer,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Quest updated');
                }
            } else {
                // Create new quest(s) for each selected player
                let createdCount = 0;
                
                for (const playerId of selectedPlayers) {
                    const questData = {
                        ...baseFormData,
                        assignedPlayer: playerId,
                        createdAt: new Date().toISOString()
                    };
                    
                const newQuestRef = window.doc(window.collection(window.db, 'quests'));
                    await window.setDoc(newQuestRef, questData);
                    createdCount++;
                }
                
                console.log(`✅ ${createdCount} quest(s) created for ${selectedPlayers.length} player(s)`);
                
                if (createdCount > 1) {
                    this.showSuccess(`Successfully created ${createdCount} quests for ${selectedPlayers.length} players!`);
                }
            }
            
            this.hideQuestModal();
            await this.loadQuests();
            
            // Force refresh the quests display immediately
            this.renderQuests();
        } catch (error) {
            console.error('❌ Error saving quest:', error);
            this.showError('Failed to save quest');
        } finally {
            // Hide loading overlay and re-enable submit button
            this.hideModalLoading('questModal', 'questLoadingOverlay');
            this.enableSubmitButton('questForm');
        }
    }
    
    getSelectedPlayers(checklistId) {
        const checklist = document.getElementById(checklistId);
        if (!checklist) return [];
        
        const checkedBoxes = checklist.querySelectorAll('.player-checkbox:checked');
        return Array.from(checkedBoxes).map(checkbox => checkbox.value);
    }
    
    setSelectedPlayerInChecklist(checklistId, playerId) {
        const checklist = document.getElementById(checklistId);
        if (!checklist || !playerId) return;
        
        // Clear all selections first
        this.clearChecklist(checklistId, checklistId.replace('Checklist', 'SelectAll'));
        
        // Select the specific player
        const checkbox = checklist.querySelector(`input[value="${playerId}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        }
    }
    
    clearChecklist(checklistId, selectAllId) {
        const checklist = document.getElementById(checklistId);
        const selectAllCheckbox = document.getElementById(selectAllId);
        
        if (checklist) {
            const checkboxes = checklist.querySelectorAll('.player-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }
    
    showModalLoading(modalId, overlayId) {
        const overlay = document.getElementById(overlayId);
        
        if (overlay) {
            overlay.classList.add('show');
        }
    }
    
    hideModalLoading(modalId, overlayId) {
        const overlay = document.getElementById(overlayId);
        
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
    
    disableSubmitButton(formId) {
        const form = document.getElementById(formId);
        if (form) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = submitButton.textContent.includes('Quest') ? 'Saving...' : 'Sending...';
                submitButton.style.opacity = '0.6';
                submitButton.style.cursor = 'not-allowed';
            }
        }
    }
    
    enableSubmitButton(formId) {
        const form = document.getElementById(formId);
        if (form) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.textContent.includes('Saving') ? 'Save Quest' : 'Send Feedback';
                submitButton.style.opacity = '1';
                submitButton.style.cursor = 'pointer';
            }
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
                task: quest.task || '',
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
            
            // Force refresh the quests display immediately
            this.renderQuests();
            
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
    
    // Notify the game about quest status updates for real-time updates
    notifyGameOfQuestUpdate(questId, newStatus) {
        try {
            // Try to find the game window and notify it
            if (window.opener && window.opener.game && window.opener.game.auth) {
                // If admin dashboard was opened from the game
                window.opener.dispatchEvent(new CustomEvent('questStatusUpdated', {
                    detail: { questId, newStatus }
                }));
            } else {
                // Try to find any open game window
                const gameWindows = window.parent.frames || [];
                for (let i = 0; i < gameWindows.length; i++) {
                    try {
                        if (gameWindows[i].game && gameWindows[i].game.auth) {
                            gameWindows[i].dispatchEvent(new CustomEvent('questStatusUpdated', {
                                detail: { questId, newStatus }
                            }));
                            break;
                        }
                    } catch (e) {
                        // Cross-origin or window closed, continue
                    }
                }
            }
            
            // Also try to use localStorage as a fallback for real-time updates
            const questUpdate = {
                questId: questId,
                newStatus: newStatus,
                timestamp: Date.now()
            };
            localStorage.setItem('questStatusUpdate', JSON.stringify(questUpdate));
            
            // Trigger a custom event that the game can listen to
            window.dispatchEvent(new CustomEvent('questStatusUpdated', {
                detail: { questId, newStatus }
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
            
            // Force refresh the quests display immediately
            this.renderQuests();
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
        const taskName = quest.task ? quest.task.charAt(0).toUpperCase() + quest.task.slice(1) : 'Not specified';
        if (quest.status === 'player_done') {
            confirmMessage = `Approve quest completion for ${player.name}?\n\nPlayer has marked this quest as done.\n\nTask: ${taskName}\n\nThis action cannot be undone.`;
        } else {
            confirmMessage = `Approve quest completion for ${player.name}?\n\nTask: ${taskName}\n\nThis action cannot be undone.`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            console.log(`✅ Quest approved for ${player.name}: Task - ${taskName}`);
            
            // Mark quest as completed
            await window.updateDoc(window.doc(window.db, 'quests', questId), {
                status: 'completed',
                completedAt: new Date().toISOString(),
                completedBy: player.id
            });
            
            // Show success message
            let successMessage;
            if (quest.status === 'player_done') {
                successMessage = `Quest approved! ${player.name} completed the task: ${taskName}.`;
            } else {
                successMessage = `Quest approved! ${player.name} completed the task: ${taskName}.`;
            }
            this.showSuccessMessage(successMessage);
            
            // Refresh data
            await this.loadQuests();
            
            // Force refresh the displays immediately
            this.renderQuests();
            
            // Notify the game about quest status update
            this.notifyGameOfQuestUpdate(questId, 'completed');
            
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
    
    // Make refresh all displays available globally for debugging
    window.refreshAllDisplays = () => {
        if (window.adminDashboard) {
            return window.adminDashboard.refreshAllDisplays();
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