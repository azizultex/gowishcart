import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Twitter, Mail, MessageCircle, Link2, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import '../styles/SharedWishlistView.scss';

/**
 * SharedWishlistView Component
 * Displays a publicly shared wishlist for guests and logged-in users
 */
const SharedWishlistView = ({ shareToken }) => {
    const [wishlist, setWishlist] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const apiUrl = window.wishcartShared?.apiUrl || '/wp-json/wishcart/v1/';
    const siteUrl = window.wishcartShared?.siteUrl || '';
    const isUserLoggedIn = window.wishcartShared?.isUserLoggedIn || false;
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        fetchSharedWishlist();
    }, [shareToken]);

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
                setProducts(data.products || []);
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

    const handleAddToCart = async (product) => {
        if (!product) {
            console.error('Product not found');
            return;
        }

        // Track the add to cart event for analytics
        try {
            const trackUrl = `${apiUrl}wishlist/track-cart`;
            const trackBody = {
                product_id: product.id,
                variation_id: product.variation_id || 0,
            };
            
            await fetch(trackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trackBody),
            });
        } catch (trackError) {
            // Don't block navigation if tracking fails
            console.error('Error tracking cart event:', trackError);
        }

        // Navigate to product page - FluentCart will handle adding to cart
        window.location.href = product.permalink || '#';
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
                                    {product.variation_id && product.variation_attributes && (
                                        <div className="item-variant">
                                            {Object.entries(product.variation_attributes).map(([key, value]) => (
                                                <span key={key}>{key}: {value}</span>
                                            )).join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* Price */}
                                <div className="item-price">
                                    {product.is_on_sale && product.regular_price ? (
                                        <>
                                            <span className="price-sale">{formatPrice(product.sale_price || product.price)}</span>
                                        </>
                                    ) : (
                                        <span className="price-current">{formatPrice(product.price)}</span>
                                    )}
                                </div>

                                {/* Add to Cart Button */}
                                <Button
                                    onClick={() => handleAddToCart(product)}
                                    className="item-add-to-cart"
                                    size="sm"
                                >
                                    Add To Cart
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

