/* ===================================
   LOGIN FUNCTIONALITY
   =================================== */

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
    event.preventDefault();

    // Get form data
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validate inputs
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        // Call backend API
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Save auth token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            showMessage('Login successful! Redirecting...', 'success');

            // Redirect to inbox after 1 second
            setTimeout(() => {
                window.location.href = '/inbox.html';
            }, 1000);
        } else {
            showMessage(data.error || 'Invalid email or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

/* ===================================
   SIGNUP FUNCTIONALITY
   =================================== */

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
}

/**
 * Handle signup form submission
 * @param {Event} event - Form submit event
 */
async function handleSignup(event) {
    event.preventDefault();

    // Get form data
    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate inputs
    if (!fullname || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    // Check password match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    // Check password length
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        // Call backend API
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                full_name: fullname
            })
        });

        const data = await response.json();

        if (data.success) {
            // Save auth token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            showMessage('Account created successfully! Redirecting...', 'success');

            // Redirect to inbox after 1.5 seconds
            setTimeout(() => {
                window.location.href = '/inbox.html';
            }, 1500);
        } else {
            showMessage(data.error || 'Error creating account', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    }
}

/* ===================================
   MESSAGE DISPLAY
   =================================== */

/**
 * Show message to user
 * @param {string} message - Message to display
 * @param {string} type - Type of message ('success' or 'error')
 */
function showMessage(message, type) {
    // Remove existing message if any
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    `;
    
    // Set color based on type
    if (type === 'success') {
        messageDiv.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        messageDiv.style.color = '#fff';
    } else {
        messageDiv.style.background = 'linear-gradient(135deg, #ff6b6b, #ff5252)';
        messageDiv.style.color = '#fff';
    }
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 3000);
}

// Add animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);