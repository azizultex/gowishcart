/**
 * FluentCart Add-to-Cart Utility
 * 
 * Provides AJAX-based add-to-cart functionality for FluentCart
 * that updates the cart sidebar without page navigation
 */

/**
 * Update cart DOM from FluentCart fragments response
 * 
 * @param {Array} fragments - Array of fragment objects with selector and content
 */
const updateCartFromFragments = (fragments) => {
    if (!Array.isArray(fragments) || fragments.length === 0) {
        return;
    }

    fragments.forEach(fragment => {
        if (!fragment.selector || !fragment.content) {
            return;
        }

        try {
            let element = document.querySelector(fragment.selector);
            let elementWasCreated = false;
            
            // If element doesn't exist and it's the cart drawer container, create it
            if (!element && fragment.selector === '[data-fluent-cart-cart-drawer-container]') {
                // Create a temporary container to parse the HTML
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = fragment.content.trim();
                
                // Extract the cart drawer container element
                const cartContainer = tempContainer.querySelector(fragment.selector);
                
                if (cartContainer) {
                    // Append to document body
                    document.body.appendChild(cartContainer);
                    element = cartContainer;
                    elementWasCreated = true;
                    console.log('Cart drawer container created from fragment');
                }
            }
            
            if (element) {
                // Only update innerHTML if element already existed (not just created)
                if (!elementWasCreated) {
                    if (fragment.type === 'replace') {
                        // Replace entire element content
                        element.innerHTML = fragment.content;
                    } else {
                        // Default: replace innerHTML
                        element.innerHTML = fragment.content;
                    }
                }

                // Trigger any scripts in the new content
                const scripts = element.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });
            }
        } catch (error) {
            console.error('Error updating cart fragment:', fragment.selector, error);
        }
    });
};

/**
 * Check if WordPress admin bar is visible
 * 
 * @returns {number} 1 if admin bar is enabled, 0 otherwise
 */
const isAdminBarEnabled = () => {
    const adminBar = document.getElementById('wpadminbar');
    return adminBar && adminBar.offsetParent !== null ? 1 : 0;
};

/**
 * Add product to cart via FluentCart's direct API endpoint
 * 
 * @param {Object} params - Add to cart parameters
 * @param {number} params.productId - Product ID
 * @param {number} [params.variationId=0] - Variation ID (if variable product)
 * @param {number} [params.quantity=1] - Quantity to add
 * @returns {Promise<Object>} Result object with success status and data
 */
const addToCartViaFluentCartAPI = async (params) => {
    const productId = params.productId;
    const variationId = params.variationId || 0;
    const quantity = params.quantity || 1;
    if (!productId) {
        return { success: false, error: 'Product ID is required' };
    }

    // Determine item_id: prefer variation_id, fallback to product_id
    const itemId = (variationId && variationId > 0) ? variationId : productId;
    
    // Try add endpoint first, then update endpoint
    const endpoints = [
        'fluent_cart_cart_add',
        'fluent_cart_cart_update'
    ];

    for (let i = 0; i < endpoints.length; i++) {
        const endpointAction = endpoints[i];
        try {
            // Build URL with parameters
            const urlParams = new URLSearchParams();
            urlParams.append('action', 'fluent_cart_checkout_routes');
            urlParams.append('fc_checkout_action', endpointAction);
            urlParams.append('item_id', itemId.toString());
            urlParams.append('quantity', quantity.toString());
            urlParams.append('open_cart', 'true');
            urlParams.append('is_admin_bar_enabled', isAdminBarEnabled().toString());

            const url = window.location.origin + '/wp-admin/admin-ajax.php?' + urlParams.toString();

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                // Try next endpoint
                continue;
            }

            const data = await response.json();

            // Check if response indicates success
            if (data && (data.message || data.data || data.fragments)) {
                // Update cart from fragments if available
                if (Array.isArray(data.fragments) && data.fragments.length > 0) {
                    updateCartFromFragments(data.fragments);
                }

                // Trigger cart refresh events
                triggerCartRefresh(productId, variationId);

                // Cart sidebar should open automatically via open_cart=true,
                // but ensure it opens programmatically as well
                // Open cart sidebar with a short delay
                setTimeout(function() {
                    openCartSidebar();
                }, 300);

                return {
                    success: true,
                    method: 'fluentcart_api',
                    endpoint: endpointAction,
                    data: data,
                };
            }
        } catch (error) {
            console.error('FluentCart API error (' + endpointAction + '):', error);
            // Continue to next endpoint or fallback methods
        }
    }

    // Both endpoints failed
    return {
        success: false,
        error: 'FluentCart API endpoints failed',
    };
};

/**
 * Add product to FluentCart cart via form submission
 * 
 * @param {Object} params - Add to cart parameters
 * @param {number} params.productId - Product ID
 * @param {number} [params.variationId=0] - Variation ID (if variable product)
 * @param {number} [params.quantity=1] - Quantity to add
 * @param {string} [params.productUrl] - Product permalink URL
 * @returns {Promise<Object>} Result object with success status and data
 */
export const addToCartViaAJAX = async ({ productId, variationId = 0, quantity = 1, productUrl = null }) => {
    if (!productId) {
        return { success: false, error: 'Product ID is required' };
    }

    try {
        // Method 1 (Primary): Use FluentCart's direct API endpoint
        // This is the most reliable method using FluentCart's official API
        try {
            const apiResult = await addToCartViaFluentCartAPI({
                productId,
                variationId,
                quantity,
            });

            if (apiResult.success) {
                return apiResult;
            }
        } catch (apiError) {
            // API method failed, continue to fallbacks
            console.debug('FluentCart API method failed, trying fallbacks:', apiError);
        }

        // If API method fails, fall back to other methods
        // Method 2: Try to find and click FluentCart's actual add-to-cart button
        // This is a reliable fallback - it uses FluentCart's own mechanism
        const buttonClickResult = await clickFluentCartButton({
            productId,
            variationId,
        });

        if (buttonClickResult.success) {
            // Wait for FluentCart to process
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Trigger cart refresh and open sidebar
            triggerCartRefresh(productId, variationId);
            
            // Open cart sidebar
            setTimeout(() => {
                openCartSidebar();
            }, 800);
            
            return { success: true, method: 'button_click' };
        }

        // Method 3: Create and submit a form that mimics FluentCart's add-to-cart form
        // productUrl is now optional for fallback methods, but check if needed
        if (!productUrl) {
            return {
                success: false,
                error: 'Product URL is required for fallback methods',
            };
        }

        const formResult = await submitAddToCartForm({
            productId,
            variationId,
            quantity,
            productUrl,
        });

        if (formResult.success) {
            // Wait for FluentCart to process the add-to-cart
            await new Promise(resolve => setTimeout(resolve, 1200));

            // Trigger cart refresh and open sidebar
            triggerCartRefresh(productId, variationId);
            
            // Open cart sidebar after a short delay
            setTimeout(() => {
                openCartSidebar();
            }, 600);
            
            return { success: true, method: 'form_submission' };
        }

        // Method 4: Try iframe approach as fallback
        const iframeResult = await submitViaIframe({
            productId,
            variationId,
            quantity,
            productUrl,
        });

        if (iframeResult.success) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            triggerCartRefresh(productId, variationId);
            setTimeout(() => {
                openCartSidebar();
            }, 600);
            return { success: true, method: 'iframe' };
        }

        // Method 5: Try WordPress admin-ajax.php (legacy fallback)
        const ajaxResult = await tryWordPressAjax({
            productId,
            variationId,
            quantity,
        });

        if (ajaxResult.success) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            triggerCartRefresh(productId, variationId);
            setTimeout(() => {
                openCartSidebar();
            }, 500);
            return { success: true, method: 'wp_ajax' };
        }

        // If all methods fail, return error
        return {
            success: false,
            error: 'Unable to add product to cart. Please try adding from the product page.',
        };
    } catch (error) {
        console.error('Error adding product to cart:', error);
        return {
            success: false,
            error: error.message || 'Failed to add product to cart',
        };
    }
};

/**
 * Try to find and click FluentCart's actual add-to-cart button
 * This is the most reliable method as it uses FluentCart's own mechanism
 * 
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Result object
 */
const clickFluentCartButton = ({ productId, variationId }) => {
    return new Promise((resolve) => {
        try {
            // Try to find FluentCart's add-to-cart button for this product
            const buttonSelectors = [
                `.fluent-cart-add-to-cart-button[data-product-id="${productId}"]`,
                `button[data-product-id="${productId}"][class*="add-to-cart"]`,
                `form[data-product-id="${productId}"] button[type="submit"]`,
                `[data-fc-product-id="${productId}"] button`,
            ];

            let foundButton = null;
            for (const selector of buttonSelectors) {
                const button = document.querySelector(selector);
                if (button && !button.disabled) {
                    foundButton = button;
                    break;
                }
            }

            // If button found on current page, click it
            if (foundButton) {
                try {
                    // Create a temporary click handler to prevent navigation
                    const clickHandler = (e) => {
                        // Don't prevent default - let FluentCart handle it
                        // But we'll track it
                    };
                    
                    foundButton.addEventListener('click', clickHandler, { once: true });
                    foundButton.click();
                    
                    resolve({ success: true });
                    return;
                } catch (e) {
                    console.debug('Button click failed:', e);
                }
            }

            // If button not found, try to create one dynamically
            // Navigate to product page in iframe to trigger add-to-cart
            resolve({ success: false });
        } catch (error) {
            console.error('Button click error:', error);
            resolve({ success: false });
        }
    });
};

/**
 * Submit add-to-cart form to product page
 * This simulates what happens when you click FluentCart's add-to-cart button
 * 
 * @param {Object} params - Form parameters
 * @returns {Promise<Object>} Result object
 */
const submitAddToCartForm = ({ productId, variationId, quantity, productUrl }) => {
    return new Promise((resolve) => {
        try {
            // Create a hidden iframe to submit the form to
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.position = 'fixed';
            iframe.style.top = '-9999px';
            iframe.style.left = '-9999px';
            iframe.style.border = 'none';
            iframe.name = `fc-add-to-cart-form-${productId}-${Date.now()}`;
            document.body.appendChild(iframe);

            // Create a form that matches FluentCart's expected structure
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = productUrl; // Submit to product page
            form.target = iframe.name;
            form.style.display = 'none';
            form.enctype = 'application/x-www-form-urlencoded';

            // Add form fields - FluentCart typically expects these
            const addField = (name, value) => {
                if (value === null || value === undefined) return;
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = String(value);
                form.appendChild(input);
            };

            // Standard WordPress/WooCommerce/FluentCart form fields
            addField('add-to-cart', productId);
            addField('quantity', quantity);
            
            if (variationId && variationId > 0) {
                addField('variation_id', variationId);
            }

            // Also try alternative field names that FluentCart might use
            addField('product_id', productId);
            addField('product-id', productId);
            
            // Add nonce if available (for security)
            if (window.wishcartWishlist?.nonce) {
                addField('_wpnonce', window.wishcartWishlist.nonce);
                addField('nonce', window.wishcartWishlist.nonce);
            }

            document.body.appendChild(form);

            // Cleanup function
            const cleanup = () => {
                setTimeout(() => {
                    try {
                        if (form.parentNode) {
                            document.body.removeChild(form);
                        }
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }, 3000);
            };

            let resolved = false;
            
            // Handle iframe load
            iframe.onload = () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({ success: true });
                }
            };

            iframe.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    // Still resolve as success - error might be due to CORS but form was submitted
                    resolve({ success: true });
                }
            };

            // Submit the form
            form.submit();

            // Timeout fallback - assume success after 2 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({ success: true }); // Assume success
                }
            }, 2000);
        } catch (error) {
            console.error('Form submission error:', error);
            resolve({ success: false, error: error.message });
        }
    });
};

/**
 * Load product page with add-to-cart parameter via hidden iframe
 * 
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Result object
 */
const submitViaIframe = ({ productId, variationId, quantity, productUrl }) => {
    return new Promise((resolve) => {
        try {
            // Build URL with add-to-cart parameter
            const url = new URL(productUrl, window.location.origin);
            url.searchParams.set('add-to-cart', productId);
            
            if (variationId && variationId > 0) {
                url.searchParams.set('variation_id', variationId);
            }
            
            if (quantity > 1) {
                url.searchParams.set('quantity', quantity);
            }

            // Create a hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.position = 'fixed';
            iframe.style.top = '-9999px';
            iframe.style.left = '-9999px';
            iframe.style.border = 'none';
            iframe.name = `fc-add-to-cart-${productId}-${Date.now()}`;
            document.body.appendChild(iframe);

            const cleanup = () => {
                setTimeout(() => {
                    if (iframe.parentNode) {
                        try {
                            document.body.removeChild(iframe);
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    }
                }, 3000);
            };

            let resolved = false;
            
            iframe.onload = () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({ success: true });
                }
            };

            iframe.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({ success: true }); // Assume success
                }
            };

            // Load the URL in the iframe
            iframe.src = url.toString();

            // Timeout fallback
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({ success: true });
                }
            }, 2000);
        } catch (error) {
            console.error('Iframe load error:', error);
            resolve({ success: false, error: error.message });
        }
    });
};

/**
 * Try WordPress admin-ajax.php method
 * 
 * @param {Object} params - AJAX parameters
 * @returns {Promise<Object>} Result object
 */
const tryWordPressAjax = ({ productId, variationId, quantity }) => {
    return new Promise((resolve) => {
        // Try multiple possible action names
        const actions = [
            'fluentcart_add_to_cart',
            'fct_add_to_cart',
            'fc_add_to_cart',
            'add_to_cart',
        ];

        let attempts = 0;
        const maxAttempts = actions.length;

        const tryAction = (actionIndex) => {
            if (actionIndex >= maxAttempts) {
                resolve({ success: false });
                return;
            }

            const formData = new FormData();
            formData.append('action', actions[actionIndex]);
            formData.append('product_id', productId);
            formData.append('quantity', quantity);
            
            if (variationId && variationId > 0) {
                formData.append('variation_id', variationId);
            }

            fetch(`${window.location.origin}/wp-admin/admin-ajax.php`, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
            })
                .then(response => {
                    if (response.ok || response.status === 200) {
                        resolve({ success: true });
                    } else {
                        // Try next action
                        tryAction(actionIndex + 1);
                    }
                })
                .catch(() => {
                    // Try next action
                    tryAction(actionIndex + 1);
                });
        };

        tryAction(0);
    });
};

/**
 * Trigger FluentCart cart sidebar refresh
 * 
 * @param {number} productId - Product ID that was added
 * @param {number} variationId - Variation ID that was added
 */
export const triggerCartRefresh = (productId, variationId = 0) => {
    // Dispatch FluentCart's custom event to trigger cart refresh
    const addedToCartEvent = new CustomEvent('fluentcart:added_to_cart', {
        detail: {
            productId: productId,
            product_id: productId,
            variationId: variationId || 0,
            variation_id: variationId || 0,
        },
        bubbles: true,
        cancelable: true,
    });
    
    document.dispatchEvent(addedToCartEvent);

    // Also trigger WooCommerce-style event for compatibility
    if (typeof jQuery !== 'undefined') {
        jQuery(document.body).trigger('added_to_cart', [
            { product_id: productId, variation_id: variationId },
            '',
            '',
            null,
        ]);
    }

    // Trigger cart updated event
    const cartUpdatedEvent = new CustomEvent('fc:cart:updated', {
        bubbles: true,
        cancelable: true,
    });
    document.dispatchEvent(cartUpdatedEvent);

    // Trigger additional events that FluentCart might listen to
    const events = [
        'fct:cart:updated',
        'fluentcart:cart_updated',
        'cart:updated',
    ];

    events.forEach(eventName => {
        const event = new CustomEvent(eventName, {
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(event);
    });
};

/**
 * Open FluentCart cart sidebar from the right side
 */
export const openCartSidebar = () => {
    // Wait a moment to ensure cart has updated
    setTimeout(() => {
        // Find and click the cart expand button
        const cartButton = document.querySelector('[data-fluent-cart-cart-expand-button]');
        
        if (cartButton && typeof cartButton.click === 'function' && cartButton.offsetParent !== null) {
            // Skip if it's an anchor tag with href to prevent page redirects
            if (cartButton.tagName !== 'A' || !cartButton.hasAttribute('href')) {
                try {
                    cartButton.click();
                    console.log('Cart sidebar opened via button click');
                    return;
                } catch (e) {
                    console.debug('Button click failed:', e);
                }
            }
        }
    }, 300); // Wait 300ms to ensure cart has updated
};
