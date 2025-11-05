/**
 * Players Management Page - Dedicated player CRUD operations
 * Handles authentication, player management, and navigation
 */

class PlayersManager {
    constructor() {
        this.currentUser = null;
        this.players = [];
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Players Manager...');
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Setup authentication listener
        this.setupAuthListener();
        
        // Setup event listeners
        this.setupEventListeners();
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
                this.showPlayersPage();
                await this.loadPlayers();
            } else {
                console.log('❌ Admin role not found, redirecting to login');
                this.showError('Access denied. Admin privileges required.');
                await window.signOut(window.auth);
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('❌ Error checking admin role:', error);
            this.showError('Error verifying admin access.');
            this.redirectToLogin();
        }
    }
    
    setupEventListeners() {
        // Back to dashboard button
        const backBtn = document.getElementById('backToDashboard');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.goBackToDashboard());
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Add player button
        const addPlayerBtn = document.getElementById('addPlayerBtn');
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', () => this.showPlayerModal());
        }
        
        // Modal close buttons
        const closePlayerModal = document.getElementById('closePlayerModal');
        if (closePlayerModal) {
            closePlayerModal.addEventListener('click', () => this.hidePlayerModal());
        }
        
        // Cancel buttons
        const cancelPlayerBtn = document.getElementById('cancelPlayerBtn');
        if (cancelPlayerBtn) {
            cancelPlayerBtn.addEventListener('click', () => this.hidePlayerModal());
        }
        
        // Form submissions
        const playerForm = document.getElementById('playerForm');
        if (playerForm) {
            playerForm.addEventListener('submit', (e) => this.handlePlayerSubmit(e));
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hidePlayerModal();
            }
        });
        
        // Success notification close button
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            closeNotification.addEventListener('click', () => this.hideSuccessNotification());
        }
    }
    
    async handleLogout() {
        try {
            await window.signOut(window.auth);
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    }
    
    goBackToDashboard() {
        window.location.href = 'index.html';
    }
    
    redirectToLogin() {
        window.location.href = 'index.html';
    }
    
    showPlayersPage() {
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
            
            this.renderPlayers();
        } catch (error) {
            console.error('❌ Error loading players:', error);
        }
    }
    
    renderPlayers() {
        const playersList = document.getElementById('playersList');
        if (!playersList) return;
        
        if (this.players.length === 0) {
            playersList.innerHTML = '<div class="empty-state"><h4>No players found</h4><p>Players will appear here once they register</p></div>';
            return;
        }
        
        playersList.innerHTML = this.players.map(player => `
            <div class="list-item">
                <div class="item-info">
                    <div class="item-title">
                        ${player.skin ? `<img src="${player.skin}" alt="Skin" class="player-skin-preview" onerror="this.style.display='none'">` : ''}
                        ${player.name || 'Unknown Player'}
                    </div>
                    <div class="item-subtitle">${player.email} • Level ${player.level || 1} • ${player.points || 0} DZD • Last login: ${this.formatLastLogin(player.lastLogin)}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary" onclick="playersManager.editPlayer('${player.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="playersManager.deletePlayer('${player.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    showPlayerModal(playerId = null) {
        const modal = document.getElementById('playerModal');
        const title = document.getElementById('playerModalTitle');
        const form = document.getElementById('playerForm');
        
        if (playerId) {
            // Edit mode
            const player = this.players.find(p => p.id === playerId);
            if (player) {
                title.textContent = 'Edit Player';
                document.getElementById('playerId').value = player.id;
                document.getElementById('playerEmail').value = player.email || '';
                document.getElementById('playerPassword').value = '';
                document.getElementById('playerName').value = player.name || '';
                document.getElementById('playerSkin').value = player.skin || '';
                document.getElementById('playerCoins').value = player.points || 0;
                document.getElementById('playerLevel').value = player.level || 1;
                document.getElementById('playerXP').value = player.experience || 0;
            }
        } else {
            // Add mode
            title.textContent = 'Add Player';
            form.reset();
            document.getElementById('playerId').value = '';
        }
        
        modal.classList.add('show');
    }
    
    hidePlayerModal() {
        const modal = document.getElementById('playerModal');
        modal.classList.remove('show');
    }
    
    async handlePlayerSubmit(e) {
        e.preventDefault();
        
        const formData = {
            email: document.getElementById('playerEmail').value,
            password: document.getElementById('playerPassword').value,
            name: document.getElementById('playerName').value,
            skin: document.getElementById('playerSkin').value,
            points: parseInt(document.getElementById('playerCoins').value) || 0,
            level: parseInt(document.getElementById('playerLevel').value) || 1,
            experience: parseInt(document.getElementById('playerXP').value) || 0
        };
        
        // Validate email format
        if (!this.isValidEmail(formData.email)) {
            this.showError('Please enter a valid email address (e.g., user@example.com)');
            return;
        }
        
        const playerId = document.getElementById('playerId').value;
        
        try {
            if (playerId) {
                // Update existing player
                await window.updateDoc(window.doc(window.db, 'users', playerId), {
                    name: formData.name,
                    skin: formData.skin,
                    points: formData.points,
                    level: formData.level,
                    experience: formData.experience
                });
                console.log('✅ Player updated');
            } else {
                // Create new player with Firebase Auth account
                if (!formData.password) {
                    throw new Error('Password is required for new players');
                }
                
                // Create user document in Firestore with a custom UID
                // The game will handle Firebase Auth creation on first login
                const customUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                await window.setDoc(window.doc(window.db, 'users', customUserId), {
                    email: formData.email,
                    name: formData.name,
                    skin: formData.skin,
                    points: formData.points,
                    level: formData.level,
                    experience: formData.experience,
                    createdAt: new Date().toISOString(),
                    password: formData.password, // Store password for first-time auth creation
                    needsAuthCreation: true // Flag to indicate this user needs Firebase Auth account
                });
                
                console.log('✅ Player created in Firestore with custom ID:', customUserId);
                
                // Show success notification with login credentials
                this.showSuccessNotification(formData.email, formData.password);
            }
            
            this.hidePlayerModal();
            await this.loadPlayers();
        } catch (error) {
            console.error('❌ Error saving player:', error);
            this.showError('Failed to save player');
        }
    }
    
    editPlayer(playerId) {
        this.showPlayerModal(playerId);
    }
    
    async deletePlayer(playerId) {
        if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
            return;
        }
        
        try {
            await window.deleteDoc(window.doc(window.db, 'users', playerId));
            console.log('✅ Player deleted');
            await this.loadPlayers();
        } catch (error) {
            console.error('❌ Error deleting player:', error);
            this.showError('Failed to delete player');
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
}

// Initialize the players manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.playersManager = new PlayersManager();
});
