import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { cn } from '../lib/utils';
import WishlistSelectorModal from './WishlistSelectorModal';
import GuestEmailModal from './GuestEmailModal';
import * as LucideIcons from 'lucide-react';
import '../styles/VariantWishlistButtons.scss';

const VariantWishlistButton = ({ productId, variant, className, customStyles }) => {
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [guestHasEmail, setGuestHasEmail] = useState(null);
    const [pendingAddAction, setPendingAddAction] = useState(null);

    const variantId = variant.id || variant.variation_id || variant.ID || 0;

    // Get session ID from cookie or create one
    const getSessionId = () => {
        if (window.wishcartWishlist?.isLoggedIn) {
            return null;
        }
        
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

        const sessionId = 'wc_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiryDays = 30;
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
        document.cookie = `wishcart_session_id=${sessionId};expires=${expiryDate.toUTCString()};path=/;SameSite=Lax`;
        if (window.wishcartWishlist) {
            window.wishcartWishlist.sessionId = sessionId;
        }

        return sessionId;
    };

    // Check if guest has email via API
    const checkGuestEmail = async () => {
        if (window.wishcartWishlist?.isLoggedIn) {
            return true;
        }

        try {
            const sessionId = getSessionId();
            const url = `${window.wishcartWishlist.apiUrl}guest/check-email?session_id=${sessionId}`;
            
            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const hasEmail = data.has_email || false;
                setGuestHasEmail(hasEmail);
                return hasEmail;
            }
        } catch (error) {
            console.error('Error checking guest email:', error);
        }
        
        setGuestHasEmail(false);
        return false;
    };

    // Check if variant is in wishlist
    useEffect(() => {
        const checkWishlist = async () => {
            if (!productId || !window.wishcartWishlist) {
                setIsLoading(false);
                return;
            }

            try {
                const sessionId = getSessionId();
                
                // Build query parameters properly
                const params = new URLSearchParams();
                if (sessionId) {
                    params.append('session_id', sessionId);
                }
                if (variantId) {
                    params.append('variation_id', variantId.toString());
                }
                
                const queryString = params.toString();
                const url = `${window.wishcartWishlist.apiUrl}wishlist/check/${productId}${queryString ? `?${queryString}` : ''}`;
                
                const response = await fetch(url, {
                    headers: {
                        'X-WP-Nonce': window.wishcartWishlist.nonce,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsInWishlist(data.in_wishlist || false);
                }
            } catch (error) {
                console.error('Error checking wishlist:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkWishlist();
    }, [productId, variantId]);

    // Add product directly to default wishlist
    const addToDefaultWishlist = async (skipEmailCheck = false) => {
        if (!skipEmailCheck && !window.wishcartWishlist?.isLoggedIn) {
            const hasEmail = await checkGuestEmail();
            if (!hasEmail) {
                setPendingAddAction('default');
                setIsEmailModalOpen(true);
                return;
            }
        }

        setIsAdding(true);
        try {
            const sessionId = getSessionId();
            const url = `${window.wishcartWishlist.apiUrl}wishlist/add`;
            
            // Debug logging for session ID consistency
            console.log('[WishCart] Adding item to wishlist:', {
                productId,
                variationId: variantId || 0,
                sessionId: sessionId ? 'present' : 'none',
                isLoggedIn: window.wishcartWishlist?.isLoggedIn || false
            });
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
                body: JSON.stringify({
                    product_id: productId,
                    variation_id: variantId || 0,
                    session_id: sessionId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setIsInWishlist(true);
                
                // Debug logging
                console.log('[WishCart] Item added to wishlist:', {
                    productId,
                    variationId: variantId,
                    sessionId,
                    wishlistId: data.wishlist?.id || 'default',
                    wishlistName: data.wishlist?.name || 'default',
                    response: data
                });
                
                // Dispatch custom event to notify wishlist page to refresh
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('wishcart:item-added', {
                        detail: {
                            productId,
                            variationId: variantId,
                            wishlistId: data.wishlist?.id || null
                        }
                    }));
                }
                
                if (data && data.message) {
                    console.log(data.message);
                }
            } else {
                const error = await response.json();
                console.error('Error adding to wishlist:', error);
            }
        } catch (error) {
            console.error('Error adding to wishlist:', error);
        } finally {
            setIsAdding(false);
        }
    };

    // Toggle wishlist
    const toggleWishlist = async () => {
        if (isAdding || !productId || !window.wishcartWishlist) {
            return;
        }

        if (isInWishlist) {
            setIsAdding(true);
            try {
                const sessionId = getSessionId();
                const url = `${window.wishcartWishlist.apiUrl}wishlist/remove`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.wishcartWishlist.nonce,
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        variation_id: variantId,
                        session_id: sessionId,
                    }),
                });

                if (response.ok) {
                    setIsInWishlist(false);
                    
                    // Debug logging
                    console.log('[WishCart] Item removed from wishlist:', {
                        productId,
                        variationId: variantId,
                        sessionId
                    });
                    
                    // Dispatch custom event to notify wishlist page to refresh
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('wishcart:item-removed', {
                            detail: {
                                productId,
                                variationId: variantId
                            }
                        }));
                    }
                } else {
                    const error = await response.json();
                    console.error('Error removing from wishlist:', error);
                }
            } catch (error) {
                console.error('Error removing from wishlist:', error);
            } finally {
                setIsAdding(false);
            }
        } else {
            if (!window.wishcartWishlist?.isLoggedIn) {
                const hasEmail = await checkGuestEmail();
                if (!hasEmail) {
                    setPendingAddAction('toggle');
                    setIsEmailModalOpen(true);
                    return;
                }
            }

            const enableMultipleWishlists = window.wishcartWishlist?.enableMultipleWishlists || false;
            
            if (enableMultipleWishlists) {
                setIsModalOpen(true);
            } else {
                await addToDefaultWishlist(true);
            }
        }
    };

    // Handle email modal submission
    const handleEmailSubmitted = async (email) => {
        setGuestHasEmail(true);
        
        if (pendingAddAction === 'default') {
            await addToDefaultWishlist(true);
        } else if (pendingAddAction === 'toggle') {
            const enableMultipleWishlists = window.wishcartWishlist?.enableMultipleWishlists || false;
            
            if (enableMultipleWishlists) {
                setIsModalOpen(true);
            } else {
                await addToDefaultWishlist(true);
            }
        }
        
        setPendingAddAction(null);
    };

    const handleEmailModalClose = () => {
        setIsEmailModalOpen(false);
        setPendingAddAction(null);
    };

    const handleModalSuccess = (data) => {
        setIsInWishlist(true);
        
        // Debug logging
        console.log('[WishCart] Item added to wishlist via modal:', {
            productId,
            variationId: variantId,
            wishlistId: data.wishlist?.id || null,
            wishlistName: data.wishlist?.name || null,
            response: data
        });
        
        // Dispatch custom event to notify wishlist page to refresh
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('wishcart:item-added', {
                detail: {
                    productId,
                    variationId: variantId,
                    wishlistId: data.wishlist?.id || null
                }
            }));
        }
        
        if (data && data.message) {
            console.log(data.message);
        }
    };

    // Get customization settings
    const customization = window.wishcartWishlist?.buttonCustomization || {};
    const colors = customization.colors || {};
    const iconConfig = customization.icon || {};
    const labels = customization.labels || {};

    let addToWishlistIcon, savedWishlistIcon;
    
    if (iconConfig.addToWishlist) {
        addToWishlistIcon = iconConfig.addToWishlist;
        savedWishlistIcon = iconConfig.savedWishlist || iconConfig.addToWishlist;
    } else if (iconConfig.type || iconConfig.value || iconConfig.customUrl) {
        const iconValue = iconConfig.value ? 
            iconConfig.value.charAt(0).toUpperCase() + iconConfig.value.slice(1) : 
            'Heart';
        addToWishlistIcon = {
            type: iconConfig.type || 'predefined',
            value: iconValue,
            customUrl: iconConfig.customUrl || ''
        };
        savedWishlistIcon = {
            type: iconConfig.type || 'predefined',
            value: iconValue,
            customUrl: iconConfig.customUrl || ''
        };
    } else {
        addToWishlistIcon = { type: 'predefined', value: 'Heart', customUrl: '' };
        savedWishlistIcon = { type: 'predefined', value: 'Heart', customUrl: '' };
    }

    const defaultAddLabel = __('Add to Wishlist', 'wishcart');
    const defaultSavedLabel = __('Saved to Wishlist', 'wishcart');
    const buttonLabel = isInWishlist 
        ? (labels.saved || defaultSavedLabel)
        : (labels.add || defaultAddLabel);
    const srLabel = isInWishlist ? __('Remove from wishlist', 'wishcart') : __('Add to wishlist', 'wishcart');

    const getIconComponent = () => {
        const currentIcon = isInWishlist ? savedWishlistIcon : addToWishlistIcon;
        
        if (currentIcon.type === 'custom' && currentIcon.customUrl) {
            return (
                <img
                    src={currentIcon.customUrl}
                    alt=""
                    className={cn("wishcart-wishlist-button__icon", isInWishlist && "wishcart-wishlist-button__icon--filled")}
                    style={{ width: '1.125rem', height: '1.125rem' }}
                />
            );
        }

        const iconValue = currentIcon.value || 'Heart';
        const IconComponent = LucideIcons[iconValue] || Heart;
        
        return (
            <IconComponent className={cn("wishcart-wishlist-button__icon", isInWishlist && "wishcart-wishlist-button__icon--filled")} />
        );
    };

    const buildButtonStyles = () => {
        const baseStyles = customStyles || {};
        const dynamicStyles = {};

        if (colors.background) {
            dynamicStyles['--wishlist-bg'] = colors.background;
        }
        if (colors.text) {
            dynamicStyles['--wishlist-text'] = colors.text;
        }
        if (colors.border) {
            dynamicStyles['--wishlist-border'] = colors.border;
        }
        if (colors.activeBackground) {
            dynamicStyles['--wishlist-active-bg'] = colors.activeBackground;
        }
        if (colors.activeText) {
            dynamicStyles['--wishlist-active-text'] = colors.activeText;
        }
        if (colors.activeBorder) {
            dynamicStyles['--wishlist-active-border'] = colors.activeBorder;
        }

        if (!isInWishlist) {
            if (colors.background) dynamicStyles.backgroundColor = colors.background;
            if (colors.text) dynamicStyles.color = colors.text;
            if (colors.border) dynamicStyles.borderColor = colors.border;
        } else {
            if (colors.activeBackground) dynamicStyles.backgroundColor = colors.activeBackground;
            if (colors.activeText) dynamicStyles.color = colors.activeText;
            if (colors.activeBorder) dynamicStyles.borderColor = colors.activeBorder;
        }

        return { ...baseStyles, ...dynamicStyles };
    };

    if (isLoading) {
        return (
            <div className={cn("wishcart-variant-wishlist-button-loading", className)} style={buildButtonStyles()}>
                <Heart className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading" />
            </div>
        );
    }

    const variantName = variant.name || variant.title || `Variant ${variantId}`;

    return (
        <>
            <GuestEmailModal
                isOpen={isEmailModalOpen}
                onClose={handleEmailModalClose}
                onEmailSubmitted={handleEmailSubmitted}
            />
            <WishlistSelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                productId={productId}
                variationId={variantId}
                onSuccess={handleModalSuccess}
            />
            <button
                type="button"
                onClick={toggleWishlist}
                disabled={isAdding}
                className={cn(
                    "wishcart-variant-wishlist-button",
                    isInWishlist && "wishcart-variant-wishlist-button--active",
                    className
                )}
                style={buildButtonStyles()}
                aria-label={`${srLabel} - ${variantName}`}
            >
                {isAdding ? (
                    <Heart className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading" />
                ) : (
                    getIconComponent()
                )}
                <span className="wishcart-wishlist-button__label">{buttonLabel}</span>
                <span className="wishcart-variant-wishlist-button__variant-name">{variantName}</span>
            </button>
        </>
    );
};

const VariantWishlistButtons = ({ productId, variants, className, customStyles, position = 'bottom' }) => {
    if (!variants || variants.length === 0) {
        return null;
    }

    return (
        <div className={cn("wishcart-variant-wishlist-buttons", className)} data-position={position}>
            {variants.map((variant) => {
                const variantId = variant.id || variant.variation_id || variant.ID;
                return (
                    <VariantWishlistButton
                        key={variantId}
                        productId={productId}
                        variant={variant}
                        className={className}
                        customStyles={customStyles}
                    />
                );
            })}
        </div>
    );
};

export default VariantWishlistButtons;
