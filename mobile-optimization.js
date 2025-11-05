/**
 * Mobile Optimization Script for RivalDash
 * Enhances mobile experience with touch-friendly interactions
 */

class MobileOptimizer {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.isTouch = 'ontouchstart' in window;
        
        this.init();
    }
    
    init() {
        if (this.isMobile) {
            this.setupMobileOptimizations();
        }
        
        this.setupResponsiveHandlers();
        this.setupTouchOptimizations();
    }
    
    setupMobileOptimizations() {
        // Prevent double-tap zoom on buttons
        document.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('btn') || 
                e.target.classList.contains('icon-button') ||
                e.target.classList.contains('star-btn')) {
                e.preventDefault();
                e.target.click();
            }
        });
        
        // Improve modal scrolling on mobile
        this.optimizeModalScrolling();
        
        // Add mobile-specific classes
        document.body.classList.add('mobile-device');
        
        // Optimize tab navigation for mobile
        this.optimizeTabNavigation();
    }
    
    setupResponsiveHandlers() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const wasMobile = this.isMobile;
                this.isMobile = window.innerWidth <= 768;
                
                if (wasMobile !== this.isMobile) {
                    this.handleResponsiveChange();
                }
            }, 250);
        });
    }
    
    setupTouchOptimizations() {
        if (this.isTouch) {
            // Add touch feedback to interactive elements
            this.addTouchFeedback();
            
            // Optimize star rating for touch
            this.optimizeStarRating();
            
            // Improve button press feedback
            this.improveButtonFeedback();
        }
    }
    
    optimizeModalScrolling() {
        const modals = document.querySelectorAll('.modal-content, .submissions-modal');
        
        modals.forEach(modal => {
            modal.style.webkitOverflowScrolling = 'touch';
            modal.style.overflowY = 'auto';
            
            // Prevent body scroll when modal is open
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (modal.closest('.modal').classList.contains('show')) {
                            document.body.style.overflow = 'hidden';
                        } else {
                            document.body.style.overflow = '';
                        }
                    }
                });
            });
            
            observer.observe(modal.closest('.modal'), { attributes: true });
        });
    }
    
    optimizeTabNavigation() {
        const tabNavigation = document.querySelector('.tab-navigation');
        if (!tabNavigation) return;
        
        // Always enable horizontal scroll for mobile
        if (this.isMobile) {
            tabNavigation.style.overflowX = 'auto';
            tabNavigation.style.scrollSnapType = 'x mandatory';
            tabNavigation.style.scrollbarWidth = 'none';
            tabNavigation.style.msOverflowStyle = 'none';
            
            const tabButtons = tabNavigation.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.style.scrollSnapAlign = 'start';
                button.style.flexShrink = '0';
                button.style.minWidth = '120px';
            });
            
            // Add smooth scrolling behavior
            tabNavigation.addEventListener('scroll', () => {
                tabNavigation.style.scrollBehavior = 'smooth';
            });
        }
    }
    
    addTouchFeedback() {
        const touchElements = document.querySelectorAll('.btn, .icon-button, .star-btn, .emoji-option');
        
        touchElements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                element.classList.add('touch-active');
            });
            
            element.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, 150);
            });
            
            element.addEventListener('touchcancel', (e) => {
                element.classList.remove('touch-active');
            });
        });
    }
    
    optimizeStarRating() {
        const starButtons = document.querySelectorAll('.star-btn');
        
        starButtons.forEach(button => {
            // Increase touch target size
            button.style.minWidth = '44px';
            button.style.minHeight = '44px';
            button.style.padding = '8px';
            
            // Add haptic feedback if available
            button.addEventListener('touchstart', (e) => {
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            });
        });
    }
    
    improveButtonFeedback() {
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.95)';
                button.style.transition = 'transform 0.1s ease';
            });
            
            button.addEventListener('touchend', (e) => {
                button.style.transform = 'scale(1)';
            });
            
            button.addEventListener('touchcancel', (e) => {
                button.style.transform = 'scale(1)';
            });
        });
    }
    
    handleResponsiveChange() {
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
            this.setupMobileOptimizations();
        } else {
            document.body.classList.remove('mobile-device');
            this.removeMobileOptimizations();
        }
    }
    
    removeMobileOptimizations() {
        // Remove mobile-specific event listeners if needed
        document.body.style.overflow = '';
    }
}

// Initialize mobile optimizer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileOptimizer = new MobileOptimizer();
});

// Add CSS for touch feedback
const touchStyles = `
.touch-active {
    transform: scale(0.95) !important;
    opacity: 0.8 !important;
}

.mobile-device .modal {
    align-items: flex-start;
    padding-top: 1rem;
}

.mobile-device .modal-content {
    margin-top: 0;
    max-height: calc(100vh - 2rem);
}

.mobile-device .tab-navigation {
    flex-direction: row;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
}

.mobile-device .tab-navigation::-webkit-scrollbar {
    display: none;
}

.mobile-device .tab-button {
    flex: 1;
    min-width: 120px;
    flex-shrink: 0;
    white-space: nowrap;
}

.mobile-device .quest-actions {
    flex-wrap: wrap;
    gap: 0.5rem;
}

.mobile-device .feedback-actions {
    flex-direction: column;
    gap: 0.5rem;
}

@media (max-width: 480px) {
    .mobile-device .dashboard-header {
        padding: 0.75rem;
    }
    
    .mobile-device .dashboard-content {
        padding: 0.75rem;
    }
    
    .mobile-device .quest-item,
    .mobile-device .feedback-item,
    .mobile-device .player-grade-card {
        padding: 0.75rem;
    }
}
`;

// Inject mobile styles
const styleSheet = document.createElement('style');
styleSheet.textContent = touchStyles;
document.head.appendChild(styleSheet);
