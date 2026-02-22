import React, { useState, useEffect, useMemo } from 'react';
import { Heart } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { cn } from '../lib/utils';
import GuestEmailModal from './GuestEmailModal';
import * as LucideIcons from 'lucide-react';
import '../styles/VariantWishlistButtons.scss';

const VariantWishlistButton = ({ productId, variant, className, customStyles, isVisible = true }) => {
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [guestHasEmail, setGuestHasEmail] = useState(null);
    const [pendingAddAction, setPendingAddAction] = useState(null);

    const variantId = variant.id || variant.variation_id || variant.ID || 0;

    // Get session ID from cookie or create one
    const getSessionId = () => {
        if (window.gowishcartWishlist?.isLoggedIn) {
            return null;
        }
        
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'gowishcart_session_id') {
                return value;
            }
        }

        if (window.gowishcartWishlist?.sessionId) {
            return window.gowishcartWishlist.sessionId;
        }

        const sessionId = 'wc_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiryDays = 30;
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
        document.cookie = `gowishcart_session_id=${sessionId};expires=${expiryDate.toUTCString()};path=/;SameSite=Lax`;
        if (window.gowishcartWishlist) {
            window.gowishcartWishlist.sessionId = sessionId;
        }

        return sessionId;
    };

    // Check if guest has email via API
    const checkGuestEmail = async () => {
        if (window.gowishcartWishlist?.isLoggedIn) {
            return true;
        }

        try {
            const sessionId = getSessionId();
            const url = `${window.gowishcartWishlist.apiUrl}guest/check-email?session_id=${sessionId}`;
            
            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': window.gowishcartWishlist.nonce,
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
            if (!productId || !window.gowishcartWishlist) {
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
                const url = `${window.gowishcartWishlist.apiUrl}wishlist/check/${productId}${queryString ? `?${queryString}` : ''}`;
                
                const response = await fetch(url, {
                    headers: {
                        'X-WP-Nonce': window.gowishcartWishlist.nonce,
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

    // Listen for wishlist item added/removed events to sync state across components
    useEffect(() => {
        const handleItemAdded = (event) => {
            const { productId: eventProductId, variationId: eventVariationId } = event.detail || {};
            
            // Normalize variation IDs (handle undefined/null as 0)
            const eventVarId = eventVariationId ?? 0;
            const currentVarId = variantId || 0;
            
            // Only update if this event is for the same product and variant
            if (eventProductId === productId && eventVarId === currentVarId) {
                setIsInWishlist(true);
            }
        };

        const handleItemRemoved = (event) => {
            const { productId: eventProductId, variationId: eventVariationId } = event.detail || {};
            
            // Normalize variation IDs (handle undefined/null as 0)
            const eventVarId = eventVariationId ?? 0;
            const currentVarId = variantId || 0;
            
            // Only update if this event is for the same product and variant
            if (eventProductId === productId && eventVarId === currentVarId) {
                setIsInWishlist(false);
            }
        };

        window.addEventListener('gowishcart:item-added', handleItemAdded);
        window.addEventListener('gowishcart:item-removed', handleItemRemoved);

        return () => {
            window.removeEventListener('gowishcart:item-added', handleItemAdded);
            window.removeEventListener('gowishcart:item-removed', handleItemRemoved);
        };
    }, [productId, variantId]);

    // Add product directly to default wishlist
    const addToDefaultWishlist = async (skipEmailCheck = false) => {
        if (!skipEmailCheck && !window.gowishcartWishlist?.isLoggedIn) {
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
            const url = `${window.gowishcartWishlist.apiUrl}wishlist/add`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.gowishcartWishlist.nonce,
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
                    window.dispatchEvent(new CustomEvent('gowishcart:item-added', {
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
        if (isAdding || !productId || !window.gowishcartWishlist) {
            return;
        }

        if (isInWishlist) {
            setIsAdding(true);
            try {
                const sessionId = getSessionId();
                const url = `${window.gowishcartWishlist.apiUrl}wishlist/remove`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.gowishcartWishlist.nonce,
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
                        window.dispatchEvent(new CustomEvent('gowishcart:item-removed', {
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
            if (!window.gowishcartWishlist?.isLoggedIn) {
                const hasEmail = await checkGuestEmail();
                if (!hasEmail) {
                    setPendingAddAction('toggle');
                    setIsEmailModalOpen(true);
                    return;
                }
            }

            const enableMultipleWishlists = window.gowishcartWishlist?.enableMultipleWishlists || false;
            
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
        
        // Always add to default wishlist (multiple wishlists is a pro feature)
        if (pendingAddAction === 'default' || pendingAddAction === 'toggle') {
            await addToDefaultWishlist(true);
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
            window.dispatchEvent(new CustomEvent('gowishcart:item-added', {
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
    const customization = window.gowishcartWishlist?.buttonCustomization || {};
    const colors = customization.colors || {}; // Keep for backwards compatibility
    const productPage = customization.product_page || {};
    const productListing = customization.product_listing || {};
    const savedProductPage = customization.saved_product_page || {};
    const savedProductListing = customization.saved_product_listing || {};
    const iconConfig = customization.icon || {};
    const labels = customization.labels || {};
    
    const isGradientValue = (value) => {
        if (!value || typeof value !== 'string') return false;
        return value.toLowerCase().includes('gradient(');
    };

    const applyBackgroundToStyles = (styles, background) => {
        if (!background) return;
        if (isGradientValue(background)) {
            styles.background = background;
        } else {
            styles.backgroundColor = background;
        }
    };

    // Generate a simple hash from a string for unique class names
    const generateHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    };

    // Generate CSS rules as a string instead of inline styles
    const generateButtonCSS = (className, settings, isActive, buttonStyleVar, customStylesObj, fallbackColors) => {
        const cssRules = [];
        const baseSelector = `.${className}`;
        
        // Start with base styles
        cssRules.push(`${baseSelector} {`);
        
        // Apply button style variations
        if (buttonStyleVar === 'text-icon-link' || buttonStyleVar === 'icon-only' || buttonStyleVar === 'text-only-link') {
            cssRules.push('  background: transparent !important;');
            cssRules.push('  background-color: transparent !important;');
            cssRules.push('  border: none !important;');
            cssRules.push('  border-color: transparent !important;');
            cssRules.push('  padding: 0 !important;');
            cssRules.push('  box-shadow: none !important;');
            cssRules.push('  width: auto !important;');
            cssRules.push('  min-height: auto !important;');
        }
        
        // Check if we should use fallback colors
        const useFallback = !settings || Object.keys(settings).length === 0 || (!settings.backgroundColor && fallbackColors?.background);
        
        if (useFallback && fallbackColors) {
            // Apply fallback colors structure
            if (fallbackColors.background) {
                cssRules.push(`  --wishlist-bg: ${fallbackColors.background} !important;`);
            }
            if (fallbackColors.text) {
                cssRules.push(`  --wishlist-text: ${fallbackColors.text} !important;`);
            }
            if (fallbackColors.border) {
                cssRules.push(`  --wishlist-border: ${fallbackColors.border} !important;`);
            }
            if (fallbackColors.activeBackground) {
                cssRules.push(`  --wishlist-active-bg: ${fallbackColors.activeBackground} !important;`);
            }
            if (fallbackColors.activeText) {
                cssRules.push(`  --wishlist-active-text: ${fallbackColors.activeText} !important;`);
            }
            if (fallbackColors.activeBorder) {
                cssRules.push(`  --wishlist-active-border: ${fallbackColors.activeBorder} !important;`);
            }
            if (fallbackColors.hoverBackground) {
                cssRules.push(`  --wishlist-hover-bg: ${fallbackColors.hoverBackground} !important;`);
            }
            if (fallbackColors.hoverText) {
                cssRules.push(`  --wishlist-hover-text: ${fallbackColors.hoverText} !important;`);
            }

            if (!isActive) {
                if (fallbackColors.background) {
                    if (isGradientValue(fallbackColors.background)) {
                        cssRules.push(`  background: ${fallbackColors.background} !important;`);
                    } else {
                        cssRules.push(`  background-color: ${fallbackColors.background} !important;`);
                    }
                }
                if (fallbackColors.text) {
                    cssRules.push(`  color: ${fallbackColors.text} !important;`);
                }
                if (fallbackColors.border) {
                    cssRules.push(`  border-color: ${fallbackColors.border} !important;`);
                }
            } else {
                if (fallbackColors.activeBackground) {
                    if (isGradientValue(fallbackColors.activeBackground)) {
                        cssRules.push(`  background: ${fallbackColors.activeBackground} !important;`);
                    } else {
                        cssRules.push(`  background-color: ${fallbackColors.activeBackground} !important;`);
                    }
                }
                if (fallbackColors.activeText) {
                    cssRules.push(`  color: ${fallbackColors.activeText} !important;`);
                }
                if (fallbackColors.activeBorder) {
                    cssRules.push(`  border-color: ${fallbackColors.activeBorder} !important;`);
                }
            }
        } else if (settings) {
            // Apply specific settings
            if (settings.backgroundColor) {
                if (isGradientValue(settings.backgroundColor)) {
                    cssRules.push(`  background: ${settings.backgroundColor} !important;`);
                } else {
                    cssRules.push(`  background-color: ${settings.backgroundColor} !important;`);
                }
            }
            if (settings.buttonTextColor) {
                cssRules.push(`  color: ${settings.buttonTextColor} !important;`);
            }
            if (settings.font && settings.font !== 'default') {
                cssRules.push(`  font-family: ${settings.font} !important;`);
            }
            if (settings.fontSize) {
                cssRules.push(`  font-size: ${settings.fontSize} !important;`);
            }
            if (settings.borderRadius) {
                cssRules.push(`  border-radius: ${settings.borderRadius} !important;`);
            }
            if (settings.iconSize) {
                cssRules.push(`  --icon-size: ${settings.iconSize} !important;`);
            }
            
            // Apply hover colors as CSS variables
            if (settings.backgroundHoverColor) {
                cssRules.push(`  --wishlist-hover-bg: ${settings.backgroundHoverColor} !important;`);
            }
            if (settings.buttonTextHoverColor) {
                cssRules.push(`  --wishlist-hover-text: ${settings.buttonTextHoverColor} !important;`);
            }
        }
        
        // Apply custom styles if provided
        if (customStylesObj) {
            Object.entries(customStylesObj).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    cssRules.push(`  ${cssKey}: ${value} !important;`);
                }
            });
        }
        
        cssRules.push('}');
        
        // Icon size handling - use iconSize from settings if available
        const iconSize = (settings && settings.iconSize) ? settings.iconSize : '1.125rem';
        cssRules.push(`${baseSelector} .gowishcart-wishlist-button__icon {`);
        cssRules.push(`  width: ${iconSize} !important;`);
        cssRules.push(`  height: ${iconSize} !important;`);
        cssRules.push('}');
        
        return cssRules.join('\n');
    };
    
    // Get button style variation from customization settings
    const buttonStyle = customization.buttonStyle || 'button';
    
    // Detect if button is on product listing (shop page) vs product page
    const isProductListing = useMemo(() => {
        if (typeof document === 'undefined') return false;
        const container = document.querySelector(`[data-product-id="${productId}"]`);
        if (!container) return false;
        return container.closest('.gowishcart-card-container') !== null || 
               container.closest('.fct-product-card, .fc-product-card') !== null ||
               container.classList.contains('gowishcart-card-container');
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

    const defaultAddLabel = __('Add to Wishlist', 'gowishcart-wishlist-for-fluentcart');
    const defaultSavedLabel = __('Saved to Wishlist', 'gowishcart-wishlist-for-fluentcart');
    const buttonLabel = isInWishlist 
        ? (labels.saved || defaultSavedLabel)
        : (labels.add || defaultAddLabel);
    const srLabel = isInWishlist ? __('Remove from wishlist', 'gowishcart-wishlist-for-fluentcart') : __('Add to wishlist', 'gowishcart-wishlist-for-fluentcart');

    const getIconComponent = () => {
        const currentIcon = isInWishlist ? savedWishlistIcon : addToWishlistIcon;
        
        if (currentIcon.type === 'custom' && currentIcon.customUrl) {
            return (
                <img
                    src={currentIcon.customUrl}
                    alt=""
                    className={cn("gowishcart-wishlist-button__icon", isInWishlist && "gowishcart-wishlist-button__icon--filled")}
                />
            );
        }

        const iconValue = currentIcon.value || 'Heart';
        const IconComponent = LucideIcons[iconValue] || Heart;
        
        return (
            <IconComponent 
                className={cn("gowishcart-wishlist-button__icon", isInWishlist && "gowishcart-wishlist-button__icon--filled")}
            />
        );
    };

    // Get settings for current button state
    const getCurrentSettings = () => {
        if (isInWishlist) {
            return savedProductPage && Object.keys(savedProductPage).length > 0 ? savedProductPage : productPage;
        } else {
            return productPage;
        }
    };

    const currentSettings = getCurrentSettings();
    
    // Generate unique class name based on settings and button state
    const settingsHash = generateHash(JSON.stringify({
        settings: currentSettings,
        isInWishlist,
        buttonStyle,
        variantId
    }));
    const dynamicButtonClass = `gowishcart-variant-wishlist-button--dynamic-${settingsHash}`;

    // Inject CSS styles via style tag
    useEffect(() => {
        const styleId = 'gowishcart-variant-button-styles';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        // Generate CSS for this button instance
        const css = generateButtonCSS(
            dynamicButtonClass,
            currentSettings,
            isInWishlist,
            buttonStyle,
            customStyles,
            colors
        );

        // Escape class name for regex (class names don't have special chars, but be safe)
        const escapedClass = dynamicButtonClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Remove existing CSS for this class
        // Use a more robust pattern that matches CSS rules properly
        const existingStyle = styleElement.textContent || '';
        // Match: .className { ... } potentially followed by .className .selector { ... }
        // This pattern handles multi-line CSS rules
        const classRegex = new RegExp(
            `\\.${escapedClass}\\s*\\{[\\s\\S]*?\\}(?:\\s*\\.${escapedClass}\\s+[^{]+\\{[\\s\\S]*?\\})?`,
            'g'
        );
        let cleanedStyle = existingStyle.replace(classRegex, '').trim();
        
        // Clean up extra whitespace
        cleanedStyle = cleanedStyle.replace(/\n{3,}/g, '\n\n').trim();
        
        // Append new CSS
        styleElement.textContent = (cleanedStyle ? cleanedStyle + '\n\n' : '') + css;

        // Cleanup function - remove this class's CSS when component unmounts
        return () => {
            const styleEl = document.getElementById(styleId);
            if (styleEl) {
                const escapedClassCleanup = dynamicButtonClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Match: .className { ... } potentially followed by .className .selector { ... }
                const cleanupRegex = new RegExp(
                    `\\.${escapedClassCleanup}\\s*\\{[\\s\\S]*?\\}(?:\\s*\\.${escapedClassCleanup}\\s+[^{]+\\{[\\s\\S]*?\\})?`,
                    'g'
                );
                let cleanedContent = (styleEl.textContent || '').replace(cleanupRegex, '').trim();
                
                // Clean up extra whitespace
                cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();
                
                styleEl.textContent = cleanedContent;
                
                // Remove style element if empty
                if (!styleEl.textContent.trim()) {
                    styleEl.remove();
                }
            }
        };
    }, [dynamicButtonClass, currentSettings, isInWishlist, buttonStyle, customStyles, colors]);

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
            <button
                type="button"
                onClick={toggleWishlist}
                disabled={isAdding}
                className={cn(
                    "gowishcart-variant-wishlist-button",
                    isInWishlist && "gowishcart-variant-wishlist-button--active",
                    !isVisible && "gowishcart-variant-wishlist-button--hidden",
                    buttonStyle === 'text-only' && "gowishcart-variant-wishlist-button--text-only",
                    buttonStyle === 'text-only-link' && "gowishcart-variant-wishlist-button--text-only-link",
                    buttonStyle === 'text-icon-link' && "gowishcart-variant-wishlist-button--text-icon-link",
                    buttonStyle === 'icon-only' && "gowishcart-variant-wishlist-button--icon-only",
                    dynamicButtonClass,
                    className
                )}
                aria-label={`${srLabel} - ${variantName}`}
                data-variant-id={variantId}
            >
                {/* Conditionally render icon based on buttonStyle */}
                {(buttonStyle !== 'text-only' && buttonStyle !== 'text-only-link') && (
                    isAdding ? (
                        <Heart className="gowishcart-wishlist-button__icon gowishcart-wishlist-button__icon--loading" />
                    ) : (
                        getIconComponent()
                    )
                )}
                {/* Conditionally render text based on buttonStyle */}
                {(buttonStyle !== 'icon-only') && (
                    <>
                        <span className="gowishcart-wishlist-button__label">{buttonLabel}</span>
                        <span className="gowishcart-variant-wishlist-button__variant-name">{variantName}</span>
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
        
        // Check if we're in a modal context and return the modal element
        const getModalContext = () => {
            // First try to find button by product ID
            const button = document.querySelector(`[data-product-id="${productId}"]`);
            if (button) {
                const modal = button.closest('.fc-product-modal, .fc-product-detail, [class*="product-modal"], [class*="quick-view"]');
                if (modal) {
                    // Verify this modal contains the correct product
                    const modalProductId = modal.querySelector(`[data-product-id="${productId}"]`);
                    if (modalProductId) {
                        return modal;
                    }
                }
            }
            
            // Fallback: find modal by checking if it contains the product ID
            const modals = document.querySelectorAll('.fc-product-modal, .fc-product-detail, [class*="product-modal"], [class*="quick-view"]');
            for (const modal of modals) {
                const modalProductId = modal.querySelector(`[data-product-id="${productId}"]`);
                if (modalProductId) {
                    return modal;
                }
            }
            
            return null;
        };
        
        // Legacy function for boolean checks (keep for backward compatibility)
        const isInModalContext = () => {
            return getModalContext() !== null;
        };
        
        // Function to check if modal is open and variations are loaded, scoped to specific product
        const checkModalAndVariations = () => {
            const modal = getModalContext();
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
        
        // Helper function to validate variant ID exists in variants array
        const isValidVariantId = (detectedId) => {
            if (detectedId === null || detectedId === undefined) return false;
            const parsedId = typeof detectedId === 'number' ? detectedId : parseInt(detectedId, 10);
            if (isNaN(parsedId) || parsedId <= 0) return false;
            return variants.some(v => {
                const vId = v.id || v.variation_id || v.ID;
                return Number(vId) === parsedId;
            });
        };
        
        // Comprehensive function to detect selected variation using multiple strategies
        const detectSelectedVariation = (modalContext = null) => {
            // Get modal context if not provided
            const modal = modalContext || getModalContext();
            const searchRoot = modal || document;
            
            // Strategy 1: PRIORITY - Look for .selected class in fct-product-variants container first
            // First, check within .fct-product-variants container (FluentCart specific)
            const fctVariantsContainer = searchRoot.querySelector('.fct-product-variants');
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
                        // If cartId is a valid variant ID, use it
                        if (isValidVariantId(parsedCartId)) {
                            return parsedCartId;
                        }
                    }
                    
                    // Use variantId if available
                    if (variantId) {
                        const parsedId = parseInt(variantId, 10);
                        if (isValidVariantId(parsedId)) {
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
                            // Validate the result before returning
                            if (isValidVariantId(result)) {
                                return result;
                            }
                        }
                        // If cartId is a valid variant ID, use it
                        if (isValidVariantId(parsedCartId)) {
                            return parsedCartId;
                        }
                    }
                    
                    // Use variantId if available
                    if (variantId) {
                        const parsedId = parseInt(variantId, 10);
                        if (isValidVariantId(parsedId)) {
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
                const selectedButton = searchRoot.querySelector(selector);
                if (selectedButton) {
                    const variantId = selectedButton.getAttribute('data-variant-id') || 
                                     selectedButton.getAttribute('data-variation-id');
                    if (variantId) {
                        const parsedId = parseInt(variantId, 10);
                        if (isValidVariantId(parsedId)) {
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
                            const result = matchedVariant.id || matchedVariant.variation_id || matchedVariant.ID;
                            if (isValidVariantId(result)) {
                                return result;
                            }
                        }
                        // If cartId is a valid variant ID, use it
                        if (isValidVariantId(parsedCartId)) {
                            return parsedCartId;
                        }
                    }
                }
            }
            
            // Strategy 3: Check for hidden form inputs with variation_id
            const form = searchRoot.querySelector('.fc-product-modal form, .fc-product-detail form, form[data-product-id]');
            if (form) {
                const variationInput = form.querySelector('input[name="variation_id"], input[name="variant_id"], input[type="hidden"][name*="variation"], input[type="hidden"][name*="variant"]');
                if (variationInput && variationInput.value) {
                    const parsedId = parseInt(variationInput.value, 10);
                    if (isValidVariantId(parsedId)) {
                        return parsedId;
                    }
                }
                
                // Check for radio buttons or selects
                const variationSelect = form.querySelector('select[name*="variation"], select[name*="variant"]');
                if (variationSelect && variationSelect.value) {
                    const parsedId = parseInt(variationSelect.value, 10);
                    if (isValidVariantId(parsedId)) {
                        return parsedId;
                    }
                }
                
                const checkedRadio = form.querySelector('input[type="radio"][name*="variation"]:checked, input[type="radio"][name*="variant"]:checked');
                if (checkedRadio && checkedRadio.value) {
                    const parsedId = parseInt(checkedRadio.value, 10);
                    if (isValidVariantId(parsedId)) {
                        return parsedId;
                    }
                }
            }
            
            // Strategy 4: Look for elements with border/active styling that might indicate selection
            const modalForSearch = modal || searchRoot;
            if (modalForSearch) {
                // Look for buttons with specific active classes or styles
                const allVariantButtons = modalForSearch.querySelectorAll('[data-variant-id], [data-variation-id]');
                for (const btn of allVariantButtons) {
                    // PRIORITY: Check for .selected class first, then other indicators
                    if (btn.classList.contains('selected')) {
                        // .selected class has highest priority
                        const variantId = btn.getAttribute('data-variant-id') || 
                                         btn.getAttribute('data-variation-id');
                        if (variantId) {
                            const parsedId = parseInt(variantId, 10);
                            if (isValidVariantId(parsedId)) {
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
                            if (isValidVariantId(parsedId)) {
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
                            if (isValidVariantId(parsedId)) {
                                return parsedId;
                            }
                        }
                    }
                }
            }
            
            // Strategy 5: Check FluentCart's internal state if accessible
            if (window.FluentCart && window.FluentCart.selectedVariation) {
                const parsedId = parseInt(window.FluentCart.selectedVariation, 10);
                if (isValidVariantId(parsedId)) {
                    return parsedId;
                }
            }
            
            // Strategy 6: Default to first variant if nothing found, but only if no selection has been made yet
            // If user has made a selection recently, prioritize that (but validate it first)
            if (userSelectedVariantId !== null) {
                const timeSinceSelection = Date.now() - lastUserSelectionTime;
                if (timeSinceSelection < USER_SELECTION_COOLDOWN && isValidVariantId(userSelectedVariantId)) {
                    return userSelectedVariantId;
                }
            }
            
            // If currentActiveId is set and valid, maintain it instead of defaulting to first variant
            if (currentActiveId !== null && isValidVariantId(currentActiveId)) {
                return currentActiveId;
            }
            
            // Only default to first variant if no selection has been made yet
            if (variants.length > 0) {
                const firstVariantId = variants[0].id || variants[0].variation_id || variants[0].ID;
                // First variant is always valid, but validate anyway for consistency
                if (isValidVariantId(firstVariantId)) {
                    return firstVariantId;
                }
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
                
                const modal = getModalContext();
                const detectedId = detectSelectedVariation(modal);
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
            
            const modal = getModalContext();
            const detectedId = detectSelectedVariation(modal);
            if (detectedId !== null && isValidVariantId(detectedId)) {
                // Only update if detected ID matches user selection or cooldown has expired
                if (userSelectedVariantId === null || detectedId === userSelectedVariantId || timeSinceUserSelection >= USER_SELECTION_COOLDOWN) {
                    if (detectedId !== currentActiveId) {
                        currentActiveId = detectedId;
                        setActiveVariantId(detectedId);
                    }
                }
            }
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
            
            const modal = getModalContext();
            const detected = detectSelectedVariation(modal);
            
            if (detected !== null && isValidVariantId(detected)) {
                currentActiveId = detected;
                setActiveVariantId(detected);
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(tryDetect, retryDelay);
            } else {
                // After max retries, default to first variant (fallback)
                if (variants.length > 0) {
                    const firstVariantId = variants[0].id || variants[0].variation_id || variants[0].ID;
                    if (isValidVariantId(firstVariantId)) {
                        currentActiveId = firstVariantId;
                        setActiveVariantId(firstVariantId);
                    }
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
                                    // Track user selection (validate first)
                                    if (isValidVariantId(variantId)) {
                                        userSelectedVariantId = variantId;
                                        lastUserSelectionTime = Date.now();
                                        // Update immediately
                                        currentActiveId = variantId;
                                        setActiveVariantId(variantId);
                                    }
                                }
                            } else {
                                // Fallback: use cartId directly if .selected class not found yet
                                const variantId = mapCartIdToVariantId(cartId);
                                if (variantId && isValidVariantId(variantId)) {
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
                        if (mappedId && isValidVariantId(mappedId)) {
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
                        if (isValidVariantId(parsedId)) {
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
                    if (isValidVariantId(parsedId)) {
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
                    if (isValidVariantId(parsedId)) {
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
                if (isValidVariantId(parsedId)) {
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
                            if (variantId && isValidVariantId(variantId)) {
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
                            if (variantId && isValidVariantId(variantId)) {
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
                    if (variantId && isValidVariantId(variantId)) {
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
                                    if (variantId && isValidVariantId(variantId)) {
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
                                if (isValidVariantId(parsedId)) {
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
            
            const modal = getModalContext();
            const detected = detectSelectedVariation(modal);
            if (detected !== null && isValidVariantId(detected) && detected !== currentActiveId) {
                // Only update if detected ID matches user selection or cooldown expired
                if (userSelectedVariantId === null || detected === userSelectedVariantId || !shouldRespectUserSelection()) {
                    currentActiveId = detected;
                    setActiveVariantId(detected);
                }
            } else if (detected === null || !isValidVariantId(detected)) {
                // Fallback: if detection failed or ID is invalid, show first variant
                if (variants.length > 0 && currentActiveId === null) {
                    const firstVariantId = variants[0].id || variants[0].variation_id || variants[0].ID;
                    if (isValidVariantId(firstVariantId)) {
                        currentActiveId = firstVariantId;
                        setActiveVariantId(firstVariantId);
                    }
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

    // Determine which variant button(s) to show
    // If activeVariantId is null or invalid, show first variant as fallback (instead of hiding all)
    const getVisibleVariantId = () => {
        if (activeVariantId !== null) {
            const activeIdNum = Number(activeVariantId);
            // Validate that the active variant ID exists in our variants array
            const isValid = variants.some(v => {
                const vId = v.id || v.variation_id || v.ID;
                return Number(vId) === activeIdNum;
            });
            if (isValid) {
                return activeIdNum;
            }
        }
        // Fallback: show first variant if no valid active variant is set
        if (variants.length > 0) {
            const firstVariantId = variants[0].id || variants[0].variation_id || variants[0].ID;
            return Number(firstVariantId);
        }
        return null;
    };
    
    const visibleVariantId = getVisibleVariantId();

    return (
        <div className={cn("gowishcart-variant-wishlist-buttons", className)} data-position={position}>
            {variants.map((variant) => {
                const variantId = variant.id || variant.variation_id || variant.ID;
                const variantIdNum = Number(variantId);
                // Button is visible if it matches the visible variant ID
                const isVisible = visibleVariantId !== null && variantIdNum === visibleVariantId;
                
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
