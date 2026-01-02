import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Twitter, Mail, MessageCircle, Link2, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
// Note: These should be available from free plugin or shared utilities
// import { addToCartViaAJAX, openCartSidebar } from '../lib/fluentcartCart';
// import VariantSelector from './VariantSelector';
import '../styles/SharedWishlistView.scss';

/**
 * SharedWishlistView Component (Pro Feature)
 * Displays a publicly shared wishlist for guests and logged-in users
 */
const SharedWishlistView = ({ shareToken }) => {
    const [wishlist, setWishlist] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addingToCartIds, setAddingToCartIds] = useState(new Set());
    const [selectedVariants, setSelectedVariants] = useState(new Map()); // Map of productId -> variantId

    const apiUrl = window.wishcartShared?.apiUrl || '/wp-json/wishcart/v1/';
    const siteUrl = window.wishcartShared?.siteUrl || '';
    const isUserLoggedIn = window.wishcartShared?.isUserLoggedIn || false;
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        fetchSharedWishlist();
    }, [shareToken]);

    // Helper function to get unique key for product variant tracking
    const getUniqueItemKey = (product) => {
        return `${product.id}-${product.variation_id || 0}`;
    };

    const fetchSharedWishlist = async () => {
        if (!shareToken) {
            setError('Invalid share link');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${apiUrl}share/${shareToken}/view`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setWishlist(data.wishlist);
                const fetchedProducts = data.products || [];
                setProducts(fetchedProducts);
                
                // Initialize selectedVariants Map when products load
                const newVariants = new Map();
                fetchedProducts.forEach(product => {
                    const uniqueKey = getUniqueItemKey(product);
                    if (product.variation_id) {
                        newVariants.set(uniqueKey, product.variation_id);
                    } else if (product.variants && product.variants.length > 0) {
                        // Default to first variant if no variation_id is set
                        const firstVariantId = product.variants[0].id || product.variants[0].variation_id || product.variants[0].ID || 0;
                        newVariants.set(uniqueKey, firstVariantId);
                    }
                });
                setSelectedVariants(newVariants);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to load wishlist');
            }
        } catch (err) {
            console.error('Error fetching shared wishlist:', err);
            setError('Unable to load wishlist. Please try again later.');
        } finally {
            setIsLoading(false);
        }
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

    const handleAddToCart = async (product) => {
        const uniqueKey = getUniqueItemKey(product);
        if (!product || addingToCartIds.has(uniqueKey)) {
            return;
        }

        setAddingToCartIds(prev => new Set(prev).add(uniqueKey));

        try {
            // Get selected variant or use product's variation_id using unique key
            let selectedVariantId = selectedVariants.get(uniqueKey) || product.variation_id || 0;

            // For simple products with exactly 1 variant, use that variant's ID
            if (product.variants && product.variants.length === 1 && !selectedVariantId) {
                selectedVariantId = product.variants[0].id || product.variants[0].variation_id || 0;
            }

            // Track the add to cart event for analytics (non-blocking)
            const trackUrl = `${apiUrl}wishlist/track-cart`;
            const trackBody = {
                product_id: product.id,
                variation_id: selectedVariantId,
            };
            
            fetch(trackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trackBody),
            }).catch(trackError => {
                console.error('Error tracking cart event:', trackError);
            });

            // Add to cart via AJAX (if available from free plugin)
            if (window.wishcartAddToCart && typeof window.wishcartAddToCart === 'function') {
                const result = await window.wishcartAddToCart({
                    productId: product.id,
                    variationId: selectedVariantId,
                    quantity: 1,
                    productUrl: product.permalink,
                });

                if (result.success) {
                    // Successfully added to cart
                } else {
                    // If AJAX fails, fallback to navigation
                    console.warn('AJAX add to cart failed, redirecting to product page:', result.error);
                    window.location.href = product.permalink || '#';
                }
            } else {
                // Fallback to navigation
                window.location.href = product.permalink || '#';
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            // Fallback to navigation on error
            window.location.href = product.permalink || '#';
        } finally {
            setAddingToCartIds(prev => {
                const next = new Set(prev);
                next.delete(uniqueKey);
                return next;
            });
        }
    };

    const formatPrice = (price) => {
        if (!price) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Share functions
    const getShareUrl = () => window.location.href;
    const getShareText = () => `Check out ${wishlist?.owner_name ? wishlist.owner_name + "'s" : 'this'} wishlist!`;

    const shareOnFacebook = () => {
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
    };

    const shareOnTwitter = () => {
        const url = encodeURIComponent(getShareUrl());
        const text = encodeURIComponent(getShareText());
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
    };

    const shareOnPinterest = () => {
        const url = encodeURIComponent(getShareUrl());
        const description = encodeURIComponent(getShareText());
        window.open(`https://pinterest.com/pin/create/button/?url=${url}&description=${description}`, '_blank', 'width=600,height=400');
    };

    const shareOnWhatsApp = () => {
        const text = encodeURIComponent(`${getShareText()} ${getShareUrl()}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = encodeURIComponent('Shared Wishlist');
        const body = encodeURIComponent(`${getShareText()}\n\n${getShareUrl()}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const copyWishlistLink = async () => {
        try {
            await navigator.clipboard.writeText(getShareUrl());
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = getShareUrl();
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
        }
    };

    if (isLoading) {
        return (
            <div className="shared-wishlist-view">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Heart className="w-12 h-12 mx-auto mb-4 animate-pulse text-gray-400" />
                        <p className="text-gray-600">Loading wishlist...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="shared-wishlist-view">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] py-12">
                        <Heart className="w-16 h-16 mb-4 text-red-300" />
                        <h1 className="text-2xl font-bold mb-2">Unable to load wishlist</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Button onClick={() => window.location.href = siteUrl}>
                            Go to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!wishlist) {
        return (
            <div className="shared-wishlist-view">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] py-12">
                        <Heart className="w-16 h-16 mb-4 text-red-300" />
                        <h1 className="text-2xl font-bold mb-2">Wishlist Not Found</h1>
                        <p className="text-gray-600 mb-6">This wishlist may have been removed or is no longer available.</p>
                        <Button onClick={() => window.location.href = siteUrl}>
                            Go to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="shared-wishlist-view">
            {/* Header */}
            <div className="wishlist-header">
                <div className="wishlist-header-content">
                    <div>
                        <h1>Shared Wishlist</h1>
                        <p>{products.length} {products.length === 1 ? 'item' : 'items'}</p>
                    </div>
                </div>
            </div>

            {/* Shared by info - subtle */}
            {wishlist.owner_name && (
                <div className="shared-by-info">
                    <p>Shared by <strong>{wishlist.owner_name}</strong></p>
                </div>
            )}

            {/* Login Prompt */}
            {!isUserLoggedIn && (
                <div className="login-prompt">
                    <p>
                        <a href={`${siteUrl}/wp-login.php`}>Sign in</a> to save this wishlist to your account
                    </p>
                </div>
            )}

            {/* Products List */}
            {products.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] py-12">
                        <Heart className="w-16 h-16 mb-4 text-gray-300" />
                        <h1 className="text-2xl font-bold mb-2">This wishlist is empty</h1>
                        <p className="text-gray-600 mb-6">No items have been added yet.</p>
                        <Button onClick={() => window.location.href = siteUrl}>
                            Visit Store
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Product List - FluentCart Style */}
                    <div className="wishlist-items-container">
                        {products.map((product) => (
                            <div key={product.id} className="wishlist-item">
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
                                </div>

                                {/* Price */}
                                <div className="item-price">
                                    {(() => {
                                        const displayPrice = getDisplayPrice(product);
                                        return displayPrice.is_on_sale && displayPrice.regular_price ? (
                                            <>
                                                <span className="price-sale">{formatPrice(displayPrice.sale_price || displayPrice.price)}</span>
                                            </>
                                        ) : (
                                            <span className="price-current">{formatPrice(displayPrice.price)}</span>
                                        );
                                    })()}
                                </div>

                                {/* Variant Selector (if product has multiple variants) */}
                                {product.variants && product.variants.length > 1 && window.wishcartVariantSelector && (
                                    <div className="item-variant-selector">
                                        {window.wishcartVariantSelector({
                                            variants: product.variants,
                                            selectedVariantId: selectedVariants.get(getUniqueItemKey(product)) || product.variation_id || (product.variants[0]?.id || product.variants[0]?.variation_id || 0),
                                            onVariantChange: (variantId, variant) => handleVariantChange(product, variantId, variant),
                                            productId: product.id,
                                        })}
                                    </div>
                                )}

                                {/* Add to Cart Button */}
                                <Button
                                    onClick={() => handleAddToCart(product)}
                                    disabled={addingToCartIds.has(getUniqueItemKey(product))}
                                    className="item-add-to-cart"
                                    size="sm"
                                >
                                    {addingToCartIds.has(getUniqueItemKey(product)) ? 'Adding...' : 'Add To Cart'}
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Share Section */}
                    <div className="share-section">
                        <span className="share-label">Wishlist Share on</span>
                        <div className="share-icons">
                            <button
                                onClick={shareOnFacebook}
                                className="share-icon"
                                aria-label="Share on Facebook"
                                title="Share on Facebook"
                            >
                                <span className="share-icon-text">f</span>
                            </button>
                            <button
                                onClick={shareOnTwitter}
                                className="share-icon"
                                aria-label="Share on Twitter"
                                title="Share on Twitter"
                            >
                                <Twitter className="share-icon-svg" />
                            </button>
                            <button
                                onClick={shareOnPinterest}
                                className="share-icon"
                                aria-label="Share on Pinterest"
                                title="Share on Pinterest"
                            >
                                <span className="share-icon-text">P</span>
                            </button>
                            <button
                                onClick={shareOnWhatsApp}
                                className="share-icon"
                                aria-label="Share on WhatsApp"
                                title="Share on WhatsApp"
                            >
                                <MessageCircle className="share-icon-svg" />
                            </button>
                            <button
                                onClick={copyWishlistLink}
                                className="share-icon"
                                aria-label="Copy link"
                                title="Copy link"
                            >
                                {linkCopied ? (
                                    <Check className="share-icon-svg" />
                                ) : (
                                    <Link2 className="share-icon-svg" />
                                )}
                            </button>
                            <button
                                onClick={shareViaEmail}
                                className="share-icon"
                                aria-label="Share via Email"
                                title="Share via Email"
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

export default SharedWishlistView;


