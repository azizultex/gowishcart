import React, { useState, useEffect, useMemo } from 'react';
import { Heart } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { cn } from '../lib/utils';
import WishlistSelectorModal from './WishlistSelectorModal';
import GuestEmailModal from './GuestEmailModal';
import * as LucideIcons from 'lucide-react';
import '../styles/VariantWishlistButtons.scss';

const VariantWishlistButton = ({ productId, variant, className, customStyles, isVisible = true }) => {
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
                    // Message logged by server
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
            // Message logged by server
        }
    };

    // Get customization settings
    const customization = window.wishcartWishlist?.buttonCustomization || {};
    const colors = customization.colors || {}; // Keep for backwards compatibility
    const general = customization.general || {};
    const productPage = customization.product_page || {};
    const productListing = customization.product_listing || {};
    const savedProductPage = customization.saved_product_page || {};
    const savedProductListing = customization.saved_product_listing || {};
    const iconConfig = customization.icon || {};
    const labels = customization.labels || {};
    
    // Get button style variation
    const buttonStyle = general.buttonStyle || 'button';
    
    // Detect if button is on product listing (shop page) vs product page
    const isProductListing = useMemo(() => {
        if (typeof document === 'undefined') return false;
        const container = document.querySelector(`[data-product-id="${productId}"]`);
        if (!container) return false;
        return container.closest('.wishcart-card-container') !== null || 
               container.closest('.fct-product-card, .fc-product-card') !== null ||
               container.classList.contains('wishcart-card-container');
    }, [productId]);

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
        // Use saved settings if in wishlist, otherwise use add settings
        let settings;
        if (isInWishlist) {
            settings = isProductListing ? savedProductListing : savedProductPage;
            // Fallback to add state settings if saved settings are not available
            if (!settings || Object.keys(settings).length === 0) {
                settings = isProductListing ? productListing : productPage;
            }
        } else {
            settings = isProductListing ? productListing : productPage;
        }
        const iconSize = settings.iconSize || general.fontSize || '1.125rem';
        
        if (currentIcon.type === 'custom' && currentIcon.customUrl) {
            return (
                <img
                    src={currentIcon.customUrl}
                    alt=""
                    className={cn("wishcart-wishlist-button__icon", isInWishlist && "wishcart-wishlist-button__icon--filled")}
                    style={{ width: iconSize, height: iconSize }}
                />
            );
        }

        const iconValue = currentIcon.value || 'Heart';
        const IconComponent = LucideIcons[iconValue] || Heart;
        
        return (
            <IconComponent 
                className={cn("wishcart-wishlist-button__icon", isInWishlist && "wishcart-wishlist-button__icon--filled")}
                style={{ width: iconSize, height: iconSize }}
            />
        );
    };

    const buildButtonStyles = () => {
        const baseStyles = customStyles || {};
        const dynamicStyles = {};

        // Use saved settings if in wishlist, otherwise use add settings
        // Use product_listing settings if on listing page, otherwise product_page settings
        let settings;
        if (isInWishlist) {
            // Use saved state settings
            settings = isProductListing ? savedProductListing : savedProductPage;
            // Fallback to add state settings if saved settings are not available
            if (!settings || Object.keys(settings).length === 0) {
                settings = isProductListing ? productListing : productPage;
            }
        } else {
            // Use add state settings
            settings = isProductListing ? productListing : productPage;
        }
        
        // Apply button style variations
        if (buttonStyle === 'text-icon-link' || buttonStyle === 'icon-only' || buttonStyle === 'text-only-link') {
            // Remove button styling for link-style variations
            dynamicStyles.background = 'transparent';
            dynamicStyles.backgroundColor = 'transparent';
            dynamicStyles.border = 'none';
            dynamicStyles.borderColor = 'transparent';
            dynamicStyles.padding = '0';
            dynamicStyles.boxShadow = 'none';
            dynamicStyles.width = 'auto';
            dynamicStyles.minHeight = 'auto';
        }
        
        // Apply general settings first (they can be overridden by specific settings)
        if (general.textColor && !settings.buttonTextColor) {
            dynamicStyles.color = general.textColor;
        }
        if (general.font && general.font !== 'default' && !settings.font) {
            dynamicStyles.fontFamily = general.font;
        }
        if (general.fontSize && !settings.fontSize) {
            dynamicStyles.fontSize = general.fontSize;
        }
        
        // Apply specific settings (product_page, product_listing, saved_product_page, or saved_product_listing)
        if (settings.backgroundColor) {
            dynamicStyles.backgroundColor = settings.backgroundColor;
        }
        if (settings.buttonTextColor) {
            dynamicStyles.color = settings.buttonTextColor;
        }
        if (settings.font && settings.font !== 'default') {
            dynamicStyles.fontFamily = settings.font;
        }
        if (settings.fontSize) {
            dynamicStyles.fontSize = settings.fontSize;
        }
        if (settings.borderRadius) {
            dynamicStyles.borderRadius = settings.borderRadius;
        }
        if (settings.iconSize) {
            dynamicStyles['--icon-size'] = settings.iconSize;
        }
        
        // Apply hover colors as CSS variables
        if (settings.backgroundHoverColor) {
            dynamicStyles['--wishlist-hover-bg'] = settings.backgroundHoverColor;
        }
        if (settings.buttonTextHoverColor) {
            dynamicStyles['--wishlist-hover-text'] = settings.buttonTextHoverColor;
        }
        
        // Fallback to old colors structure for backwards compatibility
        if (Object.keys(dynamicStyles).length === 0 || (!settings.backgroundColor && colors.background)) {
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
            if (colors.hoverBackground) {
                dynamicStyles['--wishlist-hover-bg'] = colors.hoverBackground;
            }
            if (colors.hoverText) {
                dynamicStyles['--wishlist-hover-text'] = colors.hoverText;
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
        }

        return { ...baseStyles, ...dynamicStyles };
    };

    if (isLoading) {
        return null;
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
                    !isVisible && "wishcart-variant-wishlist-button--hidden",
                    buttonStyle === 'text-only' && "wishcart-variant-wishlist-button--text-only",
                    buttonStyle === 'text-only-link' && "wishcart-variant-wishlist-button--text-only-link",
                    buttonStyle === 'text-icon-link' && "wishcart-variant-wishlist-button--text-icon-link",
                    buttonStyle === 'icon-only' && "wishcart-variant-wishlist-button--icon-only",
                    className
                )}
                style={buildButtonStyles()}
                aria-label={`${srLabel} - ${variantName}`}
                data-variant-id={variantId}
            >
                {/* Conditionally render icon based on buttonStyle */}
                {(buttonStyle !== 'text-only' && buttonStyle !== 'text-only-link') && (
                    isAdding ? (
                        <Heart className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading" />
                    ) : (
                        getIconComponent()
                    )
                )}
                {/* Conditionally render text based on buttonStyle */}
                {(buttonStyle !== 'icon-only') && (
                    <>
                        <span className="wishcart-wishlist-button__label">{buttonLabel}</span>
                        <span className="wishcart-variant-wishlist-button__variant-name">{variantName}</span>
                    </>
                )}
            </button>
        </>
    );
};

const VariantWishlistButtons = ({ productId, variants, className, customStyles, position = 'bottom' }) => {
    const [activeVariantId, setActiveVariantId] = useState(null);

    // Track active variant changes
    useEffect(() => {
        // Active variant tracking
    }, [activeVariantId, variants]);

    if (!variants || variants.length === 0) {
        return null;
    }

    // Detect the currently selected variation from FluentCart buttons
    useEffect(() => {
        let debounceTimer = null;
        let pollingInterval = null;
        let modalObserver = null;
        let modalOpenCheckInterval = null;
        let isModalOpen = false;
        
        // Function to check if modal is open and variations are loaded
        const checkModalAndVariations = () => {
            const modal = document.querySelector('.fc-product-modal, .fc-product-detail, [class*="product-modal"], [class*="quick-view"]');
            if (modal) {
                // Specifically check for fct-product-variants class (FluentCart's variation container)
                const fctVariants = modal.querySelector('.fct-product-variants');
                // Also check for variation elements with data-cart-id (FluentCart uses this)
                const variantElements = modal.querySelectorAll('.fct-product-variants [data-cart-id], .fct-product-variants [data-variant-id], .fct-product-variants [data-variation-id]');
                const variationsLoaded = !!fctVariants && variantElements.length > 0;
                return { modal, variationsLoaded, fctVariants };
            }
            return { modal: null, variationsLoaded: false, fctVariants: null };
        };
        
        // Function to wait for fct-product-variants to load in modal
        const waitForVariationsInModal = (modal, callback, maxWait = 5000) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                // Specifically wait for .fct-product-variants class
                const fctVariants = modal.querySelector('.fct-product-variants');
                if (fctVariants) {
                    // Also check that it has actual variation elements inside
                    const variantElements = fctVariants.querySelectorAll('[data-cart-id], [data-variant-id], [data-variation-id]');
                    if (variantElements.length > 0 || (Date.now() - startTime) > maxWait) {
                        clearInterval(checkInterval);
                        callback(variantElements.length > 0);
                    }
                } else if ((Date.now() - startTime) > maxWait) {
                    clearInterval(checkInterval);
                    callback(false);
                }
            }, 100);
        };
        
        // Function to trigger detection when modal is ready
        const triggerDetectionOnModalReady = () => {
            const { modal, variationsLoaded, fctVariants } = checkModalAndVariations();
            if (modal && !isModalOpen) {
                isModalOpen = true;
                // Wait a bit for DOM to settle, then wait for fct-product-variants
                setTimeout(() => {
                    waitForVariationsInModal(modal, (loaded) => {
                        if (loaded) {
                            // fct-product-variants is loaded with variation elements, trigger detection
                            // Give it a small delay to ensure all attributes are set
                            setTimeout(() => {
                                updateActiveVariant();
                            }, 100);
                        }
                    });
                }, 200);
            } else if (modal && isModalOpen && fctVariants) {
                // Modal is already open, but variations might have just loaded
                // Re-trigger detection
                setTimeout(() => {
                    updateActiveVariant();
                }, 100);
            } else if (!modal && isModalOpen) {
                isModalOpen = false;
            }
        };
        
        // Comprehensive function to detect selected variation using multiple strategies
        const detectSelectedVariation = () => {
            // Strategy 1: PRIORITY - Look for .selected class in fct-product-variants container first
            // First, check within .fct-product-variants container (FluentCart specific)
            const fctVariantsContainer = document.querySelector('.fct-product-variants');
            if (fctVariantsContainer) {
                // PRIORITY 1: Check for .selected class first (highest priority)
                const selectedByClass = fctVariantsContainer.querySelector(
                    '.selected[data-cart-id], .selected[data-variant-id], .selected[data-variation-id]'
                );
                
                if (selectedByClass) {
                    const cartId = selectedByClass.getAttribute('data-cart-id');
                    const variantId = selectedByClass.getAttribute('data-variant-id') || 
                                     selectedByClass.getAttribute('data-variation-id');
                    
                    // If we have cartId, try to find matching variant in our variants array
                    if (cartId) {
                        const parsedCartId = parseInt(cartId, 10);
                        // Try to match cartId with variant IDs in our variants array
                        const matchedVariant = variants.find(v => {
                            const vId = v.id || v.variation_id || v.ID;
                            return vId === parsedCartId;
                        });
                        if (matchedVariant) {
                            const result = matchedVariant.id || matchedVariant.variation_id || matchedVariant.ID;
                            return result;
                        }
                        // If no match, use cartId as fallback (might be the variation ID)
                        if (!isNaN(parsedCartId) && parsedCartId > 0) {
                            return parsedCartId;
                        }
                    }
                    
                    // Use variantId if available
                    if (variantId) {
                        const parsedId = parseInt(variantId, 10);
                        if (!isNaN(parsedId) && parsedId > 0) {
                            return parsedId;
                        }
                    }
                }
                
                // PRIORITY 2: Fallback to aria-checked="true" if no .selected class found
                const selectedByAria = fctVariantsContainer.querySelector(
                    '[aria-checked="true"][data-cart-id], [aria-checked="true"][data-variant-id], [aria-checked="true"][data-variation-id]'
                );
                
                if (selectedByAria) {
                    const cartId = selectedByAria.getAttribute('data-cart-id');
                    const variantId = selectedByAria.getAttribute('data-variant-id') || 
                                     selectedByAria.getAttribute('data-variation-id');
                    
                    // If we have cartId, try to find matching variant in our variants array
                    if (cartId) {
                        const parsedCartId = parseInt(cartId, 10);
                        // Try to match cartId with variant IDs in our variants array
                        const matchedVariant = variants.find(v => {
                            const vId = v.id || v.variation_id || v.ID;
                            return vId === parsedCartId;
                        });
                        if (matchedVariant) {
                            const result = matchedVariant.id || matchedVariant.variation_id || matchedVariant.ID;
                            return result;
                        }
                        // If no match, use cartId as fallback (might be the variation ID)
                        if (!isNaN(parsedCartId) && parsedCartId > 0) {
                            return parsedCartId;
                        }
                    }
                    
                    // Use variantId if available
                    if (variantId) {
                        const parsedId = parseInt(variantId, 10);
                        if (!isNaN(parsedId) && parsedId > 0) {
                            return parsedId;
                        }
                    }
                }
            }
            
            // Strategy 1b: Look for selected/active variation buttons with various class names (fallback)
            // Prioritize .selected class over aria attributes
            const selectors = [
                // Priority: .selected class first
                '.selected[data-variant-id]',
                '.selected[data-variation-id]',
                '[data-variant-id].selected',
                '[data-variation-id].selected',
                // Then active classes
                '.active[data-variant-id]',
                '.active[data-variation-id]',
                '[data-variant-id].active',
                '[data-variation-id].active',
                '[data-variant-id].is-selected',
                '[data-variation-id].is-selected',
                // Finally aria attributes as fallback
                '[data-variant-id][aria-selected="true"]',
                '[data-variation-id][aria-selected="true"]',
                '[data-variant-id][aria-checked="true"]',
                '[data-variation-id][aria-checked="true"]',
            ];
            
            for (const selector of selectors) {
                const selectedButton = document.querySelector(selector);
                if (selectedButton) {
                    const variantId = selectedButton.getAttribute('data-variant-id') || 
                                     selectedButton.getAttribute('data-variation-id');
                    if (variantId) {
                        const parsedId = parseInt(variantId, 10);
                        if (!isNaN(parsedId) && parsedId > 0) {
                            return parsedId;
                        }
                    }
                }
            }
            
            // Strategy 2: Check for selected variation in fct-product-variants using data-cart-id
            // FluentCart uses data-cart-id to identify variations, and we need to map it
            if (fctVariantsContainer) {
                // PRIORITY: Look for .selected class first, then fallback to aria-checked
                const checkedVariant = fctVariantsContainer.querySelector('.selected[data-cart-id], [aria-checked="true"][data-cart-id]');
                if (checkedVariant) {
                    const cartId = checkedVariant.getAttribute('data-cart-id');
                    // Try to match cartId with our variants array
                    if (cartId) {
                        const parsedCartId = parseInt(cartId, 10);
                        const matchedVariant = variants.find(v => {
                            const vId = v.id || v.variation_id || v.ID;
                            return vId === parsedCartId;
                        });
                        if (matchedVariant) {
                            return matchedVariant.id || matchedVariant.variation_id || matchedVariant.ID;
                        }
                        // If cartId doesn't match, it might be the variation ID itself
                        if (!isNaN(parsedCartId) && parsedCartId > 0) {
                            return parsedCartId;
                        }
                    }
                }
            }
            
            // Strategy 3: Check for hidden form inputs with variation_id
            const form = document.querySelector('.fc-product-modal form, .fc-product-detail form, form[data-product-id]');
            if (form) {
                const variationInput = form.querySelector('input[name="variation_id"], input[name="variant_id"], input[type="hidden"][name*="variation"], input[type="hidden"][name*="variant"]');
                if (variationInput && variationInput.value) {
                    const parsedId = parseInt(variationInput.value, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        return parsedId;
                    }
                }
                
                // Check for radio buttons or selects
                const variationSelect = form.querySelector('select[name*="variation"], select[name*="variant"]');
                if (variationSelect && variationSelect.value) {
                    const parsedId = parseInt(variationSelect.value, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        return parsedId;
                    }
                }
                
                const checkedRadio = form.querySelector('input[type="radio"][name*="variation"]:checked, input[type="radio"][name*="variant"]:checked');
                if (checkedRadio && checkedRadio.value) {
                    const parsedId = parseInt(checkedRadio.value, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        return parsedId;
                    }
                }
            }
            
            // Strategy 4: Look for elements with border/active styling that might indicate selection
            const modal = document.querySelector('.fc-product-modal, .fc-product-detail');
            if (modal) {
                // Look for buttons with specific active classes or styles
                const allVariantButtons = modal.querySelectorAll('[data-variant-id], [data-variation-id]');
                for (const btn of allVariantButtons) {
                    // PRIORITY: Check for .selected class first, then other indicators
                    if (btn.classList.contains('selected')) {
                        // .selected class has highest priority
                        const variantId = btn.getAttribute('data-variant-id') || 
                                         btn.getAttribute('data-variation-id');
                        if (variantId) {
                            const parsedId = parseInt(variantId, 10);
                            if (!isNaN(parsedId) && parsedId > 0) {
                                return parsedId;
                            }
                        }
                    } else if (btn.classList.contains('active') || 
                        btn.classList.contains('is-selected') ||
                        btn.getAttribute('aria-selected') === 'true' ||
                        btn.getAttribute('aria-checked') === 'true') {
                        const variantId = btn.getAttribute('data-variant-id') || 
                                         btn.getAttribute('data-variation-id');
                        if (variantId) {
                            const parsedId = parseInt(variantId, 10);
                            if (!isNaN(parsedId) && parsedId > 0) {
                                return parsedId;
                            }
                        }
                    }
                    
                    // Check for border/outline styles that might indicate selection
                    const computedStyle = window.getComputedStyle(btn);
                    if (computedStyle.borderWidth && computedStyle.borderWidth !== '0px' && 
                        computedStyle.borderColor && computedStyle.borderColor !== 'rgba(0, 0, 0, 0)') {
                        // Check if this looks like a selected button (has prominent border)
                        const variantId = btn.getAttribute('data-variant-id') || 
                                         btn.getAttribute('data-variation-id');
                        if (variantId) {
                            const parsedId = parseInt(variantId, 10);
                            if (!isNaN(parsedId) && parsedId > 0) {
                                return parsedId;
                            }
                        }
                    }
                }
            }
            
            // Strategy 5: Check FluentCart's internal state if accessible
            if (window.FluentCart && window.FluentCart.selectedVariation) {
                const parsedId = parseInt(window.FluentCart.selectedVariation, 10);
                if (!isNaN(parsedId) && parsedId > 0) {
                    return parsedId;
                }
            }
            
            // Strategy 6: Default to first variant if nothing found, but only if no selection has been made yet
            // If user has made a selection recently, prioritize that
            if (userSelectedVariantId !== null) {
                const timeSinceSelection = Date.now() - lastUserSelectionTime;
                if (timeSinceSelection < USER_SELECTION_COOLDOWN) {
                    return userSelectedVariantId;
                }
            }
            
            // If currentActiveId is set, maintain it instead of defaulting to first variant
            if (currentActiveId !== null) {
                return currentActiveId;
            }
            
            // Only default to first variant if no selection has been made yet
            if (variants.length > 0) {
                const firstVariantId = variants[0].id || variants[0].variation_id || variants[0].ID;
                return firstVariantId;
            }
            
            return null;
        };

        // Use a ref to track current value for comparison
        let currentActiveId = null;
        
        // Track user-initiated selections to prevent automatic detection from overriding
        let userSelectedVariantId = null;
        let lastUserSelectionTime = 0;
        const USER_SELECTION_COOLDOWN = 500; // 500ms cooldown period
        
        // Helper function to check if user selection should be respected (within cooldown period)
        const shouldRespectUserSelection = () => {
            const timeSinceUserSelection = Date.now() - lastUserSelectionTime;
            return userSelectedVariantId !== null && timeSinceUserSelection < USER_SELECTION_COOLDOWN;
        };
        
        // Debounced update function
        const updateActiveVariant = () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                // Check if user made a selection recently
                const timeSinceUserSelection = Date.now() - lastUserSelectionTime;
                if (userSelectedVariantId !== null && timeSinceUserSelection < USER_SELECTION_COOLDOWN) {
                    // Don't override user selection during cooldown
                    return;
                }
                
                const detectedId = detectSelectedVariation();
                if (detectedId !== null && detectedId !== currentActiveId) {
                    // Only update if detected ID matches user selection or cooldown has expired
                    if (userSelectedVariantId === null || detectedId === userSelectedVariantId || timeSinceUserSelection >= USER_SELECTION_COOLDOWN) {
                        currentActiveId = detectedId;
                        setActiveVariantId(detectedId);
                    }
                }
            }, 30); // Reduced debounce for faster updates
        };
        
        // Immediate update function (no debounce) for click events
        const updateActiveVariantImmediate = () => {
            // Check if user made a selection recently
            const timeSinceUserSelection = Date.now() - lastUserSelectionTime;
            if (userSelectedVariantId !== null && timeSinceUserSelection < USER_SELECTION_COOLDOWN) {
                // Don't override user selection during cooldown
                return;
            }
            
            const detectedId = detectSelectedVariation();
            if (detectedId !== null) {
                // Only update if detected ID matches user selection or cooldown has expired
                if (userSelectedVariantId === null || detectedId === userSelectedVariantId || timeSinceUserSelection >= USER_SELECTION_COOLDOWN) {
                    if (detectedId !== currentActiveId) {
                        currentActiveId = detectedId;
                        setActiveVariantId(detectedId);
                    }
                }
            }
        };

        // Check if we're in a modal context
        const isInModalContext = () => {
            const button = document.querySelector(`[data-product-id="${productId}"]`);
            if (!button) return false;
            
            const modal = button.closest('.fc-product-modal, .fc-product-detail, [class*="product-modal"], [class*="quick-view"]');
            return !!modal;
        };
        
        // Initial detection with retry mechanism for dynamically loaded content
        let retryCount = 0;
        const maxRetries = isInModalContext() ? 25 : 15; // More retries for modals
        const retryDelay = isInModalContext() ? 300 : 200; // Longer delay for modals
        
        const tryDetect = () => {
            // Check if we're in a modal and if variations are loaded
            const inModal = isInModalContext();
            if (inModal) {
                const { variationsLoaded } = checkModalAndVariations();
                if (!variationsLoaded && retryCount < maxRetries) {
                    // Variations not loaded yet, keep waiting
                    retryCount++;
                    setTimeout(tryDetect, retryDelay);
                    return;
                }
            }
            
            const detected = detectSelectedVariation();
            
            if (detected !== null) {
                currentActiveId = detected;
                setActiveVariantId(detected);
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(tryDetect, retryDelay);
            } else {
                // After max retries, default to first variant
                if (variants.length > 0) {
                    const firstVariantId = variants[0].id || variants[0].variation_id || variants[0].ID;
                    currentActiveId = firstVariantId;
                    setActiveVariantId(firstVariantId);
                }
            }
        };
        
        // Wait longer for modals, shorter for regular pages
        const initialDelay = isInModalContext() ? 300 : 100;
        setTimeout(tryDetect, initialDelay);

        // Listen for "View Options" button clicks to detect modal opening
        const handleViewOptionsClick = (event) => {
            const target = event.target;
            const button = target.closest('button, a, [role="button"]');
            
            // Check if this is a "View Options" button
            if (button && (
                button.textContent?.toLowerCase().includes('view options') ||
                button.textContent?.toLowerCase().includes('view option') ||
                button.getAttribute('aria-label')?.toLowerCase().includes('view options') ||
                button.classList.contains('view-options') ||
                button.classList.contains('fc-view-options')
            )) {
                // Modal is about to open, wait a bit then check
                setTimeout(() => {
                    triggerDetectionOnModalReady();
                }, 300);
            }
        };

        // Listen for modal open events
        const handleModalOpen = (event) => {
            setTimeout(() => {
                triggerDetectionOnModalReady();
            }, 300);
        };

        // Watch for modal elements being added to DOM
        modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if this is a modal or contains a modal
                            if (node.matches && (
                                node.matches('.fc-product-modal, .fc-product-detail, [class*="product-modal"], [class*="quick-view"]') ||
                                node.querySelector('.fc-product-modal, .fc-product-detail, [class*="product-modal"], [class*="quick-view"]')
                            )) {
                                // Modal just appeared
                                setTimeout(() => {
                                    triggerDetectionOnModalReady();
                                }, 200);
                            }
                        }
                    });
                }
            });
        });

        // Observe document body for modal additions
        modalObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also check periodically for modal opening (fallback)
        modalOpenCheckInterval = setInterval(() => {
            const { modal } = checkModalAndVariations();
            if (modal && !isModalOpen) {
                triggerDetectionOnModalReady();
            } else if (!modal && isModalOpen) {
                isModalOpen = false;
            }
        }, 500);

        // Helper function to map data-cart-id to variation ID
        const mapCartIdToVariantId = (cartId) => {
            if (!cartId) {
                return null;
            }
            const parsedCartId = parseInt(cartId, 10);
            if (isNaN(parsedCartId) || parsedCartId <= 0) {
                return null;
            }
            
            // Try to find matching variant in our variants array
            const matchedVariant = variants.find(v => {
                const vId = v.id || v.variation_id || v.ID;
                return vId === parsedCartId;
            });
            
            if (matchedVariant) {
                const result = matchedVariant.id || matchedVariant.variation_id || matchedVariant.ID;
                return result;
            }
            
            // If no match found, data-cart-id might be the variation ID itself
            return parsedCartId;
        };

        // Set up comprehensive click event listeners
        const handleVariationClick = (event) => {
            // First, check if click is on .fct-product-variants element with data-cart-id (FluentCart specific)
            const fctVariantsContainer = document.querySelector('.fct-product-variants');
            if (fctVariantsContainer) {
                const clickedElement = event.target.closest('.fct-product-variants [data-cart-id]');
                if (clickedElement) {
                    const cartId = clickedElement.getAttribute('data-cart-id');
                    if (cartId) {
                        // Wait a bit for .selected class to be added by FluentCart
                        setTimeout(() => {
                            // PRIORITY: Check for .selected class first
                            const selectedElement = fctVariantsContainer.querySelector('.selected[data-cart-id="' + cartId + '"]');
                            if (selectedElement) {
                                const variantId = mapCartIdToVariantId(cartId);
                                if (variantId) {
                                    // Track user selection
                                    userSelectedVariantId = variantId;
                                    lastUserSelectionTime = Date.now();
                                    // Update immediately
                                    currentActiveId = variantId;
                                    setActiveVariantId(variantId);
                                }
                            } else {
                                // Fallback: use cartId directly if .selected class not found yet
                                const variantId = mapCartIdToVariantId(cartId);
                                if (variantId) {
                                    userSelectedVariantId = variantId;
                                    lastUserSelectionTime = Date.now();
                                    currentActiveId = variantId;
                                    setActiveVariantId(variantId);
                                }
                            }
                            // Also trigger immediate re-detection to ensure accuracy
                            updateActiveVariantImmediate();
                        }, 10); // Small delay to allow DOM to update
                        return; // Early return, we found it
                    }
                }
            }
            
            // Fallback: Check for clicks on any element inside .fct-product-variants (might be clicking on text/image inside button)
            const fctVariants = document.querySelector('.fct-product-variants');
            if (fctVariants && fctVariants.contains(event.target)) {
                // Click is somewhere inside .fct-product-variants, find the closest variation element
                const variationElement = event.target.closest('[data-cart-id], [data-variant-id], [data-variation-id]');
                if (variationElement) {
                    const cartId = variationElement.getAttribute('data-cart-id');
                    const variantId = variationElement.getAttribute('data-variant-id') || 
                                     variationElement.getAttribute('data-variation-id');
                    
                    if (cartId) {
                        const mappedId = mapCartIdToVariantId(cartId);
                        if (mappedId) {
                            // Track user selection
                            userSelectedVariantId = mappedId;
                            lastUserSelectionTime = Date.now();
                            currentActiveId = mappedId;
                            setActiveVariantId(mappedId);
                            setTimeout(() => {
                                updateActiveVariantImmediate();
                            }, 50);
                            return;
                        }
                    }
                    
                    if (variantId) {
                        const parsedId = parseInt(variantId, 10);
                        if (!isNaN(parsedId) && parsedId > 0) {
                            // Track user selection
                            userSelectedVariantId = parsedId;
                            lastUserSelectionTime = Date.now();
                            currentActiveId = parsedId;
                            setActiveVariantId(parsedId);
                            setTimeout(() => {
                                updateActiveVariantImmediate();
                            }, 50);
                            return;
                        }
                    }
                }
            }
            
            // Fallback: Check for other variation button patterns
            const button = event.target.closest('[data-variant-id], [data-variation-id], [class*="variant"], [class*="stripe"]');
            
            if (button) {
                const variantId = button.getAttribute('data-variant-id') || 
                                 button.getAttribute('data-variation-id') ||
                                 button.getAttribute('data-id') ||
                                 button.getAttribute('value');
                
                if (variantId) {
                    const parsedId = parseInt(variantId, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        // Update immediately
                        // Track user selection
                        userSelectedVariantId = parsedId;
                        lastUserSelectionTime = Date.now();
                        currentActiveId = parsedId;
                        setActiveVariantId(parsedId);
                        // Also trigger immediate re-detection
                        setTimeout(() => {
                            updateActiveVariantImmediate();
                        }, 50);
                    }
                } else {
                    // If no direct ID, try to find it from nearby elements
                    setTimeout(() => {
                        updateActiveVariantImmediate();
                    }, 50);
                }
            } else {
                // Click might be on a variation option, try to detect
                setTimeout(() => {
                    updateActiveVariantImmediate();
                }, 50);
            }
        };

        // Handle input changes (for selects, radio buttons)
        const handleInputChange = (event) => {
            const target = event.target;
            if (target.name && (target.name.includes('variation') || target.name.includes('variant'))) {
                if (target.value) {
                    const parsedId = parseInt(target.value, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        currentActiveId = parsedId;
                        setActiveVariantId(parsedId);
                    }
                }
            } else {
                updateActiveVariant();
            }
        };

        // Listen to FluentCart custom events if they exist
        const handleFluentCartEvent = (event) => {
            if (event.detail && event.detail.variation_id) {
                const parsedId = parseInt(event.detail.variation_id, 10);
                if (!isNaN(parsedId) && parsedId > 0) {
                    currentActiveId = parsedId;
                    setActiveVariantId(parsedId);
                }
            } else {
                updateActiveVariant();
            }
        };

        // Specific handler for .fct-product-variants clicks
        const handleFctVariantsClick = (event) => {
            const fctVariants = document.querySelector('.fct-product-variants');
            if (!fctVariants) {
                return;
            }
            
            const clickedElement = event.target.closest('.fct-product-variants [data-cart-id]');
            if (clickedElement) {
                const cartId = clickedElement.getAttribute('data-cart-id');
                if (cartId) {
                    // Wait a bit for .selected class to be added by FluentCart
                    setTimeout(() => {
                        // PRIORITY: Check for .selected class first
                        const selectedElement = fctVariants.querySelector('.selected[data-cart-id="' + cartId + '"]');
                        if (selectedElement) {
                            const variantId = mapCartIdToVariantId(cartId);
                            if (variantId) {
                                // Track user selection
                                userSelectedVariantId = variantId;
                                lastUserSelectionTime = Date.now();
                                // Update immediately
                                currentActiveId = variantId;
                                setActiveVariantId(variantId);
                            }
                        } else {
                            // Fallback: use cartId directly if .selected class not found yet
                            const variantId = mapCartIdToVariantId(cartId);
                            if (variantId) {
                                userSelectedVariantId = variantId;
                                lastUserSelectionTime = Date.now();
                                currentActiveId = variantId;
                                setActiveVariantId(variantId);
                            }
                        }
                        // Also trigger a re-detection to ensure accuracy
                        updateActiveVariantImmediate();
                    }, 10); // Small delay to allow DOM to update
                } else {
                    // No cartId found, trigger detection
                    setTimeout(() => {
                        updateActiveVariantImmediate();
                    }, 50);
                }
            }
        };

        // Listen for focus events on variation elements (some UIs use keyboard navigation)
        const handleFctVariantsFocus = (event) => {
            const fctVariants = document.querySelector('.fct-product-variants');
            if (!fctVariants) return;
            
            const focusedElement = event.target.closest('.fct-product-variants [data-cart-id]');
            if (focusedElement) {
                // Try to get ID immediately
                const cartId = focusedElement.getAttribute('data-cart-id');
                if (cartId) {
                    const variantId = mapCartIdToVariantId(cartId);
                    if (variantId) {
                        currentActiveId = variantId;
                        setActiveVariantId(variantId);
                    }
                }
                // Small delay to allow aria-checked to update, then verify
                setTimeout(() => {
                    updateActiveVariantImmediate();
                }, 50);
            }
        };

        // Add all event listeners
        document.addEventListener('click', handleVariationClick, true);
        document.addEventListener('click', handleViewOptionsClick, true);
        document.addEventListener('change', handleInputChange, true);
        document.addEventListener('fluentcart:variation_changed', handleFluentCartEvent);
        document.addEventListener('fluentcart:variant_changed', handleFluentCartEvent);
        document.addEventListener('woocommerce_variation_select_change', handleFluentCartEvent);
        window.addEventListener('variation_change', handleFluentCartEvent);
        
        // Add specific listeners for .fct-product-variants
        document.addEventListener('click', handleFctVariantsClick, true);
        document.addEventListener('focus', handleFctVariantsFocus, true);
        document.addEventListener('focusin', handleFctVariantsFocus, true);
        
        // Listen for modal-specific events
        document.addEventListener('modal:open', handleModalOpen);
        document.addEventListener('fc:modal:open', handleModalOpen);
        document.addEventListener('fluentcart:modal:open', handleModalOpen);
        window.addEventListener('modalOpen', handleModalOpen);
        
        // Watch for body class changes that might indicate modal is open
        const bodyObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const body = document.body;
                    if (body.classList.contains('modal-open') || 
                        body.classList.contains('fc-modal-open') ||
                        body.classList.contains('product-modal-open')) {
                        triggerDetectionOnModalReady();
                    }
                }
            });
        });
        bodyObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Set up comprehensive MutationObserver
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    const attrName = mutation.attributeName;
                    
                    // Specifically watch for changes in .fct-product-variants elements
                    const isFctVariant = target.closest('.fct-product-variants') && 
                                       (target.hasAttribute('data-cart-id') || 
                                        target.hasAttribute('data-variant-id') || 
                                        target.hasAttribute('data-variation-id'));
                    
                    if (isFctVariant) {
                        // PRIORITY: Check for .selected class changes first (highest priority)
                        if (attrName === 'class') {
                            if (target.classList.contains('selected')) {
                                // .selected class has highest priority - update immediately
                                shouldUpdate = true;
                                // Try to get the variant ID immediately
                                const cartId = target.getAttribute('data-cart-id');
                                if (cartId) {
                                    const variantId = mapCartIdToVariantId(cartId);
                                    if (variantId) {
                                        currentActiveId = variantId;
                                        setActiveVariantId(variantId);
                                    }
                                }
                            } else if (target.classList.contains('active') || 
                                target.classList.contains('is-selected')) {
                                shouldUpdate = true;
                            }
                        }
                        
                        // Fallback: Check for aria-checked changes (lower priority)
                        if (attrName === 'aria-checked') {
                            if (target.getAttribute('aria-checked') === 'true') {
                                // Only update if no .selected class is present
                                if (!target.classList.contains('selected')) {
                                    shouldUpdate = true;
                                }
                            }
                        }
                        
                        // Check for data-cart-id changes
                        if (attrName === 'data-cart-id') {
                            shouldUpdate = true;
                        }
                    }
                    
                    // Check for class changes on variation elements
                    if (attrName === 'class' && (target.hasAttribute('data-variant-id') || target.hasAttribute('data-variation-id'))) {
                        // PRIORITY: .selected class first
                        if (target.classList.contains('selected')) {
                            shouldUpdate = true;
                            // Try to get variant ID immediately
                            const variantId = target.getAttribute('data-variant-id') || 
                                             target.getAttribute('data-variation-id');
                            if (variantId) {
                                const parsedId = parseInt(variantId, 10);
                                if (!isNaN(parsedId) && parsedId > 0) {
                                    currentActiveId = parsedId;
                                    setActiveVariantId(parsedId);
                                }
                            }
                        } else if (target.classList.contains('active') || 
                            target.classList.contains('is-selected')) {
                            shouldUpdate = true;
                        }
                    }
                    
                    // Check for aria attributes (fallback, lower priority)
                    if (attrName === 'aria-selected' || attrName === 'aria-checked') {
                        // Only update if no .selected class is present
                        if (target.getAttribute(attrName) === 'true' && !target.classList.contains('selected')) {
                            shouldUpdate = true;
                        }
                    }
                    
                    // Check for data attributes
                    if (attrName && attrName.startsWith('data-')) {
                        shouldUpdate = true;
                    }
                } else if (mutation.type === 'childList') {
                    // New elements added, might be variation buttons
                    // Check if added nodes are in .fct-product-variants
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.matches && (
                                node.matches('.fct-product-variants [data-cart-id]') ||
                                node.closest('.fct-product-variants')
                            )) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldUpdate) {
                updateActiveVariant();
            }
        });

        // Find and observe all relevant containers
        const containers = [
            document.querySelector('.fc-product-modal'),
            document.querySelector('.fc-product-detail'),
            document.querySelector(`[data-product-id="${productId}"]`)?.closest('form'),
            document.querySelector('form[data-product-id]'),
        ].filter(Boolean);

        containers.forEach((container) => {
            observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    'class',
                    'aria-selected',
                    'aria-checked',
                    'data-variant-id',
                    'data-variation-id',
                    'data-cart-id',
                    'data-selected',
                    'data-active',
                    'value',
                ]
            });
        });

        // Specifically observe .fct-product-variants container for FluentCart
        const fctVariantsObserver = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    const attrName = mutation.attributeName;
                    
                    // PRIORITY 1: Watch for .selected class changes (highest priority)
                    if (attrName === 'class') {
                        if (target.classList.contains('selected')) {
                            shouldUpdate = true;
                            // If this element is now selected, try to get its ID immediately
                            const cartId = target.getAttribute('data-cart-id');
                            if (cartId) {
                                const variantId = mapCartIdToVariantId(cartId);
                                if (variantId) {
                                    // Check if user made a selection recently
                                    const timeSinceUserSelection = Date.now() - lastUserSelectionTime;
                                    if (userSelectedVariantId !== null && timeSinceUserSelection < USER_SELECTION_COOLDOWN && variantId !== userSelectedVariantId) {
                                        return;
                                    }
                                    currentActiveId = variantId;
                                    setActiveVariantId(variantId);
                                }
                            }
                        } else if (target.classList.contains('active')) {
                            shouldUpdate = true;
                        }
                    }
                    
                    // PRIORITY 2: Fallback - Watch for aria-checked changes (lower priority)
                    if (attrName === 'aria-checked') {
                        const isChecked = target.getAttribute('aria-checked') === 'true';
                        // Only process if .selected class is not present (to avoid conflicts)
                        if (isChecked && !target.classList.contains('selected')) {
                            shouldUpdate = true;
                            // If this element is now checked, try to get its ID immediately
                            const cartId = target.getAttribute('data-cart-id');
                            if (cartId) {
                                const variantId = mapCartIdToVariantId(cartId);
                                if (variantId) {
                                    // Check if user made a selection recently
                                    const timeSinceUserSelection = Date.now() - lastUserSelectionTime;
                                    if (userSelectedVariantId !== null && timeSinceUserSelection < USER_SELECTION_COOLDOWN && variantId !== userSelectedVariantId) {
                                        return;
                                    }
                                    currentActiveId = variantId;
                                    setActiveVariantId(variantId);
                                }
                            }
                        }
                    }
                    
                    // Watch for data-cart-id changes
                    if (attrName === 'data-cart-id') {
                        shouldUpdate = true;
                    }
                } else if (mutation.type === 'childList') {
                    // New variation elements added
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                // Use immediate update for faster response
                setTimeout(() => {
                    updateActiveVariantImmediate();
                }, 10);
            }
        });

        // Observe .fct-product-variants container specifically
        const observeFctVariants = () => {
            const fctVariants = document.querySelector('.fct-product-variants');
            if (fctVariants) {
                fctVariantsObserver.observe(fctVariants, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: [
                        'class',
                        'aria-checked',
                        'aria-selected',
                        'data-cart-id',
                        'data-variant-id',
                        'data-variation-id',
                        'selected',
                    ]
                });
                
                // Also observe all variation elements inside
                const variantElements = fctVariants.querySelectorAll('[data-cart-id], [data-variant-id], [data-variation-id]');
                variantElements.forEach((element) => {
                    fctVariantsObserver.observe(element, {
                        attributes: true,
                        attributeFilter: [
                            'class',
                            'aria-checked',
                            'aria-selected',
                            'data-cart-id',
                            'selected',
                        ]
                    });
                });
            }
        };

        // Initial observation
        observeFctVariants();

        // Re-observe when modal opens (fct-product-variants might be added later)
        const reobserveFctVariants = setInterval(() => {
            const fctVariants = document.querySelector('.fct-product-variants');
            if (fctVariants && !fctVariants.dataset.observed) {
                fctVariants.dataset.observed = 'true';
                observeFctVariants();
            }
        }, 500);

        // Also observe all existing variation buttons (fallback)
        const variantButtons = document.querySelectorAll('[data-variant-id], [data-variation-id]');
        variantButtons.forEach((button) => {
            observer.observe(button, {
                attributes: true,
                attributeFilter: [
                    'class',
                    'aria-selected',
                    'aria-checked',
                    'data-variant-id',
                    'data-variation-id',
                    'data-cart-id',
                    'data-selected',
                    'data-active',
                ]
            });
        });

        // Fallback: Polling as last resort (with proper cleanup)
        // More aggressive polling for .fct-product-variants
        pollingInterval = setInterval(() => {
            // Skip polling if user just made a selection
            if (shouldRespectUserSelection()) {
                return;
            }
            
            const detected = detectSelectedVariation();
            if (detected !== null && detected !== currentActiveId) {
                // Only update if detected ID matches user selection or cooldown expired
                if (userSelectedVariantId === null || detected === userSelectedVariantId || !shouldRespectUserSelection()) {
                    currentActiveId = detected;
                    setActiveVariantId(detected);
                }
            }
        }, 500); // Check every 500ms for faster updates

        // Cleanup
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
            if (modalOpenCheckInterval) {
                clearInterval(modalOpenCheckInterval);
            }
            if (reobserveFctVariants) {
                clearInterval(reobserveFctVariants);
            }
            if (modalObserver) {
                modalObserver.disconnect();
            }
            if (bodyObserver) {
                bodyObserver.disconnect();
            }
            if (fctVariantsObserver) {
                fctVariantsObserver.disconnect();
            }
            document.removeEventListener('click', handleVariationClick, true);
            document.removeEventListener('click', handleViewOptionsClick, true);
            document.removeEventListener('click', handleFctVariantsClick, true);
            document.removeEventListener('focus', handleFctVariantsFocus, true);
            document.removeEventListener('focusin', handleFctVariantsFocus, true);
            document.removeEventListener('change', handleInputChange, true);
            document.removeEventListener('fluentcart:variation_changed', handleFluentCartEvent);
            document.removeEventListener('fluentcart:variant_changed', handleFluentCartEvent);
            document.removeEventListener('woocommerce_variation_select_change', handleFluentCartEvent);
            window.removeEventListener('variation_change', handleFluentCartEvent);
            document.removeEventListener('modal:open', handleModalOpen);
            document.removeEventListener('fc:modal:open', handleModalOpen);
            document.removeEventListener('fluentcart:modal:open', handleModalOpen);
            window.removeEventListener('modalOpen', handleModalOpen);
            observer.disconnect();
        };
    }, [variants, productId]);

    return (
        <div className={cn("wishcart-variant-wishlist-buttons", className)} data-position={position}>
            {variants.map((variant) => {
                const variantId = variant.id || variant.variation_id || variant.ID;
                // Ensure both IDs are numbers for proper comparison
                const activeIdNum = activeVariantId !== null ? Number(activeVariantId) : null;
                const variantIdNum = Number(variantId);
                // Button is visible if activeVariantId is null (initial state) or matches this variant's ID
                const isVisible = activeIdNum === null || activeIdNum === variantIdNum;
                
                return (
                    <VariantWishlistButton
                        key={variantId}
                        productId={productId}
                        variant={variant}
                        className={className}
                        customStyles={customStyles}
                        isVisible={isVisible}
                    />
                );
            })}
        </div>
    );
};

export default VariantWishlistButtons;
