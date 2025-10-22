// Enhanced Error Handling System for TrackShare
// Provides better user feedback and error recovery options

class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second base delay
        this.errorTypes = {
            NETWORK: 'network',
            API: 'api',
            AUTH: 'auth',
            VALIDATION: 'validation',
            UNKNOWN: 'unknown'
        };
    }

    // Main error handling method
    handleError(error, context = {}) {
        console.error('ErrorHandler:', error, context);
        
        this.errorCount++;
        
        const errorInfo = this.categorizeError(error);
        const userMessage = this.getUserFriendlyMessage(errorInfo, context);
        
        // Show error to user
        this.showErrorToUser(userMessage, errorInfo, context);
        
        // Log error for analytics
        this.logError(errorInfo, context);
        
        // Auto-retry for certain error types
        if (this.shouldRetry(errorInfo) && this.errorCount < this.maxRetries) {
            this.scheduleRetry(errorInfo, context);
        }
    }

    // Categorize error type
    categorizeError(error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { type: this.errorTypes.NETWORK, severity: 'high' };
        }
        
        if (error.status >= 400 && error.status < 500) {
            return { type: this.errorTypes.VALIDATION, severity: 'medium' };
        }
        
        if (error.status >= 500) {
            return { type: this.errorTypes.API, severity: 'high' };
        }
        
        if (error.message.includes('auth') || error.message.includes('token')) {
            return { type: this.errorTypes.AUTH, severity: 'high' };
        }
        
        return { type: this.errorTypes.UNKNOWN, severity: 'medium' };
    }

    // Get user-friendly error message
    getUserFriendlyMessage(errorInfo, context) {
        const messages = {
            [this.errorTypes.NETWORK]: {
                title: 'Connection Problem',
                message: 'Unable to connect to the server. Please check your internet connection.',
                action: 'Retry'
            },
            [this.errorTypes.API]: {
                title: 'Service Temporarily Unavailable',
                message: 'Our music service is experiencing issues. Please try again in a few moments.',
                action: 'Try Again'
            },
            [this.errorTypes.AUTH]: {
                title: 'Authentication Required',
                message: 'Please sign in to continue using TrackShare.',
                action: 'Sign In'
            },
            [this.errorTypes.VALIDATION]: {
                title: 'Invalid Request',
                message: 'There was a problem with your request. Please try again.',
                action: 'Retry'
            },
            [this.errorTypes.UNKNOWN]: {
                title: 'Something Went Wrong',
                message: 'An unexpected error occurred. Please try again.',
                action: 'Retry'
            }
        };

        return messages[errorInfo.type] || messages[this.errorTypes.UNKNOWN];
    }

    // Show error to user with enhanced UI
    showErrorToUser(userMessage, errorInfo, context) {
        const container = this.getErrorContainer(context);
        
        const errorHTML = `
            <div class="error-state enhanced" data-error-type="${errorInfo.type}">
                <div class="error-icon">
                    ${this.getErrorIcon(errorInfo.type)}
                </div>
                <h3 class="error-title">${userMessage.title}</h3>
                <p class="error-message">${userMessage.message}</p>
                
                <div class="error-actions">
                    <button class="btn btn-primary retry-btn" onclick="errorHandler.retryAction('${errorInfo.type}', ${JSON.stringify(context).replace(/"/g, '&quot;')})">
                        ${userMessage.action}
                    </button>
                    ${this.getAdditionalActions(errorInfo, context)}
                </div>
                
                ${this.getErrorDetails(errorInfo, context)}
            </div>
        `;
        
        container.innerHTML = errorHTML;
        
        // Add error state class to body for global styling
        document.body.classList.add('error-state-active');
        
        // Announce error to screen readers
        this.announceError(userMessage.title);
    }

    // Get appropriate error container
    getErrorContainer(context) {
        if (context.container) {
            return document.getElementById(context.container);
        }
        
        // Default containers based on context
        if (context.page === 'search') {
            return document.getElementById('searchResults') || document.getElementById('musicGrid');
        }
        
        if (context.page === 'trending') {
            return document.getElementById('musicGrid');
        }
        
        return document.getElementById('musicGrid') || document.body;
    }

    // Get error icon based on type
    getErrorIcon(errorType) {
        const icons = {
            [this.errorTypes.NETWORK]: '📡',
            [this.errorTypes.API]: '⚠️',
            [this.errorTypes.AUTH]: '🔐',
            [this.errorTypes.VALIDATION]: '❌',
            [this.errorTypes.UNKNOWN]: '❓'
        };
        
        return icons[errorType] || '❓';
    }

    // Get additional action buttons
    getAdditionalActions(errorInfo, context) {
        let actions = '';
        
        if (errorInfo.type === this.errorTypes.NETWORK) {
            actions += `
                <button class="btn btn-secondary" onclick="errorHandler.checkConnection()">
                    Check Connection
                </button>
            `;
        }
        
        if (errorInfo.type === this.errorTypes.AUTH) {
            actions += `
                <button class="btn btn-secondary" onclick="errorHandler.openAuthModal()">
                    Sign Up
                </button>
            `;
        }
        
        if (this.errorCount >= this.maxRetries) {
            actions += `
                <button class="btn btn-outline" onclick="errorHandler.reportIssue('${errorInfo.type}', ${JSON.stringify(context).replace(/"/g, '&quot;')})">
                    Report Issue
                </button>
            `;
        }
        
        return actions;
    }

    // Get error details for debugging
    getErrorDetails(errorInfo, context) {
        if (process.env.NODE_ENV === 'development') {
            return `
                <details class="error-details">
                    <summary>Debug Information</summary>
                    <pre>${JSON.stringify({ errorInfo, context }, null, 2)}</pre>
                </details>
            `;
        }
        
        return '';
    }

    // Retry action handler
    retryAction(errorType, context) {
        this.errorCount = 0; // Reset error count
        
        // Remove error state
        document.body.classList.remove('error-state-active');
        
        // Execute retry based on context
        if (context.page === 'search') {
            this.retrySearch(context);
        } else if (context.page === 'trending') {
            this.retryTrending(context);
        } else {
            this.retryGeneric(context);
        }
    }

    // Retry search
    retrySearch(context) {
        if (context.query) {
            performSearch(context.query, context.filters);
        } else {
            loadTrendingMusic(context.genre || 'all');
        }
    }

    // Retry trending
    retryTrending(context) {
        loadTrendingMusic(context.genre || 'all');
    }

    // Generic retry
    retryGeneric(context) {
        if (context.callback && typeof window[context.callback] === 'function') {
            window[context.callback]();
        } else {
            location.reload();
        }
    }

    // Check connection
    checkConnection() {
        const statusEl = document.querySelector('.online-status');
        if (statusEl) {
            statusEl.textContent = 'Checking connection...';
        }
        
        fetch('/api/health', { method: 'HEAD' })
            .then(() => {
                if (statusEl) {
                    statusEl.textContent = '🟢 Online';
                }
                this.showSuccess('Connection restored!');
            })
            .catch(() => {
                if (statusEl) {
                    statusEl.textContent = '🔴 Offline';
                }
                this.showError('Still offline. Please check your connection.');
            });
    }

    // Open auth modal
    openAuthModal() {
        const signInBtn = document.querySelector('[data-action="sign-in"]');
        if (signInBtn) {
            signInBtn.click();
        }
    }

    // Report issue
    reportIssue(errorType, context) {
        const issueData = {
            errorType,
            context,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
        // In a real implementation, this would send to an error reporting service
        console.log('Issue reported:', issueData);
        
        this.showSuccess('Issue reported. Thank you for your feedback!');
    }

    // Show success message
    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Show error message
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // Announce error to screen readers
    announceError(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }

    // Determine if error should be retried
    shouldRetry(errorInfo) {
        return errorInfo.type === this.errorTypes.NETWORK || 
               errorInfo.type === this.errorTypes.API;
    }

    // Schedule retry with exponential backoff
    scheduleRetry(errorInfo, context) {
        const delay = this.retryDelay * Math.pow(2, this.errorCount - 1);
        
        setTimeout(() => {
            this.retryAction(errorInfo.type, context);
        }, delay);
    }

    // Log error for analytics
    logError(errorInfo, context) {
        // In a real implementation, this would send to analytics service
        console.log('Error logged:', {
            type: errorInfo.type,
            severity: errorInfo.severity,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
    }
}

// Initialize global error handler
window.errorHandler = new ErrorHandler();

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
    window.errorHandler.handleError(event.error, {
        page: 'global',
        source: event.filename,
        line: event.lineno,
        column: event.colno
    });
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    window.errorHandler.handleError(event.reason, {
        page: 'global',
        type: 'promise_rejection'
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
