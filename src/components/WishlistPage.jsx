import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Trash2, ShoppingCart, Check, X, Twitter, Mail, MessageCircle, Link2, Lock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import CustomSelect from './ui/CustomSelect';
import VariantSelector from './VariantSelector';
import { cn } from '../lib/utils';
import { addToCartViaAJAX, openCartSidebar } from '../lib/fluentcartCart';
import '../styles/WishlistPage.scss';
import '../styles/ShareModal.scss';

const SuccessModal = ({ isOpen, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="share-modal-header">
                    <h2>Success</h2>
                    <button className="close-button" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="share-modal-body">
                    <p>{message}</p>
                </div>
            </div>
        </div>
    );
};

const WishlistPage = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [removingIds, setRemovingIds] = useState(new Set());
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [addingToCartIds, setAddingToCartIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [wishlists, setWishlists] = useState([]);
    const [currentWishlist, setCurrentWishlist] = useState(null);
    const [isLoadingWishlists, setIsLoadingWishlists] = useState(false);
    const [error, setError] = useState(null);
    const [cartMessage, setCartMessage] = useState({ type: null, text: '' });
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedVariants, setSelectedVariants] = useState(new Map()); // Map of productId -> variantId
    
    // Track if wishlist has been loaded to prevent infinite loops
    const hasLoadedRef = useRef(false);
    const loadedWishlistIdRef = useRef(null);
    const currentWishlistRef = useRef(null);
    const loadWishlistRef = useRef(null);
    const productsRef = useRef([]);
    const isLoadingRef = useRef(false);

    // Get session ID from cookie
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

        return null;
    };

    // Load wishlists
    useEffect(() => {
        const loadWishlists = async () => {
            if (!window.wishcartWishlist) {
                return;
            }

            // Load user's default wishlist (free version supports single wishlist only)
            setIsLoadingWishlists(true);
            try {
                const sessionId = getSessionId();
                const url = `${window.wishcartWishlist.apiUrl}wishlist${sessionId ? `?session_id=${sessionId}` : ''}`;
                const response = await fetch(url, {
                    headers: {
                        'X-WP-Nonce': window.wishcartWishlist.nonce,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.wishlist) {
                        setCurrentWishlist(data.wishlist);
                        setWishlists([data.wishlist]); // Single wishlist in free version
                    }
                }
            } catch (error) {
                console.error('Error loading wishlist:', error);
            } finally {
                setIsLoadingWishlists(false);
            }
        };

        loadWishlists();
    }, []);

    // Shared helper to load wishlist products
    const loadWishlist = useCallback(
        async (wishlistOverride = null, { forceReload = false } = {}) => {
            if (!window.wishcartWishlist) {
                setIsLoading(false);
                return;
            }

            const activeWishlist = wishlistOverride || currentWishlist;

            // If no current wishlist but we have wishlists, wait for wishlists to load
            if (!activeWishlist && wishlists.length === 0 && isLoadingWishlists) {
                return;
            }

            // If no wishlists exist, try to load using old method for backward compatibility
            if (!activeWishlist && wishlists.length === 0) {
                setIsLoading(true);
                try {
                    const sessionId = getSessionId();
                    
                    // Debug logging
                    console.log('[WishCart] Loading wishlist (no wishlists exist):', {
                        sessionId: sessionId ? 'present' : 'none',
                        isLoggedIn: window.wishcartWishlist?.isLoggedIn || false
                    });
                    
                    const url = `${window.wishcartWishlist.apiUrl}wishlist${sessionId ? `?session_id=${sessionId}` : ''}`;
                    
                    const response = await fetch(url, {
                        headers: {
                            'X-WP-Nonce': window.wishcartWishlist.nonce,
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        
                        // Debug logging
                        console.log('[WishCart] Wishlist loaded (no wishlists exist):', {
                            productCount: data.products?.length || 0,
                            wishlistId: data.wishlist?.id || 'default',
                            wishlistName: data.wishlist?.name || 'default',
                            products: data.products?.map(p => ({
                                id: p.id,
                                variationId: p.variation_id,
                                name: p.name
                            })) || []
                        });
                        
                        setProducts(data.products || []);
                        if (data.wishlist) {
                            setCurrentWishlist(data.wishlist);
                            loadedWishlistIdRef.current = data.wishlist.id || data.wishlist.share_code;
                        }
                        hasLoadedRef.current = true;
                    }
                } catch (error) {
                    console.error('Error loading wishlist:', error);
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            if (!activeWishlist) {
                setIsLoading(false);
                return;
            }

            // Check if wishlist ID has changed - if not, skip API call unless forced
            const currentWishlistId = activeWishlist.id || activeWishlist.share_code;
            if (!forceReload && hasLoadedRef.current && loadedWishlistIdRef.current === currentWishlistId) {
                return;
            }

            setIsLoading(true);
            try {
                const sessionId = getSessionId();
                let url = `${window.wishcartWishlist.apiUrl}wishlist`;
                const params = new URLSearchParams();
                
                // Use wishlist_id or session_id
                if (activeWishlist.id) {
                    params.append('wishlist_id', activeWishlist.id);
                } else if (sessionId) {
                    params.append('session_id', sessionId);
                }
                
                if (params.toString()) {
                    url += `?${params.toString()}`;
                }
                
                const response = await fetch(url, {
                    headers: {
                        'X-WP-Nonce': window.wishcartWishlist.nonce,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Debug logging
                    const sessionId = getSessionId();
                    console.log('[WishCart] Wishlist loaded:', {
                        wishlistId: data.wishlist?.id || currentWishlistId,
                        wishlistName: data.wishlist?.name || 'default',
                        productCount: data.products?.length || 0,
                        sessionId: sessionId ? 'present' : 'none',
                        isLoggedIn: window.wishcartWishlist?.isLoggedIn || false,
                        products: data.products?.map(p => ({
                            id: p.id,
                            variationId: p.variation_id,
                            name: p.name
                        })) || []
                    });
                    
                    setProducts(data.products || []);
                    if (data.wishlist) {
                        // Only update currentWishlist if the wishlist ID actually changed
                        const newWishlistId = data.wishlist.id || data.wishlist.share_code;
                        if (newWishlistId !== currentWishlistId) {
                            setCurrentWishlist(data.wishlist);
                            loadedWishlistIdRef.current = newWishlistId;
                        } else {
                            // Same wishlist, just update the ref to mark as loaded
                            loadedWishlistIdRef.current = newWishlistId;
                        }
                    } else {
                        // No wishlist info returned; still mark as loaded for this ID
                        loadedWishlistIdRef.current = currentWishlistId;
                    }
                    hasLoadedRef.current = true;
                }
            } catch (error) {
                console.error('Error loading wishlist:', error);
            } finally {
                setIsLoading(false);
            }
        },
        [currentWishlist, wishlists, isLoadingWishlists]
    );

    // Load wishlist products on relevant state changes
    useEffect(() => {
        loadWishlist();
    }, [loadWishlist]);

    // Update refs when state changes
    useEffect(() => {
        currentWishlistRef.current = currentWishlist;
    }, [currentWishlist]);

    useEffect(() => {
        loadWishlistRef.current = loadWishlist;
    }, [loadWishlist]);

    useEffect(() => {
        productsRef.current = products;
    }, [products]);

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    // Initialize selectedVariants Map when products load
    useEffect(() => {
        if (products && products.length > 0) {
            // Create a fresh Map each time products load
            const newVariants = new Map();
            
            // Initialize all products with their saved variant IDs
            products.forEach(product => {
                const uniqueKey = getUniqueItemKey(product);
                // Use explicit null/undefined check instead of truthy check
                // This ensures variation_id = 0 is properly initialized
                if (product.variation_id !== null && product.variation_id !== undefined) {
                    newVariants.set(uniqueKey, product.variation_id);
                }
            });
            
            setSelectedVariants(newVariants);
        }
    }, [products]);

    // Listen for wishlist item added/removed events to refresh the page
    useEffect(() => {
        const handleItemAdded = (event) => {
            const { productId, variationId, wishlistId } = event.detail || {};
            const currentWishlist = currentWishlistRef.current;
            const loadWishlist = loadWishlistRef.current;
            
            // Debug logging
            console.log('[WishCart] Item added event received:', {
                productId,
                variationId,
                wishlistId,
                currentWishlistId: currentWishlist?.id,
                currentWishlistName: currentWishlist?.name,
                sessionId: getSessionId() ? 'present' : 'none',
                isLoggedIn: window.wishcartWishlist?.isLoggedIn || false
            });
            
            // Always refresh when item is added (items might be added to default wishlist)
            // Use a small delay to ensure the database has been updated
            console.log('[WishCart] Refreshing wishlist after item added');
            setTimeout(() => {
                if (loadWishlist) {
                    loadWishlist(null, { forceReload: true });
                }
            }, 300);
        };

        const handleItemRemoved = (event) => {
            const { productId, variationId } = event.detail || {};
            const loadWishlist = loadWishlistRef.current;
            
            // Debug logging
            console.log('[WishCart] Item removed event received:', {
                productId,
                variationId,
                currentWishlistId: currentWishlistRef.current?.id
            });
            
            // Always refresh when item is removed
            console.log('[WishCart] Refreshing wishlist after item removed');
            setTimeout(() => {
                if (loadWishlist) {
                    loadWishlist(null, { forceReload: true });
                }
            }, 300);
        };

        window.addEventListener('wishcart:item-added', handleItemAdded);
        window.addEventListener('wishcart:item-removed', handleItemRemoved);

        // Fallback: Refresh when page becomes visible (user might have added items in another tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const loadWishlist = loadWishlistRef.current;
                if (loadWishlist) {
                    console.log('[WishCart] Page became visible, refreshing wishlist as fallback');
                    // loadWishlist(null, { forceReload: true });
                }
            }
        };

        // Fallback: Periodic refresh check (every 5 seconds) if no items are showing
        const fallbackInterval = setInterval(() => {
            const loadWishlist = loadWishlistRef.current;
            const currentWishlist = currentWishlistRef.current;
            
            // Only run fallback if we have a wishlist but no products
            if (loadWishlist && currentWishlist && products.length === 0 && !isLoading) {
                console.log('[WishCart] Fallback: No products found, refreshing wishlist');
                loadWishlist(null, { forceReload: true });
            }
        }, 5000); // Check every 5 seconds

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('wishcart:item-added', handleItemAdded);
        window.addEventListener('wishcart:item-removed', handleItemRemoved);

        return () => {
            clearInterval(fallbackInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('wishcart:item-added', handleItemAdded);
            window.removeEventListener('wishcart:item-removed', handleItemRemoved);
        };
    }, []); // Empty dependencies - use refs instead

    // Remove product from wishlist
    const removeProduct = async (productId, variationId = null) => {
        if (removingIds.has(productId) || !window.wishcartWishlist) {
            return;
        }

        setRemovingIds(prev => new Set(prev).add(productId));

        try {
            const sessionId = getSessionId();
            const url = `${window.wishcartWishlist.apiUrl}wishlist/remove`;
            
            // Get variation_id from product if not provided
            const product = products.find(p => p.id === productId);
            const finalVariationId = variationId !== null ? variationId : (product?.variation_id || 0);
            
            const body = {
                product_id: productId,
                variation_id: finalVariationId,
                session_id: sessionId,
            };
            
            if (currentWishlist && currentWishlist.id) {
                body.wishlist_id = currentWishlist.id;
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                // Remove the specific product variant from the list
                setProducts(prev => prev.filter(p => !(p.id === productId && (p.variation_id || 0) === finalVariationId)));
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(productId);
                    return next;
                });
            } else {
                const error = await response.json();
                console.error('Error removing product:', error);
                alert('Failed to remove product from wishlist');
            }
        } catch (error) {
            console.error('Error removing product:', error);
            alert('Failed to remove product from wishlist');
        } finally {
            setRemovingIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    // Remove multiple products
    const removeSelectedProducts = async () => {
        if (selectedIds.size === 0) {
            return;
        }

        const idsToRemove = Array.from(selectedIds);
        for (const productId of idsToRemove) {
            await removeProduct(productId);
        }
        setSelectedIds(new Set());
        setBulkAction('');
    };

    // Helper function to get unique key for each wishlist item
    // Uses combination of product ID and variation ID to ensure independence
    const getUniqueItemKey = (product) => {
        return `${product.id}-${product.variation_id || 0}`;
    };

    // Handle variant selection change
    const handleVariantChange = (product, variantId, variant) => {
        setSelectedVariants(prev => {
            const next = new Map(prev);
            const uniqueKey = getUniqueItemKey(product);
            next.set(uniqueKey, variantId);
            return next;
        });
    };

    // Helper function to get the display price for a product based on selected variant
    const getDisplayPrice = (product) => {
        // Check if a variant is selected in the dropdown using unique key
        const uniqueKey = getUniqueItemKey(product);
        const selectedVariantId = selectedVariants.get(uniqueKey);
        
        // If there's a selected variant and the product has variants array
        if (selectedVariantId && product.variants && product.variants.length > 0) {
            // Find the selected variant in the variants array
            const selectedVariant = product.variants.find(v => 
                (v.id || v.variation_id || v.ID) == selectedVariantId
            );
            
            if (selectedVariant) {
                // Extract price from the variant (handle both FluentCart and WooCommerce formats)
                const price = selectedVariant.price || 
                    (selectedVariant.item_price ? selectedVariant.item_price / 100 : null) || 
                    0;
                const regularPrice = selectedVariant.regular_price || 
                    (selectedVariant.compare_price ? selectedVariant.compare_price / 100 : null);
                const salePrice = selectedVariant.sale_price || price;
                const isOnSale = regularPrice && regularPrice > price;
                
                return {
                    price: price,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    is_on_sale: isOnSale
                };
            }
        }
        
        // Fall back to the product's saved price if no variant is selected or found
        return {
            price: product.price,
            regular_price: product.regular_price,
            sale_price: product.sale_price,
            is_on_sale: product.is_on_sale
        };
    };

    // Add product to cart
    const addToCart = async (product) => {
        if (!product) {
            console.error('Product not found');
            setCartMessage({ type: 'error', text: 'Product not found' });
            return;
        }

        // Get unique key for this specific variant
        const uniqueKey = getUniqueItemKey(product);
        
        if (addingToCartIds.has(uniqueKey) || !window.wishcartWishlist) {
            return;
        }

        setAddingToCartIds(prev => new Set(prev).add(uniqueKey));
        setCartMessage({ type: null, text: '' });

        try {
            // Get selected variant or use product's variation_id using unique key
            let selectedVariantId = selectedVariants.get(uniqueKey) || product.variation_id || 0;

            // For simple products with exactly 1 variant, use that variant's ID
            if (product.variants && product.variants.length === 1 && !selectedVariantId) {
                selectedVariantId = product.variants[0].id || product.variants[0].variation_id || 0;
            }

            // Track the add to cart event (non-blocking)
            const sessionId = getSessionId();
            const trackUrl = `${window.wishcartWishlist.apiUrl}wishlist/track-cart`;
            
            const trackBody = {
                product_id: product.id,
                variation_id: selectedVariantId,
                session_id: sessionId,
            };
            
            // Track in background (don't wait for it)
            fetch(trackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
                body: JSON.stringify(trackBody),
            }).catch(trackError => {
                console.error('Error tracking cart event:', trackError);
            });

            // Add to cart via AJAX
            const result = await addToCartViaAJAX({
                productId: product.id,
                variationId: selectedVariantId,
                quantity: 1,
                productUrl: product.permalink,
            });

            if (result.success) {
                // Show success message
                setCartMessage({
                    type: 'success',
                    text: `${product.name} added to cart successfully!`,
                });

                // Clear message after 3 seconds
                setTimeout(() => {
                    setCartMessage({ type: null, text: '' });
                }, 3000);
            } else {
                // If AJAX fails, fallback to navigation
                console.warn('AJAX add to cart failed, redirecting to product page:', result.error);
                setCartMessage({
                    type: 'info',
                    text: 'Redirecting to product page...',
                });
                
                // Small delay before redirect to show message
                setTimeout(() => {
                    window.location.href = product.permalink || '#';
                }, 500);
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            setCartMessage({
                type: 'error',
                text: 'Failed to add product to cart. Please try again.',
            });

            // Clear error message after 5 seconds
            setTimeout(() => {
                setCartMessage({ type: null, text: '' });
            }, 5000);
        } finally {
            setAddingToCartIds(prev => {
                const next = new Set(prev);
                next.delete(uniqueKey);
                return next;
            });
        }
    };

    // Add selected products to cart
    const addSelectedToCart = async () => {
        if (selectedIds.size === 0) {
            return;
        }

        const selectedProducts = products.filter(p => selectedIds.has(p.id));
        if (selectedProducts.length === 0) {
            return;
        }

        setCartMessage({ type: null, text: '' });

        // Add products one by one via AJAX
        let successCount = 0;
        let failCount = 0;

        for (const product of selectedProducts) {
            // Get unique key for this specific variant
            const uniqueKey = getUniqueItemKey(product);
            
            if (addingToCartIds.has(uniqueKey)) {
                continue; // Skip if already adding
            }

            setAddingToCartIds(prev => new Set(prev).add(uniqueKey));

            try {
                // Get selected variant or use product's variation_id using unique key
                let selectedVariantId = selectedVariants.get(uniqueKey) || product.variation_id || 0;

                // For simple products with exactly 1 variant, use that variant's ID
                if (product.variants && product.variants.length === 1 && !selectedVariantId) {
                    selectedVariantId = product.variants[0].id || product.variants[0].variation_id || 0;
                }

                // Track the add to cart event (non-blocking)
                const sessionId = getSessionId();
                const trackUrl = `${window.wishcartWishlist.apiUrl}wishlist/track-cart`;
                
                fetch(trackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.wishcartWishlist.nonce,
                    },
                    body: JSON.stringify({
                        product_id: product.id,
                        variation_id: selectedVariantId,
                        session_id: sessionId,
                    }),
                }).catch(() => {});

                const result = await addToCartViaAJAX({
                    productId: product.id,
                    variationId: selectedVariantId,
                    quantity: 1,
                    productUrl: product.permalink,
                });

                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }

                // Small delay between additions to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`Error adding ${product.name} to cart:`, error);
                failCount++;
            } finally {
                setAddingToCartIds(prev => {
                    const next = new Set(prev);
                    next.delete(uniqueKey);
                    return next;
                });
            }
        }

        // Show result message
        if (successCount > 0 && failCount === 0) {
            setCartMessage({
                type: 'success',
                text: `Successfully added ${successCount} ${successCount === 1 ? 'item' : 'items'} to cart!`,
            });
        } else if (successCount > 0 && failCount > 0) {
            setCartMessage({
                type: 'warning',
                text: `Added ${successCount} ${successCount === 1 ? 'item' : 'items'} to cart. ${failCount} ${failCount === 1 ? 'item' : 'items'} failed.`,
            });
        } else {
            setCartMessage({
                type: 'error',
                text: 'Failed to add items to cart. Please try again.',
            });
        }

        // Clear message after 5 seconds
        setTimeout(() => {
            setCartMessage({ type: null, text: '' });
        }, 5000);
    };

    // Add all products to cart
    const addAllToCart = async () => {
        if (products.length === 0) {
            return;
        }

        setCartMessage({ type: null, text: '' });

        // Add all products via AJAX
        let successCount = 0;
        let failCount = 0;

        for (const product of products) {
            // Get unique key for this specific variant
            const uniqueKey = getUniqueItemKey(product);
            
            if (addingToCartIds.has(uniqueKey)) {
                continue; // Skip if already adding
            }

            setAddingToCartIds(prev => new Set(prev).add(uniqueKey));

            try {
                // Get selected variant or use product's variation_id using unique key
                let selectedVariantId = selectedVariants.get(uniqueKey) || product.variation_id || 0;

                // For simple products with exactly 1 variant, use that variant's ID
                if (product.variants && product.variants.length === 1 && !selectedVariantId) {
                    selectedVariantId = product.variants[0].id || product.variants[0].variation_id || 0;
                }

                // Track the add to cart event (non-blocking)
                const sessionId = getSessionId();
                const trackUrl = `${window.wishcartWishlist.apiUrl}wishlist/track-cart`;
                
                fetch(trackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.wishcartWishlist.nonce,
                    },
                    body: JSON.stringify({
                        product_id: product.id,
                        variation_id: selectedVariantId,
                        session_id: sessionId,
                    }),
                }).catch(() => {});

                const result = await addToCartViaAJAX({
                    productId: product.id,
                    variationId: selectedVariantId,
                    quantity: 1,
                    productUrl: product.permalink,
                });

                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }

                // Small delay between additions
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`Error adding ${product.name} to cart:`, error);
                failCount++;
            } finally {
                setAddingToCartIds(prev => {
                    const next = new Set(prev);
                    next.delete(uniqueKey);
                    return next;
                });
            }
        }

        // Show result message
        if (successCount > 0 && failCount === 0) {
            setCartMessage({
                type: 'success',
                text: `Successfully added all ${successCount} ${successCount === 1 ? 'item' : 'items'} to cart!`,
            });
        } else if (successCount > 0 && failCount > 0) {
            setCartMessage({
                type: 'warning',
                text: `Added ${successCount} ${successCount === 1 ? 'item' : 'items'} to cart. ${failCount} ${failCount === 1 ? 'item' : 'items'} failed.`,
            });
        } else {
            setCartMessage({
                type: 'error',
                text: 'Failed to add items to cart. Please try again.',
            });
        }

        // Clear message after 5 seconds
        setTimeout(() => {
            setCartMessage({ type: null, text: '' });
        }, 5000);
    };

    // Handle bulk action
    const handleBulkAction = () => {
        if (bulkAction === 'remove') {
            removeSelectedProducts();
        }
    };

    // Toggle select all
    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(products.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    // Toggle individual selection
    const toggleSelection = (productId, checked) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(productId);
            } else {
                next.delete(productId);
            }
            return next;
        });
    };

    // Format price
    const formatPrice = (price, regularPrice, isOnSale) => {
        if (!price && price !== 0) return '';
        
        const currency = 'USD'; // You might want to get this from settings
        const formattedPrice = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(price);

        if (isOnSale && regularPrice && regularPrice > price) {
            const formattedRegular = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
            }).format(regularPrice);
            
            return (
                <div className="flex flex-col">
                    <span className="price-current">{formattedPrice}</span>
                </div>
            );
        }

        return <span className="font-normal text-black">{formattedPrice}</span>;
    };

    // Get stock status icon
    const getStockStatusIcon = (status) => {
        if (status === 'In stock' || status === 'Available on backorder') {
            return <Check className="w-4 h-4 text-black" />;
        }
        return null;
    };

    // State for share link
    const [shareLink, setShareLink] = useState('');
    const [isGeneratingShare, setIsGeneratingShare] = useState(false);

    // Generate share link via API
    const generateShareLink = async () => {
        // If we don't have a valid wishlist, do not attempt to share
        if (!currentWishlist || !currentWishlist.id) {
            return null;
        }

        // Check privacy status - do not generate share link for private wishlists
        if (currentWishlist.privacy_status === 'private') {
            setSuccessMessage('This wishlist is private. Please change privacy to "Shared" to share it.');
            setIsSuccessModalOpen(true);
            return null;
        }

        // Check if we already have a share link
        if (shareLink) {
            return shareLink;
        }

        setIsGeneratingShare(true);
        try {
            const response = await fetch(`${window.wishcartWishlist.apiUrl}share/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wishcartWishlist.nonce,
                },
                body: JSON.stringify({
                    wishlist_id: currentWishlist.id,
                    share_type: 'link',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.share_url) {
                    setShareLink(data.share_url);
                    return data.share_url;
                } else {
                    // API returned success but no share_url
                    const errorMsg = data.message || 'Failed to generate share link. The response was invalid.';
                    setSuccessMessage(errorMsg);
                    setIsSuccessModalOpen(true);
                    return null;
                }
            } else {
                // Handle non-OK responses
                let errorMessage = 'Failed to create share link. Please try again.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (parseError) {
                    // If response is not JSON, use status text
                    errorMessage = `Failed to create share link (${response.status}). Please try again.`;
                }
                setSuccessMessage(errorMessage);
                setIsSuccessModalOpen(true);
                return null;
            }
        } catch (err) {
            console.error('Error generating share link:', err);
            setSuccessMessage('Network error. Failed to create share link. Please check your connection and try again.');
            setIsSuccessModalOpen(true);
            return null;
        } finally {
            setIsGeneratingShare(false);
        }
    };

    // Get wishlist share URL (async wrapper)
    const getWishlistShareUrl = async () => {
        return await generateShareLink();
    };

    // Get wishlist share text
    const getWishlistShareText = () => {
        return 'Check out my wishlist!';
    };
// Put this above the share handlers
const ensureWishlistShareAllowed = () => {
    if (!currentWishlist || currentWishlist.privacy_status === 'private') {
        setSuccessMessage('This wishlist is private. Please change privacy to "Shared" to share it.');
        setIsSuccessModalOpen(true);
        return false; // stop
    }
    return true; // ok to continue
};

    // Share on Facebook
const shareOnFacebook = async () => {
    if (!ensureWishlistShareAllowed()) return;

    const url = await getWishlistShareUrl();
    const encodedUrl = encodeURIComponent(url);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
};

// Share on Twitter
const shareOnTwitter = async () => {
    if (!ensureWishlistShareAllowed()) return;

    const url = await getWishlistShareUrl();
    const encodedUrl = encodeURIComponent(url);
    const text = encodeURIComponent(getWishlistShareText());
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
};

// Share on Pinterest
const shareOnPinterest = async () => {
    if (!ensureWishlistShareAllowed()) return;

    const url = await getWishlistShareUrl();
    const encodedUrl = encodeURIComponent(url);
    const description = encodeURIComponent(getWishlistShareText());
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${description}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
};

// Share on WhatsApp
const shareOnWhatsApp = async () => {
    if (!ensureWishlistShareAllowed()) return;

    const url = await getWishlistShareUrl();
    const text = encodeURIComponent(`${getWishlistShareText()} ${url}`);
    const shareUrl = `https://wa.me/?text=${text}`;
    window.open(shareUrl, '_blank');
};

// Share via Email
const shareViaEmail = async () => {
    if (!ensureWishlistShareAllowed()) return;

    const url = await getWishlistShareUrl();
    const subject = encodeURIComponent('My Wishlist');
    const body = encodeURIComponent(`${getWishlistShareText()}\n\n${url}`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
};

// Copy wishlist link
const copyWishlistLink = async () => {
    if (!ensureWishlistShareAllowed()) return;
    if (isGeneratingShare) return;

    try {
        const url = await getWishlistShareUrl();
        if (!url) {
            setSuccessMessage('Failed to generate share link. Please try again.');
            setIsSuccessModalOpen(true);
            return;
        }

        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setSuccessMessage('Share link copied to clipboard!');
        setIsSuccessModalOpen(true);
        setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
        console.error('Failed to copy link:', error);
        setSuccessMessage('Failed to copy link to clipboard. Please try again.');
        setIsSuccessModalOpen(true);
        
        // Fallback for older browsers or when clipboard API fails
        try {
            const url = await getWishlistShareUrl();
            if (url) {
                const textArea = document.createElement('textarea');
                textArea.value = url;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setLinkCopied(true);
                setSuccessMessage('Share link copied to clipboard!');
                setIsSuccessModalOpen(true);
                setTimeout(() => setLinkCopied(false), 2000);
            }
        } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError);
        }
    }
};

    // Handle wishlist selection
    const handleWishlistSelect = (wishlistId) => {
        const wishlist = wishlists.find(w => w.id.toString() === wishlistId.toString());
        if (wishlist) {
            // Reset refs when switching to a different wishlist
            const newWishlistId = wishlist.id || wishlist.share_code;
            if (loadedWishlistIdRef.current !== newWishlistId) {
                hasLoadedRef.current = false;
                loadedWishlistIdRef.current = null;
            }

            // Clear any existing selection when switching lists
            setSelectedIds(new Set());

            // Update current wishlist state
            setCurrentWishlist(wishlist);

            // Explicitly reload products for the newly selected wishlist
            loadWishlist(wishlist, { forceReload: true });
        }
    };

    if (isLoading) {
        return (
            <div className="wishcart-wishlist-page container mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Heart className="w-12 h-12 mx-auto mb-4 animate-pulse text-gray-400" />
                        <p className="text-gray-600">Loading wishlist...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if there's an error
    if (error) {
        return (
            <div className="wishcart-wishlist-page container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] py-12">
                        <Heart className="w-16 h-16 mb-4 text-red-300" />
                        <h1 className="text-2xl font-bold mb-2">Unable to load wishlist</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Button onClick={() => window.location.href = '/'}>
                            Go to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const allSelected = products.length > 0 && selectedIds.size === products.length;

    // Handle privacy change
    const handlePrivacyChange = async (newPrivacy) => {
        // Privacy options are a Pro feature - not available in free version
        return;
    };

    // Create new wishlist
    const createNewWishlist = async () => {
        if (!window.wishcartWishlist) {
            return;
        }

        const name = prompt('Enter wishlist name:', 'New Wishlist');
        if (!name) {
            return;
        }

        // Multiple wishlists is a Pro feature - not available in free version
        alert('Multiple wishlists is a Pro feature. Please upgrade to create multiple wishlists.');
    };

    return (
        <div className="wishcart-wishlist-page">
            <SuccessModal
                isOpen={isSuccessModalOpen}
                message={successMessage}
                onClose={() => setIsSuccessModalOpen(false)}
            />

            {/* Multiple Wishlists Selector - Pro Feature (removed from free version) */}
            
            {/* Privacy Control - Only Private in free version */}
            {currentWishlist && (
                <div className="wishlist-selector" style={{marginBottom: '16px'}}>
                    <div style={{position: 'relative'}}>
                        <CustomSelect
                            options={[
                                { value: 'private', label: '🔒 Private' },
                                { value: 'shared', label: '👥 Shared (PRO)', isDisabled: true }
                            ]}
                            value={{
                                value: 'private',
                                label: '🔒 Private'
                            }}
                            onChange={(selectedOption) => {
                                if (selectedOption && (selectedOption.value === 'shared' || selectedOption.value === 'public')) {
                                    // Show Pro feature message
                                    setSuccessMessage('Shared/Public privacy options are available in WishCart Pro. Please upgrade to use this feature.');
                                    setIsSuccessModalOpen(true);
                                    return; // Don't change the selection
                                }
                            }}
                            className="privacy-select-trigger"
                            isDisabled={false}
                        />
                    </div>
                </div>
            )}
            
            <div className="wishlist-header">
                <div className="wishlist-header-content">
                    <div>
                        <h1>Wishlist</h1>
                        <p>{products.length} {products.length === 1 ? 'item' : 'items'}</p>
                    </div>
                </div>
            </div>

            {/* Cart Message Feedback */}
            {cartMessage.type && cartMessage.text && (
                <div className={`cart-message cart-message-${cartMessage.type}`}>
                    <div className="cart-message-content">
                        {cartMessage.type === 'success' && <Check className="w-5 h-5" />}
                        {cartMessage.type === 'error' && <X className="w-5 h-5" />}
                        {cartMessage.type === 'warning' && <X className="w-5 h-5" />}
                        {cartMessage.type === 'info' && <ShoppingCart className="w-5 h-5" />}
                        <span>{cartMessage.text}</span>
                    </div>
                </div>
            )}

            {products.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] py-12">
                        <Heart className="w-16 h-16 mb-4 text-gray-300" />
                        <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
                        <p className="text-gray-600 mb-6">Start adding products to your wishlist!</p>
                        <Button onClick={() => window.location.href = '/'}>
                            Continue Shopping
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Bulk Actions Bar */}
                    <div className="bulk-actions-bar">
                            <div className="bulk-select">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={toggleSelectAll}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="bulk-actions-controls">
                                {selectedIds.size > 0 && (
                                    <span className="selected-count">
                                        {selectedIds.size} selected
                                    </span>
                                )}
                                <CustomSelect
                                    options={[
                                        { value: 'remove', label: 'Remove selected' }
                                    ]}
                                    value={bulkAction ? { value: bulkAction, label: 'Remove selected' } : null}
                                    onChange={(selectedOption) => setBulkAction(selectedOption ? selectedOption.value : '')}
                                    placeholder="Actions"
                                    className="actions-select"
                                    isClearable={true}
                                />
                                <Button
                                    onClick={handleBulkAction}
                                    disabled={!bulkAction || selectedIds.size === 0}
                                    variant="outline"
                                    size="sm"
                                >
                                    Apply
                                </Button>
                                <Button
                                    onClick={addAllToCart}
                                    disabled={products.length === 0}
                                    size="sm"
                                    className="bulk-add-to-cart"
                                >
                                    Add All To Cart
                                </Button>
                            </div>
                    </div>

                    {/* Product List - FluentCart Style */}
                    <div className="wishlist-items-container">
                        {products.map((product) => (
                            <div key={product.id} className="wishlist-item">
                                {/* Checkbox */}
                                <div className="item-checkbox">
                                    <Checkbox
                                        checked={selectedIds.has(product.id)}
                                        onCheckedChange={(checked) => toggleSelection(product.id, checked)}
                                    />
                                </div>

                                {/* Product Thumbnail */}
                                <div className="item-image">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} />
                                    ) : (
                                        <div className="image-placeholder">
                                            <ShoppingCart className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="item-info">
                                    <a href={product.permalink} className="item-name">
                                        {product.name}
                                    </a>
                                    {product.variation_id && product.variants && product.variants.length > 1 && (
                                        <div className="item-variant">
                                            {product.variation_name || 'Variant'}
                                        </div>
                                    )}
                                </div>

                                {/* Price */}
                                <div className="item-price">
                                    {(() => {
                                        const displayPrice = getDisplayPrice(product);
                                        return displayPrice.is_on_sale && displayPrice.regular_price ? (
                                            <>
                                                <span className="price-sale">${displayPrice.sale_price || displayPrice.price}</span>
                                            </>
                                        ) : (
                                            <span className="price-current">${displayPrice.price}</span>
                                        );
                                    })()}
                                </div>

                                {/* Variant Selector (if product has multiple variants) */}
                                {product.variants && product.variants.length > 1 && (
                                    <div className="item-variant-selector">
                                        <VariantSelector
                                            variants={product.variants}
                                            selectedVariantId={selectedVariants.get(getUniqueItemKey(product)) || product.variation_id || (product.variants[0]?.id || product.variants[0]?.variation_id || 0)}
                                            onVariantChange={(variantId, variant) => handleVariantChange(product, variantId, variant)}
                                            productId={product.id}
                                        />
                                    </div>
                                )}

                                {/* Add to Cart Button */}
                                <Button
                                    onClick={() => addToCart(product)}
                                    disabled={addingToCartIds.has(getUniqueItemKey(product))}
                                    className="item-add-to-cart"
                                    size="sm"
                                >
                                    {addingToCartIds.has(getUniqueItemKey(product)) ? 'Adding...' : 'Add To Cart'}
                                </Button>

                                {/* Remove Button */}
                                <button
                                    onClick={() => removeProduct(product.id)}
                                    disabled={removingIds.has(product.id)}
                                    className="item-remove"
                                    aria-label="Remove from wishlist"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Share Section - Pro Feature */}
                    <div className="share-section" style={{position: 'relative', opacity: 0.6, pointerEvents: 'none'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                            <span className="share-label">Wishlist Share on</span>
                            <span className="wishcart-badge wishcart-badge-warning" style={{fontSize: '10px', padding: '2px 6px'}}>PRO</span>
                        </div>
                        <div className="share-icons">
                            <button
                                onClick={() => {}}
                                className="share-icon"
                                aria-label="Share on Facebook (Pro Feature)"
                                title="Share on Facebook (Pro Feature)"
                                disabled={true}
                            >
                                <span className="share-icon-text">f</span>
                            </button>
                            <button
                                onClick={() => {}}
                                className="share-icon"
                                aria-label="Share on Twitter (Pro Feature)"
                                title="Share on Twitter (Pro Feature)"
                                disabled={true}
                            >
                                <Twitter className="share-icon-svg" />
                            </button>
                            <button
                                onClick={() => {}}
                                className="share-icon"
                                aria-label="Share on Pinterest (Pro Feature)"
                                title="Share on Pinterest (Pro Feature)"
                                disabled={true}
                            >
                                <span className="share-icon-text">P</span>
                            </button>
                            <button
                                onClick={() => {}}
                                className="share-icon"
                                aria-label="Share on WhatsApp (Pro Feature)"
                                title="Share on WhatsApp (Pro Feature)"
                                disabled={true}
                            >
                                <MessageCircle className="share-icon-svg" />
                            </button>
                            <button
                                onClick={() => {}}
                                className="share-icon"
                                aria-label="Copy link (Pro Feature)"
                                title="Copy link (Pro Feature)"
                                disabled={true}
                            >
                                <Link2 className="share-icon-svg" />
                            </button>
                            <button
                                onClick={() => {}}
                                className="share-icon"
                                aria-label="Share via Email (Pro Feature)"
                                title="Share via Email (Pro Feature)"
                                disabled={true}
                            >
                                <Mail className="share-icon-svg" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default WishlistPage;
