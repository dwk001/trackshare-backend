// TrackShare Security Patch
// Temporary XSS protection until proper refactor

(function() {
    'use strict';
    
    // Override innerHTML to warn about usage and add basic sanitization
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    
    Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value) {
            console.warn('innerHTML usage detected - potential XSS risk!', new Error().stack);
            
            // Basic sanitization - remove script tags and dangerous attributes
            const cleaned = value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/vbscript:/gi, '');
                
            originalInnerHTML.set.call(this, cleaned);
        }
    });
    
    // Add Content Security Policy meta tag
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;";
    document.head.appendChild(csp);
    
    // Safe DOM manipulation utilities
    window.SafeDOM = {
        createElement: function(tagName, className, textContent) {
            const element = document.createElement(tagName);
            if (className) element.className = className;
            if (textContent) element.textContent = textContent;
            return element;
        },
        
        appendChildren: function(parent, children) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    parent.appendChild(document.createTextNode(child));
                } else {
                    parent.appendChild(child);
                }
            });
        },
        
        setTextContent: function(element, text) {
            element.textContent = text;
        },
        
        sanitizeHTML: function(html) {
            const div = document.createElement('div');
            div.textContent = html;
            return div.innerHTML;
        }
    };
    
    console.log('✓ Security patch applied - innerHTML usage will be logged and sanitized');
})();
