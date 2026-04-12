import React, { useState, useEffect } from 'react';
import { X, Mail, Bell } from 'lucide-react';
import { Button } from './ui/button';
import '../styles/WishlistSelectorModal.scss';

const GuestEmailModal = ({ isOpen, onClose, onEmailSubmitted }) => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [focused, setFocused] = useState(false);

    // Validate email format
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate email
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        if (!validateEmail(email.trim())) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);

        try {
            // Get session ID from cookie
            const getSessionId = () => {
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'wishcart_session_id') {
                        return value;
                    }
                }
                if (window.wishcartWishlist?.sessionId) {
                    return window.wishcartWishlist.sessionId;
                }
                return null;
            };

            const sessionId = getSessionId();
            
            // Save email to guest user record
            const url = `${window.wishcartWishlist.apiUrl}guest/update-email`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
                body: JSON.stringify({
                    email: email.trim(),
                    session_id: sessionId,
                }),
            });

            if (response.ok) {
                // Store email in localStorage to avoid asking again in this session
                localStorage.setItem('wishcart_guest_email', email.trim());
                
                // Call success callback
                if (onEmailSubmitted) {
                    onEmailSubmitted(email.trim());
                }
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to save email address');
            }
        } catch (err) {
            console.error('Error saving email:', err);
            setError('Failed to save email address. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !isSubmitting) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    return (
        <div className="wishcart-modal-overlay" onClick={onClose}>
            <div className="wishcart-modal wishcart-email-modal" onClick={(e) => e.stopPropagation()}>
                <button 
                    className="wishcart-modal-close" 
                    onClick={onClose}
                    aria-label="Close"
                    disabled={isSubmitting}
                >
                    <X size={18} />
                </button>
                <div className="wishcart-modal-header">
                    <div className="wishcart-modal-header-content">
                        <div className="wishcart-modal-icon">
                            <Bell size={24} />
                        </div>
                        <h2>Get Notified About Your Wishlist</h2>
                    </div>
                </div>

                <div className="wishcart-modal-body">
                    <div className="wishcart-email-description">
                        Enter your email to receive notifications about price drops, back-in-stock alerts, and more for items in your wishlist.
                    </div>

                    {error && (
                        <div className="wishcart-modal-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="wishcart-email-form">
                        <div className="wishcart-email-input-wrapper">
                            <div className={`wishcart-input-container ${focused ? 'focused' : ''} ${error ? 'error' : ''}`}>
                                <Mail size={18} className="wishcart-input-icon" />
                                <input
                                    id="guest-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError(null);
                                    }}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                    placeholder="your.email@example.com"
                                    autoFocus
                                    required
                                    disabled={isSubmitting}
                                    className="wishcart-email-input"
                                />
                            </div>
                            <p className="wishcart-email-hint">
                                We'll use this to notify you about your wishlist items
                            </p>
                        </div>
                    </form>
                </div>

                <div className="wishcart-modal-footer">
                    <button
                        className="wishcart-button-secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                        type="button"
                    >
                        Skip
                    </button>
                    <button
                        className="wishcart-button-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !email.trim()}
                        type="button"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="wishcart-button-spinner"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            'Continue'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuestEmailModal;

