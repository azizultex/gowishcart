import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Heart } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { cn } from '../lib/utils';
import GuestEmailModal from './GuestEmailModal';
import VariantWishlistButtons from './VariantWishlistButtons';
import * as LucideIcons from 'lucide-react';

const WishlistButton = ({ productId, variationId: propVariationId, className, customStyles, position = 'bottom' }) => {
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [guestHasEmail, setGuestHasEmail] = useState(null); // null = not checked, true/false = checked
    const [pendingAddAction, setPendingAddAction] = useState(null); // Store pending add action
    const [currentVariationId, setCurrentVariationId] = useState(propVariationId || 0);
    const [variants, setVariants] = useState(null); // null = not checked, [] = no variants, array = has variants
    const [isCheckingVariants, setIsCheckingVariants] = useState(true);
    
    // Cache for variant data per product ID
    const variantsCacheRef = useRef(new Map()); // productId -> variants array
    const isFetchingRef = useRef(false); // Flag to prevent multiple simultaneous API calls
    const variantsFoundRef = useRef(false); // Flag to track if variants have been successfully loaded
    const abortControllerRef = useRef(null); // AbortController for cancelling requests

    // Get session ID from cookie or create one
    const getSessionId = () => {
        if (window.wishcartWishlist?.isLoggedIn) {
            return null; // Logged in users don't need session ID
        }
        
        // Check cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'gowishcart_session_id') {
                return value;
            }
        }

        if (window.wishcartWishlist?.sessionId) {
            return window.wishcartWishlist.sessionId;
        }

        // Create new session ID if not exists
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
            return true; // Logged in users don't need email check
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
            // Error handled silently
        }
        
        setGuestHasEmail(false);
        return false;
    };

    // Fetch variants from API with caching
    const fetchVariantsFromAPI = useCallback(async () => {
        if (!productId || !window.wishcartWishlist) {
            return [];
        }

        // Check cache first
        if (variantsCacheRef.current.has(productId)) {
            const cachedVariants = variantsCacheRef.current.get(productId);
            if (cachedVariants && Array.isArray(cachedVariants) && cachedVariants.length > 0) {
                return cachedVariants;
            }
        }

        // Prevent multiple simultaneous calls for the same product
        if (isFetchingRef.current) {
            // Wait a bit and check cache again
            await new Promise(resolve => setTimeout(resolve, 100));
            if (variantsCacheRef.current.has(productId)) {
                return variantsCacheRef.current.get(productId) || [];
            }
            return [];
        }

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new AbortController
        abortControllerRef.current = new AbortController();
        isFetchingRef.current = true;

        try {
            // Fetch variants from API endpoint
            const url = `${window.wishcartWishlist.apiUrl}product/${productId}/variants`;
            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
                signal: abortControllerRef.current.signal,
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.variants && Array.isArray(data.variants) && data.variants.length > 1) {
                    const formattedVariants = data.variants.map(v => ({
                        id: v.id || v.variation_id || 0,
                        variation_id: v.id || v.variation_id || 0,
                        name: v.name || v.title || `Variant ${v.id || v.variation_id || 0}`,
                        title: v.title || v.name || `Variant ${v.id || v.variation_id || 0}`,
                        price: v.price || (v.item_price ? v.item_price / 100 : null),
                        regular_price: v.regular_price || (v.compare_price ? v.compare_price / 100 : null),
                    }));
                    
                    // Cache the variants
                    variantsCacheRef.current.set(productId, formattedVariants);
                    return formattedVariants;
                }
            }
        } catch (error) {
            // Ignore abort errors
        } finally {
            isFetchingRef.current = false;
            abortControllerRef.current = null;
        }

        // Cache empty result to prevent repeated calls
        variantsCacheRef.current.set(productId, []);
        return [];
    }, [productId]);

    // Detect if product has variants from DOM
    const detectProductVariants = useCallback(async () => {
        if (!productId) {
            return [];
        }

        // Try to find variant buttons in the DOM
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        if (!button) {
            // If no button found, try API fetch
            return await fetchVariantsFromAPI();
        }

        const modal = button.closest('.fc-product-modal, .fc-product-detail, form');
        if (!modal) {
            return await fetchVariantsFromAPI();
        }

        // Look for variant selection buttons - try multiple selectors
        const variantSelectors = [
            '[data-variant-id]',
            '[data-variation-id]',
            '.fc-variant-button',
            '[class*="variant-button"]',
            '[class*="variant-option"]',
            'button[class*="variant"]',
            '[role="button"][class*="variant"]'
        ];
        
        let variantButtons = [];
        for (const selector of variantSelectors) {
            const found = modal.querySelectorAll(selector);
            if (found.length > 1) {
                variantButtons = Array.from(found);
                break;
            }
        }
        
        if (variantButtons.length > 1) {
            const variants = [];
            variantButtons.forEach((vb, index) => {
                // Try multiple ways to get variant ID
                let variantId = vb.getAttribute('data-variant-id') || 
                               vb.getAttribute('data-variation-id') || 
                               vb.getAttribute('data-id') ||
                               vb.getAttribute('data-item-id') ||
                               vb.getAttribute('value');
                
                // If no direct ID, check for hidden input associated with this button
                if (!variantId) {
                    const form = vb.closest('form');
                    if (form) {
                        // Look for hidden input that might be updated when this variant is selected
                        const hiddenInputs = form.querySelectorAll('input[type="hidden"][name*="variant"], input[type="hidden"][name*="variation"]');
                        hiddenInputs.forEach(input => {
                            // Check if this button is related to this input (by checking if clicking it would change the input)
                            const inputValue = input.value;
                            if (inputValue && inputValue !== '0') {
                                // This might be the variant ID, but we need to map it to the button
                                // For now, we'll try to get it from the button's click handler or data
                            }
                        });
                    }
                }
                
                // Check parent element for variant ID
                if (!variantId) {
                    const parent = vb.parentElement;
                    if (parent) {
                        variantId = parent.getAttribute('data-variant-id') || 
                                   parent.getAttribute('data-variation-id') ||
                                   parent.getAttribute('data-id');
                    }
                }
                
                // Check for variant ID in button's dataset
                if (!variantId && vb.dataset) {
                    variantId = vb.dataset.variantId || 
                               vb.dataset.variationId ||
                               vb.dataset.id ||
                               vb.dataset.itemId;
                }
                
                // Get variant name from button text or attributes
                let variantName = vb.textContent?.trim();
                // Clean up variant name - remove extra whitespace and newlines
                if (variantName) {
                    variantName = variantName.replace(/\s+/g, ' ').trim();
                }
                if (!variantName || variantName.length > 50) {
                    variantName = vb.getAttribute('title') || 
                                 vb.getAttribute('aria-label') ||
                                 vb.getAttribute('data-name') ||
                                 vb.getAttribute('data-title') ||
                                 vb.querySelector('[class*="name"], [class*="title"], [class*="label"]')?.textContent?.trim();
                }
                
                // If still no variant ID, try to extract from button's onclick or data attributes
                if (!variantId) {
                    // Check if button has an onclick handler that might contain variant ID
                    const onclick = vb.getAttribute('onclick');
                    if (onclick) {
                        const idMatch = onclick.match(/variation[_-]?id['"]?\s*[:=]\s*['"]?(\d+)/i) ||
                                       onclick.match(/variant[_-]?id['"]?\s*[:=]\s*['"]?(\d+)/i) ||
                                       onclick.match(/(\d+)/);
                        if (idMatch && idMatch[1]) {
                            variantId = idMatch[1];
                        }
                    }
                }
                
                // If we still don't have a variant ID but we have variant buttons, 
                // we need to fetch variant data from API (will do this in next step)
                // For now, use index as fallback but mark it as needing API fetch
                if (!variantId && variantName) {
                    // We'll need to fetch from API - for now return empty to trigger API fetch
                    return;
                }
                
                if (variantId) {
                    const parsedId = parseInt(variantId, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        // Try to get price from variant button or nearby elements
                        const priceElement = vb.closest('[class*="variant"]')?.querySelector('[class*="price"]');
                        const price = priceElement?.textContent?.match(/[\d.]+/)?.[0] || null;
                        
                        variants.push({
                            id: parsedId,
                            variation_id: parsedId,
                            name: variantName || `Variant ${parsedId}`,
                            title: variantName || `Variant ${parsedId}`,
                            price: price ? parseFloat(price) : null,
                        });
                    }
                }
            });
            
            // Remove duplicates
            const uniqueVariants = variants.filter((v, index, self) => 
                index === self.findIndex((t) => t.id === v.id)
            );
            
            // If we have variants with valid IDs, return them
            if (uniqueVariants.length > 1 && uniqueVariants.every(v => v.id > 0)) {
                return uniqueVariants;
            }
            
            // If we have variant buttons but no IDs, try to map by index/name using API
            if (variantButtons.length > 1) {
                // Try to get variant names and map them to IDs from API
                const variantNames = Array.from(variantButtons).map(vb => {
                    let name = vb.textContent?.trim()?.replace(/\s+/g, ' ') || 
                              vb.getAttribute('title') || 
                              vb.getAttribute('aria-label') ||
                              vb.getAttribute('data-name');
                    return name;
                }).filter(Boolean);
                
                if (variantNames.length > 1) {
                    // Fetch variants from API and try to match by name
                    const apiVariants = await fetchVariantsFromAPI();
                    if (apiVariants.length > 1) {
                        // Map variant names to API variants
                        const mappedVariants = variantNames.map((name, index) => {
                            // Try to find matching variant in API data
                            const matched = apiVariants.find(av => 
                                av.name?.toLowerCase() === name.toLowerCase() ||
                                av.title?.toLowerCase() === name.toLowerCase()
                            );
                            
                            if (matched) {
                                return matched;
                            }
                            
                            // If no match, use API variant at same index if available
                            if (apiVariants[index]) {
                                return {
                                    ...apiVariants[index],
                                    name: name, // Use the name from DOM
                                    title: name,
                                };
                            }
                            
                            return null;
                        }).filter(Boolean);
                        
                        if (mappedVariants.length > 1) {
                            return mappedVariants;
                        }
                    }
                }
            }
        }

        // Also check for variant options in select dropdowns or other structures
        const variantSelects = modal.querySelectorAll('select[name*="variant"], select[name*="variation"], [data-variants], select[class*="variant"]');
        if (variantSelects.length > 0) {
            const variants = [];
            variantSelects.forEach((select) => {
                const options = select.querySelectorAll('option[value]');
                options.forEach((option) => {
                    const value = option.value;
                    if (value && value !== '' && value !== '0' && value !== '-1') {
                        const parsedId = parseInt(value, 10);
                        if (!isNaN(parsedId) && parsedId > 0) {
                            const optionText = option.textContent?.trim();
                            if (optionText && !optionText.toLowerCase().includes('choose') && !optionText.toLowerCase().includes('select')) {
                                variants.push({
                                    id: parsedId,
                                    variation_id: parsedId,
                                    name: optionText || `Variant ${parsedId}`,
                                    title: optionText || `Variant ${parsedId}`,
                                });
                            }
                        }
                    }
                });
            });
            
            // Remove duplicates
            const uniqueVariants = variants.filter((v, index, self) => 
                index === self.findIndex((t) => t.id === v.id)
            );
            
            if (uniqueVariants.length > 1) {
                return uniqueVariants;
            }
        }

        // Try to find variant buttons by looking for buttons with variant-related classes or data attributes
        // This is a more aggressive search for FluentCart variant buttons
        const allButtons = modal.querySelectorAll('button, [role="button"], [class*="button"]');
        const variantButtonsFound = [];
        
        allButtons.forEach((btn) => {
            const hasVariantClass = btn.className && (
                btn.className.includes('variant') || 
                btn.className.includes('version') ||
                btn.className.includes('option')
            );
            const hasVariantData = btn.hasAttribute('data-variant-id') || 
                                  btn.hasAttribute('data-variation-id') ||
                                  btn.hasAttribute('data-version-id');
            
            if (hasVariantClass || hasVariantData) {
                const variantId = btn.getAttribute('data-variant-id') || 
                                 btn.getAttribute('data-variation-id') ||
                                 btn.getAttribute('data-version-id') ||
                                 btn.getAttribute('data-id');
                
                if (variantId) {
                    const parsedId = parseInt(variantId, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        const btnText = btn.textContent?.trim();
                        if (btnText && btnText.length < 100) { // Reasonable text length
                            variantButtonsFound.push({
                                id: parsedId,
                                variation_id: parsedId,
                                name: btnText || `Variant ${parsedId}`,
                                title: btnText || `Variant ${parsedId}`,
                            });
                        }
                    }
                }
            }
        });
        
        if (variantButtonsFound.length > 1) {
            // Remove duplicates
            const uniqueVariants = variantButtonsFound.filter((v, index, self) => 
                index === self.findIndex((t) => t.id === v.id)
            );
            
            if (uniqueVariants.length > 1) {
                return uniqueVariants;
            }
        }

        // If we found variant buttons but no IDs, try to get IDs from API by matching names
        if (variantButtons.length > 1) {
            const variantNames = Array.from(variantButtons).map(vb => {
                let name = vb.textContent?.trim()?.replace(/\s+/g, ' ') || 
                          vb.getAttribute('title') || 
                          vb.getAttribute('aria-label') ||
                          vb.getAttribute('data-name');
                return name;
            }).filter(Boolean);
            
            if (variantNames.length > 1) {
                const apiVariants = await fetchVariantsFromAPI();
                if (apiVariants.length > 1) {
                    // Map variant names to API variants
                    const mappedVariants = variantNames.map((name, index) => {
                        // Try to find matching variant in API data
                        const matched = apiVariants.find(av => 
                            av.name?.toLowerCase() === name.toLowerCase() ||
                            av.title?.toLowerCase() === name.toLowerCase()
                        );
                        
                        if (matched) {
                            return matched;
                        }
                        
                        // If no match, use API variant at same index if available
                        if (apiVariants[index]) {
                            return {
                                ...apiVariants[index],
                                name: name, // Use the name from DOM
                                title: name,
                            };
                        }
                        
                        return null;
                    }).filter(Boolean);
                    
                    if (mappedVariants.length > 1) {
                        return mappedVariants;
                    }
                }
            }
        }

        // If DOM detection failed, try API
        const apiVariants = await fetchVariantsFromAPI();
        if (apiVariants.length > 1) {
            return apiVariants;
        }
        
        return [];
    }, [productId, fetchVariantsFromAPI]);

    // Check for variants on mount and when product changes
    useEffect(() => {
        if (!productId) {
            setIsCheckingVariants(false);
            setVariants([]);
            variantsFoundRef.current = false;
            return;
        }

        // Clear cache for previous product if productId changed
        // (Cache is per product, so we keep it for the same product)
        
        // Reset flags for new product
        variantsFoundRef.current = false;
        isFetchingRef.current = false;
        
        // Cancel any pending requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        let checkCount = 0;
        const maxChecks = 10; // Increased to 10 times for better persistence
        let isCancelled = false;

        const checkVariants = async () => {
            if (isCancelled || variantsFoundRef.current) return;

            try {
                const detectedVariants = await detectProductVariants();
                if (detectedVariants.length > 1) {
                    // Verify all variants have unique IDs
                    const uniqueIds = new Set(detectedVariants.map(v => v.id || v.variation_id));
                    if (uniqueIds.size === detectedVariants.length && detectedVariants.every(v => (v.id || v.variation_id) > 0)) {
                        setVariants(detectedVariants);
                        setIsCheckingVariants(false);
                        variantsFoundRef.current = true; // Mark as found
                        return; // Success, stop checking
                    } else if (checkCount < maxChecks) {
                        checkCount++;
                        // Variants detected but IDs might be wrong, try again
                        setTimeout(checkVariants, 500);
                        return;
                    } else {
                        // Variants found but IDs are not unique/valid - try API as last resort
                        const apiVariants = await fetchVariantsFromAPI();
                        if (apiVariants.length > 1) {
                            setVariants(apiVariants);
                            setIsCheckingVariants(false);
                            variantsFoundRef.current = true; // Mark as found
                            return;
                        }
                        setVariants([]);
                        setIsCheckingVariants(false);
                    }
                } else if (checkCount < maxChecks) {
                    checkCount++;
                    // Try again after delay (variants might load dynamically)
                    setTimeout(checkVariants, 500);
                } else {
                    // No variants found after multiple attempts - try API as last resort
                    const apiVariants = await fetchVariantsFromAPI();
                    if (apiVariants.length > 1) {
                        setVariants(apiVariants);
                        setIsCheckingVariants(false);
                        variantsFoundRef.current = true; // Mark as found
                    } else {
                        setVariants([]);
                        setIsCheckingVariants(false);
                    }
                }
            } catch (error) {
                // On error, try API fallback
                if (checkCount < maxChecks) {
                    checkCount++;
                    setTimeout(checkVariants, 500);
                } else {
                    const apiVariants = await fetchVariantsFromAPI();
                    if (apiVariants.length > 1) {
                        setVariants(apiVariants);
                        variantsFoundRef.current = true; // Mark as found
                    } else {
                        setVariants([]);
                    }
                    setIsCheckingVariants(false);
                }
            }
        };

        // Initial check
        checkVariants();

        // Also set up MutationObserver to detect when variants are added to DOM
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        let observer = null;
        let mutationTimeout = null;
        
        if (button && !variantsFoundRef.current) {
            const modal = button.closest('.fc-product-modal, .fc-product-detail, form') || document.body;
            if (modal) {
                observer = new MutationObserver(async () => {
                    // Early exit if variants already found
                    if (variantsFoundRef.current || isCancelled) {
                        if (observer) {
                            observer.disconnect();
                        }
                        return;
                    }

                    // Debounce the check to avoid excessive API calls
                    if (mutationTimeout) {
                        clearTimeout(mutationTimeout);
                    }
                    
                    mutationTimeout = setTimeout(async () => {
                        // Early exit if variants already found or cancelled
                        if (variantsFoundRef.current || isCancelled) {
                            if (observer) {
                                observer.disconnect();
                            }
                            return;
                        }
                        
                        try {
                            const detectedVariants = await detectProductVariants();
                            if (isCancelled || variantsFoundRef.current) return;
                            
                            if (detectedVariants.length > 1) {
                                // Verify all variants have unique IDs
                                const uniqueIds = new Set(detectedVariants.map(v => v.id || v.variation_id));
                                if (uniqueIds.size === detectedVariants.length && detectedVariants.every(v => (v.id || v.variation_id) > 0)) {
                                    setVariants(detectedVariants);
                                    setIsCheckingVariants(false);
                                    variantsFoundRef.current = true; // Mark as found
                                    // Disconnect observer immediately after finding variants
                                    if (observer) {
                                        observer.disconnect();
                                    }
                                } else {
                                    // IDs not valid, try API fallback
                                    const apiVariants = await fetchVariantsFromAPI();
                                    if (!isCancelled && apiVariants.length > 1) {
                                        setVariants(apiVariants);
                                        setIsCheckingVariants(false);
                                        variantsFoundRef.current = true; // Mark as found
                                        // Disconnect observer immediately after finding variants
                                        if (observer) {
                                            observer.disconnect();
                                        }
                                    }
                                }
                            } else {
                                // No variants from DOM, try API fallback
                                const apiVariants = await fetchVariantsFromAPI();
                                if (!isCancelled && apiVariants.length > 1) {
                                    setVariants(apiVariants);
                                    setIsCheckingVariants(false);
                                    variantsFoundRef.current = true; // Mark as found
                                    // Disconnect observer immediately after finding variants
                                    if (observer) {
                                        observer.disconnect();
                                    }
                                }
                            }
                        } catch (error) {
                            // Error handled silently
                        }
                    }, 300); // Debounce for 300ms
                });

                observer.observe(modal, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['data-variant-id', 'data-variation-id', 'class']
                });
            }
        }

        // Cleanup function
        return () => {
            isCancelled = true;
            if (mutationTimeout) {
                clearTimeout(mutationTimeout);
            }
            if (observer) {
                observer.disconnect();
            }
            // Cancel any pending API requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [productId, detectProductVariants, fetchVariantsFromAPI]);

    // Detect currently selected variant from product modal/form
    const detectCurrentVariant = () => {
        // If variationId prop is provided, use it
        if (propVariationId !== undefined && propVariationId !== null) {
            return propVariationId;
        }

        // Try to detect from nearby form or modal
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        if (!button) {
            return 0;
        }

        // Check for data-variation-id attribute
        const variationIdAttr = button.getAttribute('data-variation-id') || 
                                 button.closest('[data-variation-id]')?.getAttribute('data-variation-id');
        if (variationIdAttr) {
            const parsed = parseInt(variationIdAttr, 10);
            if (!isNaN(parsed)) {
                return parsed;
            }
        }

        // Check for form input
        const form = button.closest('form');
        if (form) {
            const variationInput = form.querySelector('input[name="variation_id"]');
            if (variationInput && variationInput.value) {
                const parsed = parseInt(variationInput.value, 10);
                if (!isNaN(parsed)) {
                    return parsed;
                }
            }
        }

        // Check for FluentCart variant selection
        const variantButton = button.closest('.fc-product-modal, .fc-product-detail')?.querySelector('[data-variant-id].selected, [data-variation-id].selected');
        if (variantButton) {
            const variantId = variantButton.getAttribute('data-variant-id') || variantButton.getAttribute('data-variation-id');
            if (variantId) {
                const parsed = parseInt(variantId, 10);
                if (!isNaN(parsed)) {
                    return parsed;
                }
            }
        }

        return 0; // Default to 0 if no variant detected
    };

    // Function to check wishlist status
    const checkWishlistStatus = useCallback(async (variationId) => {
            if (!productId || !window.wishcartWishlist) {
                setIsLoading(false);
                return;
            }

            try {
                const sessionId = getSessionId();
            const url = `${window.wishcartWishlist.apiUrl}wishlist/check/${productId}${sessionId ? `?session_id=${sessionId}` : ''}${variationId ? `&variation_id=${variationId}` : ''}`;
                
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
                // Error handled silently
            } finally {
                setIsLoading(false);
            }
    }, [productId]);

    // Use ref to track previous variant ID to avoid dependency issues
    const previousVariantIdRef = useRef(propVariationId || 0);

    // Monitor variant changes continuously
    useEffect(() => {
        if (!productId) {
            return;
        }

        // Initial check
        const detectedVariant = detectCurrentVariant();
        if (detectedVariant !== previousVariantIdRef.current) {
            setCurrentVariationId(detectedVariant);
            previousVariantIdRef.current = detectedVariant;
            checkWishlistStatus(detectedVariant);
        } else {
            // Same variant, but still check wishlist status on initial load
            checkWishlistStatus(detectedVariant);
        }

        // Set up polling to detect variant changes
        const variantCheckInterval = setInterval(() => {
            const detectedVariant = detectCurrentVariant();
            if (detectedVariant !== previousVariantIdRef.current) {
                // Variant has changed, update state and re-check wishlist
                setCurrentVariationId(detectedVariant);
                previousVariantIdRef.current = detectedVariant;
                checkWishlistStatus(detectedVariant);
            }
        }, 500); // Check every 500ms

        // Also listen for DOM changes that might indicate variant selection
        const observer = new MutationObserver(() => {
            const detectedVariant = detectCurrentVariant();
            if (detectedVariant !== previousVariantIdRef.current) {
                setCurrentVariationId(detectedVariant);
                previousVariantIdRef.current = detectedVariant;
                checkWishlistStatus(detectedVariant);
            }
        });

        // Observe changes in the document (especially variant selection buttons)
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        if (button) {
            const modal = button.closest('.fc-product-modal, .fc-product-detail, form');
            if (modal) {
                observer.observe(modal, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'data-variant-id', 'data-variation-id', 'selected']
                });
            }
        }

        // Listen for custom events that might indicate variant changes
        const handleVariantChange = (event) => {
            const eventVariantId = event.detail?.variation_id || event.detail?.variant_id || 0;
            if (eventVariantId !== previousVariantIdRef.current) {
                setCurrentVariationId(eventVariantId);
                previousVariantIdRef.current = eventVariantId;
                checkWishlistStatus(eventVariantId);
            }
        };

        document.addEventListener('fluentcart:variant_changed', handleVariantChange);
        document.addEventListener('woocommerce_variation_select_change', handleVariantChange);
        window.addEventListener('variation_change', handleVariantChange);

        // Cleanup
        return () => {
            clearInterval(variantCheckInterval);
            observer.disconnect();
            document.removeEventListener('fluentcart:variant_changed', handleVariantChange);
            document.removeEventListener('woocommerce_variation_select_change', handleVariantChange);
            window.removeEventListener('variation_change', handleVariantChange);
        };
    }, [productId, propVariationId, checkWishlistStatus]);

    // Listen for wishlist item added/removed events to sync state across components
    useEffect(() => {
        const handleItemAdded = (event) => {
            const { productId: eventProductId, variationId: eventVariationId } = event.detail || {};
            
            // Check if this event is for the same product
            if (eventProductId === productId) {
                // Normalize variation IDs (handle undefined/null as 0)
                const eventVarId = eventVariationId ?? 0;
                const currentVarId = currentVariationId || 0;
                
                // Update if variation IDs match
                if (eventVarId === currentVarId) {
                    setIsInWishlist(true);
                    // Also re-check wishlist status to ensure accuracy
                    checkWishlistStatus(currentVarId);
                }
            }
        };

        const handleItemRemoved = (event) => {
            const { productId: eventProductId, variationId: eventVariationId } = event.detail || {};
            
            // Check if this event is for the same product
            if (eventProductId === productId) {
                // Normalize variation IDs (handle undefined/null as 0)
                const eventVarId = eventVariationId ?? 0;
                const currentVarId = currentVariationId || 0;
                
                // Update if variation IDs match
                if (eventVarId === currentVarId) {
                    setIsInWishlist(false);
                    // Also re-check wishlist status to ensure accuracy
                    checkWishlistStatus(currentVarId);
                }
            }
        };

        window.addEventListener('gowishcart:item-added', handleItemAdded);
        window.addEventListener('gowishcart:item-removed', handleItemRemoved);

        return () => {
            window.removeEventListener('gowishcart:item-added', handleItemAdded);
            window.removeEventListener('gowishcart:item-removed', handleItemRemoved);
        };
    }, [productId, currentVariationId, checkWishlistStatus]);

    // Add product directly to default wishlist (when multiple wishlists disabled)
    const addToDefaultWishlist = async (skipEmailCheck = false) => {
        // Check if guest has email (unless we're executing after email was provided)
        if (!skipEmailCheck && !window.wishcartWishlist?.isLoggedIn) {
            const hasEmail = await checkGuestEmail();
            if (!hasEmail) {
                // Store the pending action and show email modal
                setPendingAddAction('default');
                setIsEmailModalOpen(true);
                return;
            }
        }

        setIsAdding(true);
        try {
            const sessionId = getSessionId();
            const url = `${window.wishcartWishlist.apiUrl}wishlist/add`;
            
            // Detect current variant before adding
            const variationId = detectCurrentVariant();
            setCurrentVariationId(variationId);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
                body: JSON.stringify({
                    product_id: productId,
                    variation_id: variationId || 0,
                    session_id: sessionId,
                    // No wishlist_id means it will use default wishlist
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setIsInWishlist(true);
                if (data && data.message) {
                    // Message logged by server
                }
            }
        } catch (error) {
            // Error handled silently
        } finally {
            setIsAdding(false);
        }
    };

    // Toggle wishlist
    const toggleWishlist = async () => {
        if (isAdding || !productId || !window.wishcartWishlist) {
            return;
        }

        // If product is already in wishlist, remove it
        if (isInWishlist) {
            setIsAdding(true);
            try {
                const sessionId = getSessionId();
                const variationId = currentVariationId || 0;
                const url = `${window.wishcartWishlist.apiUrl}wishlist/remove`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.wishcartWishlist.nonce,
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        variation_id: variationId,
                        session_id: sessionId,
                    }),
                });

                if (response.ok) {
                    setIsInWishlist(false);
                }
            } catch (error) {
                // Error handled silently
            } finally {
                setIsAdding(false);
            }
        } else {
            // For guests, check if they have email first
            if (!window.wishcartWishlist?.isLoggedIn) {
                const hasEmail = await checkGuestEmail();
                if (!hasEmail) {
                    // Store the pending action and show email modal
                    setPendingAddAction('toggle');
                    setIsEmailModalOpen(true);
                    return;
                }
            }

            // Always add to default wishlist (multiple wishlists is a pro feature)
            await addToDefaultWishlist(true); // Skip email check since we just did it
        }
    };

    // Handle email modal submission
    const handleEmailSubmitted = async (email) => {
        // Mark guest as having email
        setGuestHasEmail(true);
        
        // Execute the pending action - always add to default wishlist
        if (pendingAddAction === 'default' || pendingAddAction === 'toggle') {
            await addToDefaultWishlist(true); // Skip email check since we just got it
        }
        
        // Clear pending action
        setPendingAddAction(null);
    };

    // Handle email modal close (skip)
    const handleEmailModalClose = () => {
        setIsEmailModalOpen(false);
        setPendingAddAction(null);
        // Don't add item if they skip
    };

    // Handle successful addition from modal
    const handleModalSuccess = (data) => {
        setIsInWishlist(true);
        // Optional: Show a success message
        if (data && data.message) {
            // Message logged by server
        }
    };

    // Get customization settings
    const customization = window.wishcartWishlist?.buttonCustomization || {};
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

    // Get button style variation from customization settings
    const buttonStyle = customization.buttonStyle || 'button';
    
    // Detect if button is on product listing (shop page) vs product page
    const isProductListing = useMemo(() => {
        if (typeof document === 'undefined') return false;
        const container = document.querySelector(`[data-product-id="${productId}"]`);
        if (!container) return false;
        return container.closest('.wishcart-card-container') !== null || 
               container.closest('.fct-product-card, .fc-product-card') !== null ||
               container.classList.contains('gowishcart-card-container');
    }, [productId]);

    // Support both old and new icon structure
    let addToWishlistIcon, savedWishlistIcon;
    
    if (iconConfig.addToWishlist) {
        // New format
        addToWishlistIcon = iconConfig.addToWishlist;
        savedWishlistIcon = iconConfig.savedWishlist || iconConfig.addToWishlist;
    } else if (iconConfig.type || iconConfig.value || iconConfig.customUrl) {
        // Old format - migrate on the fly
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
        // Default values
        addToWishlistIcon = { type: 'predefined', value: 'Heart', customUrl: '' };
        savedWishlistIcon = { type: 'predefined', value: 'Heart', customUrl: '' };
    }

    // Get button labels
    const defaultAddLabel = __('Add to Wishlist', 'gowishcart-wishlist-for-fluentcart');
    const defaultSavedLabel = __('Saved to Wishlist', 'gowishcart-wishlist-for-fluentcart');
    const buttonLabel = isInWishlist 
        ? (labels.saved || defaultSavedLabel)
        : (labels.add || defaultAddLabel);
    const srLabel = isInWishlist ? __('Remove from wishlist', 'gowishcart-wishlist-for-fluentcart') : __('Add to wishlist', 'gowishcart-wishlist-for-fluentcart');

    // Get icon component based on wishlist state
    const getIconComponent = () => {
        const currentIcon = isInWishlist ? savedWishlistIcon : addToWishlistIcon;
        const settings = productPage;
        const iconSize = settings.iconSize || '1.125rem';
        
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

        // Handle Default Icon
        const iconValue = currentIcon.value || 'Heart';
        const IconComponent = LucideIcons[iconValue] || Heart;
        
        return (
            <IconComponent 
                className={cn("wishcart-wishlist-button__icon", isInWishlist && "wishcart-wishlist-button__icon--filled")}
                style={{ width: iconSize, height: iconSize }}
            />
        );
    };

    // Build dynamic styles
    const buildButtonStyles = () => {
        const baseStyles = customStyles || {};
        const dynamicStyles = {};

        // Use saved settings if in wishlist, otherwise use add settings
        // Always use product_page settings for consistent styling everywhere
        let settings;
        if (isInWishlist) {
            // Use saved state settings
            settings = savedProductPage;
            // Fallback to add state settings if saved settings are not available
            if (!settings || Object.keys(settings).length === 0) {
                settings = productPage;
            }
        } else {
            // Use add state settings
            settings = productPage;
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
        
        // Apply specific settings (product_page, product_listing, saved_product_page, or saved_product_listing)
        if (settings.backgroundColor) {
            applyBackgroundToStyles(dynamicStyles, settings.backgroundColor);
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
            if (colors.hoverBackground) {
                dynamicStyles['--wishlist-hover-bg'] = colors.hoverBackground;
            }
            if (colors.hoverText) {
                dynamicStyles['--wishlist-hover-text'] = colors.hoverText;
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
            if (colors.focusBorder) {
                dynamicStyles['--wishlist-focus-border'] = colors.focusBorder;
            }

            // Apply inline styles for immediate effect
            if (!isInWishlist) {
                if (colors.background) applyBackgroundToStyles(dynamicStyles, colors.background);
                if (colors.text) dynamicStyles.color = colors.text;
                if (colors.border) dynamicStyles.borderColor = colors.border;
            } else {
                if (colors.activeBackground) applyBackgroundToStyles(dynamicStyles, colors.activeBackground);
                if (colors.activeText) dynamicStyles.color = colors.activeText;
                if (colors.activeBorder) dynamicStyles.borderColor = colors.activeBorder;
            }
        }

        return { ...baseStyles, ...dynamicStyles };
    };

    // If checking for variants, show loading state
    if (isCheckingVariants) {
        const renderLoadingIcon = () => {
            const currentIcon = addToWishlistIcon;
            const settings = productPage;
            const iconSize = settings.iconSize || '1.125rem';
            if (currentIcon.type === 'custom' && currentIcon.customUrl) {
                return (
                    <img
                        src={currentIcon.customUrl}
                        alt=""
                        className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading"
                        style={{ width: iconSize, height: iconSize }}
                    />
                );
            }
            const iconValue = currentIcon.value || 'Heart';
            const IconComponent = LucideIcons[iconValue] || Heart;
            return <IconComponent className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading" style={{ width: iconSize, height: iconSize }} />;
        };

        return (
            <div className={cn("wishcart-wishlist-button-loading", className)} style={buildButtonStyles()}>
                {renderLoadingIcon()}
            </div>
        );
    }

    // If product has variants, render separate buttons for each variant
    if (variants && variants.length > 1) {
        return (
            <VariantWishlistButtons
                productId={productId}
                variants={variants}
                className={className}
                customStyles={customStyles}
                position={position}
            />
        );
    }

    // For single products or products without variants, render single button
    if (isLoading) {
        const renderLoadingIcon = () => {
            const currentIcon = addToWishlistIcon; // Use add icon for loading state
            const settings = productPage;
            const iconSize = settings.iconSize || '1.125rem';
            if (currentIcon.type === 'custom' && currentIcon.customUrl) {
                return (
                    <img
                        src={currentIcon.customUrl}
                        alt=""
                        className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading"
                        style={{ width: iconSize, height: iconSize }}
                    />
                );
            }
            const iconValue = currentIcon.value || 'Heart';
            const IconComponent = LucideIcons[iconValue] || Heart;
            return <IconComponent className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading" style={{ width: iconSize, height: iconSize }} />;
        };

        return (
            <div className={cn("wishcart-wishlist-button-loading", className)} style={buildButtonStyles()}>
                {renderLoadingIcon()}
            </div>
        );
    }

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
                    "wishcart-wishlist-button",
                    isInWishlist && "wishcart-wishlist-button--active",
                    position && `wishcart-placement-${position}`,
                    buttonStyle === 'text-only' && "wishcart-wishlist-button--text-only",
                    buttonStyle === 'text-only-link' && "wishcart-wishlist-button--text-only-link",
                    buttonStyle === 'text-icon-link' && "wishcart-wishlist-button--text-icon-link",
                    buttonStyle === 'icon-only' && "wishcart-wishlist-button--icon-only",
                    className
                )}
                style={buildButtonStyles()}
                data-position={position}
                aria-label={srLabel}
            onMouseEnter={(e) => {
                // Only apply background hover for button styles
                if (buttonStyle === 'button' || buttonStyle === 'text-only') {
                    if (isInWishlist) {
                        // Use saved state hover colors
                        const savedSettings = savedProductPage;
                        // Fallback to add state settings if saved settings are not available
                        const settings = (savedSettings && Object.keys(savedSettings).length > 0) 
                            ? savedSettings 
                            : productPage;
                        
                        if (settings.backgroundHoverColor) {
                            applyBackgroundToStyles(e.currentTarget.style, settings.backgroundHoverColor);
                        } else if (colors.activeBackground) {
                            applyBackgroundToStyles(e.currentTarget.style, colors.activeBackground);
                        }
                        if (settings.buttonTextHoverColor) {
                            e.currentTarget.style.color = settings.buttonTextHoverColor;
                        } else if (colors.activeText) {
                            e.currentTarget.style.color = colors.activeText;
                        }
                    } else {
                        // Use add state hover colors
                        const settings = productPage;
                        if (settings.backgroundHoverColor) {
                            applyBackgroundToStyles(e.currentTarget.style, settings.backgroundHoverColor);
                        } else if (colors.hoverBackground) {
                            applyBackgroundToStyles(e.currentTarget.style, colors.hoverBackground);
                        }
                        if (settings.buttonTextHoverColor) {
                            e.currentTarget.style.color = settings.buttonTextHoverColor;
                        } else if (colors.hoverText) {
                            e.currentTarget.style.color = colors.hoverText;
                        }
                    }
                } else {
                    // For text-icon-link and icon-only, only change text/icon color
                    const settings = isInWishlist ? savedProductPage : productPage;
                    if (settings.buttonTextHoverColor) {
                        e.currentTarget.style.color = settings.buttonTextHoverColor;
                    } else if (isInWishlist && colors.activeText) {
                        e.currentTarget.style.color = colors.activeText;
                    } else if (colors.hoverText) {
                        e.currentTarget.style.color = colors.hoverText;
                    }
                }
            }}
            onMouseLeave={(e) => {
                // Only apply background for button styles
                if (buttonStyle === 'button' || buttonStyle === 'text-only') {
                    if (isInWishlist) {
                        // Use saved state colors
                        const savedSettings = savedProductPage;
                        // Fallback to add state settings if saved settings are not available
                        const settings = (savedSettings && Object.keys(savedSettings).length > 0) 
                            ? savedSettings 
                            : productPage;
                        
                        if (settings.backgroundColor) {
                            applyBackgroundToStyles(e.currentTarget.style, settings.backgroundColor);
                        } else if (colors.activeBackground) {
                            applyBackgroundToStyles(e.currentTarget.style, colors.activeBackground);
                        }
                        if (settings.buttonTextColor) {
                            e.currentTarget.style.color = settings.buttonTextColor;
                        } else if (colors.activeText) {
                            e.currentTarget.style.color = colors.activeText;
                        }
                    } else {
                        // Use add state colors
                        const settings = productPage;
                        if (settings.backgroundColor) {
                            applyBackgroundToStyles(e.currentTarget.style, settings.backgroundColor);
                        } else if (colors.background) {
                            applyBackgroundToStyles(e.currentTarget.style, colors.background);
                        }
                        if (settings.buttonTextColor) {
                            e.currentTarget.style.color = settings.buttonTextColor;
                        } else if (colors.text) {
                            e.currentTarget.style.color = colors.text;
                        }
                    }
                } else {
                    // For text-icon-link and icon-only, only reset text/icon color
                    const settings = isInWishlist ? savedProductPage : productPage;
                    if (settings.buttonTextColor) {
                        e.currentTarget.style.color = settings.buttonTextColor;
                    } else if (isInWishlist && colors.activeText) {
                        e.currentTarget.style.color = colors.activeText;
                    } else if (colors.text) {
                        e.currentTarget.style.color = colors.text;
                    }
                }
            }}
            onFocus={(e) => {
                if (colors.focusBorder) {
                    e.currentTarget.style.borderColor = colors.focusBorder;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.focusBorder}33`;
                }
            }}
            onBlur={(e) => {
                if (isInWishlist && colors.activeBorder) {
                    e.currentTarget.style.borderColor = colors.activeBorder;
                } else if (colors.border) {
                    e.currentTarget.style.borderColor = colors.border;
                }
                e.currentTarget.style.boxShadow = '';
            }}
        >
            {/* Conditionally render icon based on buttonStyle */}
            {(buttonStyle !== 'text-only' && buttonStyle !== 'text-only-link') && (
                isAdding ? (
                    (() => {
                        const currentIcon = isInWishlist ? savedWishlistIcon : addToWishlistIcon;
                        const settings = productPage;
                        const iconSize = settings.iconSize || '1.125rem';
                        if (currentIcon.type === 'custom' && currentIcon.customUrl) {
                            return (
                                <img
                                    src={currentIcon.customUrl}
                                    alt=""
                                    className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading"
                                    style={{ width: iconSize, height: iconSize }}
                                />
                            );
                        }
                        const iconValue = currentIcon.value || 'Heart';
                        const IconComponent = LucideIcons[iconValue] || Heart;
                        return <IconComponent className="wishcart-wishlist-button__icon wishcart-wishlist-button__icon--loading" style={{ width: iconSize, height: iconSize }} />;
                    })()
                ) : (
                    getIconComponent()
                )
            )}
            {/* Conditionally render text based on buttonStyle */}
            {(buttonStyle !== 'icon-only') && (
                <span className="wishcart-wishlist-button__label">{buttonLabel}</span>
            )}
            </button>
        </>
    );
};

export default WishlistButton;

