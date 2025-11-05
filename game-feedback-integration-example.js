/**
 * Game Feedback Integration Example
 * Shows how to implement feedback reading functionality in the game
 */

class GameFeedbackManager {
    constructor() {
        this.currentPlayerId = null;
        this.unreadFeedbacks = [];
        this.init();
    }
    
    init() {
        // Get current player ID (implement based on your game's auth system)
        this.currentPlayerId = this.getCurrentPlayerId();
        
        if (this.currentPlayerId) {
            this.loadPlayerFeedbacks();
            this.setupFeedbackNotificationListener();
        }
    }
    
    getCurrentPlayerId() {
        // Implement this based on your game's authentication system
        // This should return the current player's ID
        return localStorage.getItem('currentPlayerId') || 'player123';
    }
    
    async loadPlayerFeedbacks() {
        try {
            // Load feedbacks from Firebase for this player
            const playerFeedbackRef = doc(db, 'playerFeedback', this.currentPlayerId);
            const playerFeedbackSnap = await getDoc(playerFeedbackRef);
            
            if (playerFeedbackSnap.exists()) {
                const feedbacks = playerFeedbackSnap.data().feedbacks || [];
                this.unreadFeedbacks = feedbacks.filter(f => f.status === 'unread');
                
                // Show notification if there are unread feedbacks
                if (this.unreadFeedbacks.length > 0) {
                    this.showFeedbackNotification();
                }
            }
        } catch (error) {
            console.error('❌ Error loading player feedbacks:', error);
        }
    }
    
    showFeedbackNotification() {
        if (this.unreadFeedbacks.length === 0) return;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'feedback-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>📝 New Feedback!</h4>
                <p>You have ${this.unreadFeedbacks.length} unread feedback message${this.unreadFeedbacks.length > 1 ? 's' : ''}</p>
                <button onclick="gameFeedbackManager.showFeedbackModal()" class="btn btn-primary">
                    View Feedback
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary">
                    Dismiss
                </button>
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    showFeedbackModal() {
        // Create feedback modal
        const modal = document.createElement('div');
        modal.className = 'feedback-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Your Feedback</h3>
                        <button class="close-btn" onclick="this.closest('.feedback-modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="feedbackList">
                            ${this.renderFeedbackList()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    renderFeedbackList() {
        if (this.unreadFeedbacks.length === 0) {
            return '<p>No unread feedback messages.</p>';
        }
        
        return this.unreadFeedbacks.map(feedback => `
            <div class="feedback-item">
                <div class="feedback-header">
                    <div class="feedback-type ${feedback.type}">
                        ${feedback.type === 'positive' ? '✅' : '❌'} ${feedback.type.toUpperCase()}
                    </div>
                    <div class="feedback-time">${new Date(feedback.timestamp).toLocaleString()}</div>
                </div>
                <div class="feedback-content">
                    <h4>${feedback.title}</h4>
                    <p><strong>From:</strong> ${feedback.sentByName || 'Admin'}</p>
                    <p><strong>Message:</strong> ${feedback.message}</p>
                </div>
                <div class="feedback-actions">
                    <button class="btn btn-primary" onclick="gameFeedbackManager.markAsRead('${feedback.id}')">
                        Mark as Read
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    async markAsRead(feedbackId) {
        try {
            // Call the admin dashboard function to mark as read
            const success = await window.markFeedbackAsReadByPlayer(feedbackId, this.currentPlayerId);
            
            if (success) {
                // Remove from local unread list
                this.unreadFeedbacks = this.unreadFeedbacks.filter(f => f.id !== feedbackId);
                
                // Update the UI
                this.updateFeedbackUI();
                
                // Show success message
                this.showSuccessMessage('Feedback marked as read!');
                
                // Check if all feedbacks are read
                if (this.unreadFeedbacks.length === 0) {
                    this.hideFeedbackNotification();
                }
            } else {
                this.showErrorMessage('Failed to mark feedback as read');
            }
        } catch (error) {
            console.error('❌ Error marking feedback as read:', error);
            this.showErrorMessage('Error marking feedback as read');
        }
    }
    
    updateFeedbackUI() {
        const feedbackList = document.getElementById('feedbackList');
        if (feedbackList) {
            feedbackList.innerHTML = this.renderFeedbackList();
        }
    }
    
    hideFeedbackNotification() {
        const notification = document.querySelector('.feedback-notification');
        if (notification) {
            notification.remove();
        }
    }
    
    setupFeedbackNotificationListener() {
        // Listen for new feedback notifications
        // This could be implemented with Firebase real-time listeners
        // or periodic checks
        
        setInterval(() => {
            this.loadPlayerFeedbacks();
        }, 30000); // Check every 30 seconds
    }
    
    showSuccessMessage(message) {
        // Create success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            z-index: 10001;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
    
    showErrorMessage(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ef4444;
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            z-index: 10001;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize the feedback manager when the game loads
document.addEventListener('DOMContentLoaded', () => {
    window.gameFeedbackManager = new GameFeedbackManager();
});

// Example of how to manually check for feedback (can be called from game)
function checkForNewFeedback() {
    if (window.gameFeedbackManager) {
        window.gameFeedbackManager.loadPlayerFeedbacks();
    }
}

// Example of how to show feedback modal (can be called from game UI)
function showPlayerFeedback() {
    if (window.gameFeedbackManager) {
        window.gameFeedbackManager.showFeedbackModal();
    }
}
