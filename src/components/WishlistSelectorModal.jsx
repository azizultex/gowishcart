import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Button } from './ui/button';
import GuestEmailModal from './GuestEmailModal';
import '../styles/WishlistSelectorModal.scss';

const WishlistSelectorModal = ({ isOpen, onClose, productId, variationId = 0, onSuccess }) => {
    const [wishlists, setWishlists] = useState([]);
    const [selectedWishlistId, setSelectedWishlistId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newWishlistName, setNewWishlistName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [guestEmail, setGuestEmail] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Get session ID from cookie
    const getSessionId = () => {
        if (window.gowishcartWishlist?.isLoggedIn) {
            return null;
        }
        
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'wishcart_session_id') {
                return value;
            }
        }

        if (window.gowishcartWishlist?.sessionId) {
            return window.gowishcartWishlist.sessionId;
        }

        return null;
    };

    // Check if user needs to provide email
    const checkEmailRequirement = async () => {
        // If user is logged in, no email needed
        if (window.gowishcartWishlist?.isLoggedIn) {
            return false;
        }

        // Check localStorage first
        const storedEmail = localStorage.getItem('wishcart_guest_email');
        if (storedEmail) {
            setGuestEmail(storedEmail);
            return false;
        }

        // Check if email exists in database via API
        try {
            const sessionId = getSessionId();
            if (!sessionId) {
                return true; // Need email if no session
            }

            const url = `${window.gowishcartWishlist.apiUrl}guest/check-email?session_id=${sessionId}`;
            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': window.gowishcartWishlist.nonce,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.has_email && data.email) {
                    setGuestEmail(data.email);
                    localStorage.setItem('wishcart_guest_email', data.email);
                    return false;
                }
            }
        } catch (err) {
            console.error('Error checking email:', err);
        }

        return true; // Need to collect email
    };

    // Load wishlists when modal opens
    useEffect(() => {
        if (isOpen) {
            const initModal = async () => {
                const needsEmail = await checkEmailRequirement();
                if (needsEmail) {
                    setShowEmailModal(true);
                } else {
                    loadWishlists();
                }
                setIsCreatingNew(false);
                setNewWishlistName('');
                setError(null);
            };
            initModal();
            } else {
                setShowEmailModal(false);
                setGuestEmail(null);
                setSuccessMessage(null);
            }
        }, [isOpen]);

    const loadWishlists = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const sessionId = getSessionId();
            const url = `${window.gowishcartWishlist.apiUrl}wishlists${sessionId ? `?session_id=${sessionId}` : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': window.gowishcartWishlist.nonce,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const wishlistsData = data.wishlists || [];
                setWishlists(wishlistsData);
                
                // Auto-select default wishlist
                const defaultWishlist = wishlistsData.find(w => w.is_default === 1 || w.is_default === '1');
                if (defaultWishlist) {
                    setSelectedWishlistId(defaultWishlist.id);
                } else if (wishlistsData.length > 0) {
                    setSelectedWishlistId(wishlistsData[0].id);
                }
            } else {
                setError('Failed to load wishlists');
            }
        } catch (err) {
            console.error('Error loading wishlists:', err);
            setError('Failed to load wishlists');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNewWishlist = async () => {
        if (!newWishlistName.trim()) {
            setError('Please enter a wishlist name');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const sessionId = getSessionId();
            const url = `${window.gowishcartWishlist.apiUrl}wishlists`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.gowishcartWishlist.nonce,
                },
                body: JSON.stringify({
                    name: newWishlistName.trim(),
                    is_default: false,
                    session_id: sessionId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.wishlist) {
                    // Add product to the new wishlist
                    await addToWishlist(data.wishlist.id);
                }
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to create wishlist');
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error('Error creating wishlist:', err);
            setError('Failed to create wishlist');
            setIsSubmitting(false);
        }
    };

    const addToWishlist = async (wishlistId) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const sessionId = getSessionId();
            const url = `${window.gowishcartWishlist.apiUrl}wishlist/add`;
            
            const requestBody = {
                product_id: productId,
                variation_id: variationId || 0,
                wishlist_id: wishlistId,
                session_id: sessionId,
            };

            // Include email if available and user is not logged in
            if (!window.gowishcartWishlist?.isLoggedIn && guestEmail) {
                requestBody.guest_email = guestEmail;
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.gowishcartWishlist.nonce,
                },
                body: JSON.stringify(requestBody),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Show success message briefly
                setSuccessMessage(data.message || 'Product added to wishlist!');
                
                // Call success callback and close modal after a brief delay
                setTimeout(() => {
                    if (onSuccess) {
                        onSuccess(data);
                    }
                    onClose();
                    setSuccessMessage(null);
                }, 800);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to add product to wishlist');
            }
        } catch (err) {
            console.error('Error adding to wishlist:', err);
            setError('Failed to add product to wishlist');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        if (e) {
            e.preventDefault();
        }
        if (isCreatingNew) {
            handleCreateNewWishlist();
        } else if (selectedWishlistId) {
            addToWishlist(selectedWishlistId);
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
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, isSubmitting, onClose]);

    const handleEmailSubmitted = (email) => {
        setGuestEmail(email);
        setShowEmailModal(false);
        loadWishlists();
    };

    const handleEmailModalClose = () => {
        // If user closes email modal without submitting, close the entire modal (don't allow addition)
        setShowEmailModal(false);
        onClose(); // Close the wishlist selector modal too
    };

    if (!isOpen) return null;

    // Show email modal first if needed
    if (showEmailModal) {
        return (
            <GuestEmailModal
                isOpen={showEmailModal}
                onClose={handleEmailModalClose}
                onEmailSubmitted={handleEmailSubmitted}
            />
        );
    }

    return (
        <div className="gowishcart-modal-overlay" onClick={onClose}>
            <div className="gowishcart-modal" onClick={(e) => e.stopPropagation()}>
                <div className="gowishcart-modal-header">
                    <h2>Add to Wishlist</h2>
                    <button 
                        className="gowishcart-modal-close" 
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="gowishcart-modal-body">
                    
                    {error && (
                        <div className="gowishcart-modal-error">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="gowishcart-modal-loading">
                            <div className="gowishcart-spinner"></div>
                            <p>Loading wishlists...</p>
                        </div>
                    ) : successMessage ? (
                        <div className="gowishcart-modal-loading">
                            <div className="gowishcart-success-checkmark">✓</div>
                            <p>{successMessage}</p>
                        </div>
                    ) : (
                        <>
                            {!isCreatingNew ? (
                                <>
                                    <div className="gowishcart-wishlists-list">
                                        {wishlists.map((wishlist) => (
                                            <div
                                                key={wishlist.id}
                                                className={`gowishcart-wishlist-item ${
                                                    selectedWishlistId === wishlist.id ? 'selected' : ''
                                                }`}
                                                onClick={() => setSelectedWishlistId(wishlist.id)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedWishlistId(wishlist.id);
                                                    }
                                                }}
                                                role="radio"
                                                aria-checked={selectedWishlistId === wishlist.id}
                                                tabIndex={0}
                                            >
                                                <div className="gowishcart-wishlist-radio">
                                                    {selectedWishlistId === wishlist.id && (
                                                        <Check size={16} />
                                                    )}
                                                </div>
                                                <div className="gowishcart-wishlist-info">
                                                    <div className="gowishcart-wishlist-name">
                                                        {wishlist.wishlist_name}
                                                        {(wishlist.is_default === 1 || wishlist.is_default === '1') && (
                                                            <span className="gowishcart-default-badge">Default</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        className="gowishcart-create-new-button"
                                        onClick={() => setIsCreatingNew(true)}
                                    >
                                        <Plus size={16} />
                                        Create New Wishlist
                                    </button>
                                </>
                            ) : (
                                <div className="gowishcart-create-new-form">
                                    <label htmlFor="new-wishlist-name">Wishlist Name</label>
                                    <input
                                        id="new-wishlist-name"
                                        type="text"
                                        value={newWishlistName}
                                        onChange={(e) => {
                                            setNewWishlistName(e.target.value);
                                            setError(null); // Clear error on input
                                        }}
                                        placeholder="e.g., My Birthday Wishlist"
                                        autoFocus
                                        disabled={isSubmitting}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && newWishlistName.trim()) {
                                                handleSubmit(e);
                                            }
                                        }}
                                    />
                                    <button
                                        className="gowishcart-back-button"
                                        onClick={() => {
                                            setIsCreatingNew(false);
                                            setNewWishlistName('');
                                            setError(null);
                                        }}
                                    >
                                        Back to Wishlists
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!successMessage && (
                    <div className="gowishcart-modal-footer">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                isSubmitting ||
                                (!selectedWishlistId && !isCreatingNew) ||
                                (isCreatingNew && !newWishlistName.trim())
                            }
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="gowishcart-button-spinner"></div>
                                    Adding...
                                </>
                            ) : isCreatingNew ? (
                                'Create & Add'
                            ) : (
                                'Add to Wishlist'
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistSelectorModal;

