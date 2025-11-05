/**
 * Login Page - Handles authentication and redirects
 * Redirects to dashboard if already logged in, handles login if not
 */

class LoginManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Login Manager...');
        
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
                console.log('👤 User already logged in:', user.email);
                this.currentUser = user;
                await this.checkAdminRole(user);
            } else {
                console.log('👋 User not logged in, showing login form');
                this.currentUser = null;
                this.showLoginForm();
            }
        });
    }
    
    async checkAdminRole(user) {
        try {
            console.log('🔍 Checking admin role for user:', user.email, 'UID:', user.uid);
            
            const adminDoc = await window.getDoc(window.doc(window.db, 'admin_users', user.uid));
            
            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                console.log('✅ Admin role verified, redirecting to dashboard');
                this.redirectToDashboard();
            } else {
                console.log('❌ Admin role not found, attempting to create...');
                
                // Check if this is the default admin user or any admin user
                if (user.email === 'adminfaouzi@gmail.com' || user.email.includes('admin')) {
                    console.log('🔧 Creating admin role for admin user...');
                    await this.createAdminRole(user);
                } else {
                    console.log('❌ Not an admin user');
                    this.showError('Access denied. Admin privileges required.');
                    await window.signOut(window.auth);
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
            this.redirectToDashboard();
            
        } catch (error) {
            console.error('❌ Failed to create admin role:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        
        this.setLoginLoading(true);
        
        try {
            await window.signInWithEmailAndPassword(window.auth, email, password);
        } catch (error) {
            console.error('❌ Login failed:', error);
            
            // If user not found and it's the default admin, try to create it
            if (error.code === 'auth/user-not-found' && email === 'adminfaouzi@gmail.com') {
                console.log('🔧 Admin user not found, attempting to create...');
                try {
                    await this.createAdminUser(email, password);
                    return; // Don't show error, user creation will handle login
                } catch (createError) {
                    console.error('❌ Failed to create admin user:', createError);
                    this.showLoginError('Failed to create admin user. Please check Firebase configuration.');
                    this.setLoginLoading(false);
                    return;
                }
            }
            
            this.showLoginError(this.getErrorMessage(error.code));
            this.setLoginLoading(false);
        }
    }
    
    async createAdminUser(email, password) {
        try {
            console.log('🔧 Creating admin user...');
            
            // Create the user account
            const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Admin user created:', user.uid);
            
            // Create admin role document
            await window.setDoc(window.doc(window.db, 'admin_users', user.uid), {
                role: 'admin',
                email: email,
                createdAt: new Date().toISOString(),
                createdBy: 'system'
            });
            
            console.log('✅ Admin role created successfully');
            this.setLoginLoading(false);
            
            // Show success message
            this.showSuccessMessage('Admin user created successfully! You are now logged in.');
            
        } catch (error) {
            console.error('❌ Failed to create admin user:', error);
            this.setLoginLoading(false);
            
            let errorMessage = 'Failed to create admin user. ';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage += 'Email is already in use.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage += 'Password is too weak.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Invalid email address.';
            } else {
                errorMessage += 'Please check Firebase configuration.';
            }
            
            this.showLoginError(errorMessage);
            throw error;
        }
    }
    
    setLoginLoading(loading) {
        const loginButton = document.getElementById('loginButton');
        const loginButtonText = document.getElementById('loginButtonText');
        const loginSpinner = document.getElementById('loginSpinner');
        
        if (loginButton) loginButton.disabled = loading;
        if (loginButtonText) loginButtonText.style.display = loading ? 'none' : 'block';
        if (loginSpinner) loginSpinner.style.display = loading ? 'block' : 'none';
    }
    
    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }
    
    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No admin account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/weak-password':
                return 'Password is too weak.';
            case 'auth/email-already-in-use':
                return 'Email is already in use.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection.';
            case 'auth/operation-not-allowed':
                return 'Email/password authentication is not enabled.';
            default:
                return `Login failed: ${errorCode}. Please check your credentials.`;
        }
    }
    
    showLoginForm() {
        // Login form is already visible by default
        console.log('📝 Showing login form');
    }
    
    redirectToDashboard() {
        console.log('🔄 Redirecting to dashboard...');
        window.location.href = 'index.html';
    }
    
    showError(message) {
        alert(message); // You can replace this with a better error display
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
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the login manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.loginManager = new LoginManager();
});
