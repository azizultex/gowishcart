import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Heart, ShoppingCart, Share2, Users, BarChart, Link as LinkIcon, ArrowUp, ArrowDown, X } from 'lucide-react';
import Pagination from './Pagination';
import '../../styles/Analytics.scss';

export const AnalyticsDashboard = () => {
    const [overview, setOverview] = useState(null);
    const [popularProducts, setPopularProducts] = useState([]);
    const [conversionData, setConversionData] = useState(null);
    const [linkDetails, setLinkDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Pagination state for popular products
    const [popularProductsPage, setPopularProductsPage] = useState(1);
    const [popularProductsPerPage] = useState(10);
    const [popularProductsPagination, setPopularProductsPagination] = useState(null);
    const [popularProductsTimePeriod, setPopularProductsTimePeriod] = useState('7days');
    const [popularProductsSort, setPopularProductsSort] = useState({ column: null, direction: 'asc' });
    
    // Pagination state for link details
    const [linkDetailsPage, setLinkDetailsPage] = useState(1);
    const [linkDetailsPerPage] = useState(10);
    const [linkDetailsPagination, setLinkDetailsPagination] = useState(null);
    const [linkDetailsTimePeriod, setLinkDetailsTimePeriod] = useState('7days');
    const [linkDetailsSort, setLinkDetailsSort] = useState({ column: null, direction: 'asc' });
    
    // Tooltip state for variation breakdown
    const [hoveredProductId, setHoveredProductId] = useState(null);
    const [tooltipType, setTooltipType] = useState(null); // 'purchases' or 'add-to-cart'
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [fixedTooltip, setFixedTooltip] = useState({ productId: null, type: null }); // Track fixed tooltip
    const tooltipRefs = useRef({}); // Store refs for each tooltip

    const apiUrl = window.wishcartSettings?.apiUrl || '/wp-json/wishcart/v1/';
    const nonce = window.wishcartSettings?.nonce;

    useEffect(() => {
        fetchAnalytics();
    }, []);

    useEffect(() => {
        fetchPopularProducts();
    }, [popularProductsPage, popularProductsTimePeriod]);

    useEffect(() => {
        fetchLinkDetails();
    }, [linkDetailsPage, linkDetailsTimePeriod]);

    // Handle click outside tooltip to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (fixedTooltip.productId) {
                const tooltipKey = `${fixedTooltip.productId}-${fixedTooltip.type}`;
                const tooltipElement = tooltipRefs.current[tooltipKey];
                
                if (tooltipElement && !tooltipElement.contains(event.target)) {
                    // Check if click is not on the trigger element
                    const triggerElements = document.querySelectorAll('.purchase-count-wrapper');
                    let isTriggerClick = false;
                    triggerElements.forEach((el) => {
                        if (el.contains(event.target)) {
                            isTriggerClick = true;
                        }
                    });
                    
                    if (!isTriggerClick) {
                        setFixedTooltip({ productId: null, type: null });
                    }
                }
            }
        };

        if (fixedTooltip.productId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [fixedTooltip]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            // Fetch overview
            const overviewRes = await fetch(`${apiUrl}analytics/overview`, {
                headers: { 'X-WP-Nonce': nonce },
            });
            if (overviewRes.ok) {
                const overviewData = await overviewRes.json();
                setOverview(overviewData.data);
            }

            // Fetch conversion funnel
            const conversionRes = await fetch(`${apiUrl}analytics/conversion`, {
                headers: { 'X-WP-Nonce': nonce },
            });
            if (conversionRes.ok) {
                const conversionData = await conversionRes.json();
                setConversionData(conversionData.data);
            }

            // Fetch initial data for paginated tables
            await Promise.all([
                fetchPopularProducts(),
                fetchLinkDetails(),
            ]);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPopularProducts = async () => {
        try {
            const popularRes = await fetch(
                `${apiUrl}analytics/popular?page=${popularProductsPage}&per_page=${popularProductsPerPage}&time_period=${popularProductsTimePeriod}`,
                {
                    headers: { 'X-WP-Nonce': nonce },
                }
            );
            if (popularRes.ok) {
                const popularData = await popularRes.json();
                setPopularProducts(popularData.products || []);
                setPopularProductsPagination(popularData.pagination || null);
            }
        } catch (err) {
            console.error('Error fetching popular products:', err);
        }
    };

    const fetchLinkDetails = async () => {
        try {
            const linksRes = await fetch(
                `${apiUrl}analytics/links?page=${linkDetailsPage}&per_page=${linkDetailsPerPage}&time_period=${linkDetailsTimePeriod}`,
                {
                    headers: { 'X-WP-Nonce': nonce },
                }
            );
            if (linksRes.ok) {
                const linksData = await linksRes.json();
                setLinkDetails(linksData);
                setLinkDetailsPagination(linksData.pagination || null);
            }
        } catch (err) {
            console.error('Error fetching link details:', err);
        }
    };

    // Sort handler for popular products
    const handlePopularProductsSort = (column) => {
        setPopularProductsSort((prev) => {
            if (prev.column === column) {
                return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column, direction: 'asc' };
        });
    };

    // Sort handler for link details
    const handleLinkDetailsSort = (column) => {
        setLinkDetailsSort((prev) => {
            if (prev.column === column) {
                return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column, direction: 'asc' };
        });
    };

    // Sort popular products data
    const sortedPopularProducts = useMemo(() => {
        if (!popularProductsSort.column) return popularProducts;
        
        const sorted = [...popularProducts].sort((a, b) => {
            let aVal, bVal;
            
            switch (popularProductsSort.column) {
                case 'product':
                    aVal = (a.product_name || '').toLowerCase();
                    bVal = (b.product_name || '').toLowerCase();
                    break;
                case 'wishlist_count':
                    aVal = a.wishlist_count || 0;
                    bVal = b.wishlist_count || 0;
                    break;
                case 'add_to_cart':
                    aVal = a.add_to_cart_count || 0;
                    bVal = b.add_to_cart_count || 0;
                    break;
                case 'purchases':
                    aVal = a.purchase_count || 0;
                    bVal = b.purchase_count || 0;
                    break;
                case 'conversion_rate':
                    aVal = a.conversion_rate || 0;
                    bVal = b.conversion_rate || 0;
                    break;
                default:
                    return 0;
            }
            
            if (typeof aVal === 'string') {
                return popularProductsSort.direction === 'asc' 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                return popularProductsSort.direction === 'asc' 
                    ? aVal - bVal
                    : bVal - aVal;
            }
        });
        
        return sorted;
    }, [popularProducts, popularProductsSort]);

    // Sort link details data
    const sortedLinkDetails = useMemo(() => {
        if (!linkDetails || !linkDetails.links) return linkDetails;
        if (!linkDetailsSort.column) return linkDetails;
        
        const sortedLinks = [...linkDetails.links].sort((a, b) => {
            let aVal, bVal;
            
            switch (linkDetailsSort.column) {
                case 'share_link':
                    aVal = (a.share_token || '').toLowerCase();
                    bVal = (b.share_token || '').toLowerCase();
                    break;
                case 'wishlist_name':
                    aVal = (a.wishlist_name || '').toLowerCase();
                    bVal = (b.wishlist_name || '').toLowerCase();
                    break;
                case 'items_count':
                    aVal = a.items_count || 0;
                    bVal = b.items_count || 0;
                    break;
                case 'click_count':
                    aVal = a.click_count || 0;
                    bVal = b.click_count || 0;
                    break;
                case 'share_type':
                    aVal = (a.share_type || '').toLowerCase();
                    bVal = (b.share_type || '').toLowerCase();
                    break;
                case 'created_date':
                    aVal = a.date_created ? new Date(a.date_created).getTime() : 0;
                    bVal = b.date_created ? new Date(b.date_created).getTime() : 0;
                    break;
                default:
                    return 0;
            }
            
            if (typeof aVal === 'string') {
                return linkDetailsSort.direction === 'asc' 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                return linkDetailsSort.direction === 'asc' 
                    ? aVal - bVal
                    : bVal - aVal;
            }
        });
        
        return { ...linkDetails, links: sortedLinks };
    }, [linkDetails, linkDetailsSort]);

    // Helper to render sort icon
    const renderSortIcon = (column, currentSort) => {
        if (currentSort.column !== column) {
            return <span className="sort-icon inactive"><ArrowUp size={14} /></span>;
        }
        return currentSort.direction === 'asc' 
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    if (isLoading) {
        return (
            <div className="analytics-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-dashboard">
            <div className="dashboard-header">
                <h2>Wishlist Analytics</h2>
                <button onClick={fetchAnalytics} className="refresh-button">
                    Refresh Data
                </button>
            </div>

            {/* Overview Cards */}
            {overview && (
                <div className="overview-grid">
                    <div className="stat-card wishcart-card">
                        <div className="stat-icon wishlist">
                            <Heart size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Wishlists</p>
                            <p className="stat-value">{overview.total_wishlists || 0}</p>
                        </div>
                    </div>

                    <div className="stat-card wishcart-card">
                        <div className="stat-icon items">
                            <BarChart size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Items</p>
                            <p className="stat-value">{overview.total_items || 0}</p>
                            <p className="stat-meta">Avg: {overview.avg_items_per_wishlist || 0} per wishlist</p>
                        </div>
                    </div>

                    <div className="stat-card wishcart-card">
                        <div className="stat-icon conversion">
                            <ShoppingCart size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Purchases</p>
                            <p className="stat-value">{overview.total_purchases || 0}</p>
                            <p className="stat-meta">Conversion: {overview.overall_conversion_rate || 0}%</p>
                        </div>
                    </div>

                    <div className="stat-card wishcart-card">
                        <div className="stat-icon shares">
                            <Share2 size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Shares</p>
                            <p className="stat-value">{overview.total_shares || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Conversion Funnel */}
            {conversionData && (() => {
                // Calculate proportional widths based on maximum value
                const maxValue = Math.max(
                    conversionData.added_to_wishlist || 0,
                    conversionData.clicked || 0,
                    conversionData.added_to_cart || 0,
                    conversionData.purchased || 0
                );
                
                const calculateWidth = (value) => {
                    if (maxValue === 0) return '100%';
                    const percentage = (value / maxValue) * 100;
                    return `${Math.min(percentage, 100)}%`;
                };

                return (
                    <div className="funnel-card wishcart-card">
                        <h3>Conversion Funnel</h3>
                        <div className="funnel-visualization">
                            <div className="funnel-stage">
                                <div className="funnel-bar" style={{ width: calculateWidth(conversionData.added_to_wishlist || 0) }}>
                                    <span className="funnel-label">Added to Wishlist</span>
                                    <span className="funnel-value">{conversionData.added_to_wishlist || 0}</span>
                                </div>
                            </div>
                            <div className="funnel-stage">
                                <div className="funnel-bar" style={{ width: calculateWidth(conversionData.clicked || 0) }}>
                                    <span className="funnel-label">Wishlist Shared Link Clicked</span>
                                    <span className="funnel-value">{conversionData.clicked || 0}</span>
                                </div>
                            </div>
                            <div className="funnel-stage">
                                <div className="funnel-bar" style={{ width: calculateWidth(conversionData.added_to_cart || 0) }}>
                                    <span className="funnel-label">Added to Cart</span>
                                    <span className="funnel-value">{conversionData.added_to_cart || 0}</span>
                                </div>
                            </div>
                            <div className="funnel-stage">
                                <div className="funnel-bar" style={{ width: calculateWidth(conversionData.purchased || 0) }}>
                                    <span className="funnel-label">Purchased</span>
                                    <span className="funnel-value">{conversionData.purchased || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Popular Products */}
            {popularProducts.length > 0 && (
                <div className="popular-products-card wishcart-card">
                    <h3>Most Wishlisted Products</h3>
                    <div className="section-filters">
                        <div className="filter-group">
                            <label htmlFor="popular-products-time-period">Time Period</label>
                            <select
                                id="popular-products-time-period"
                                value={popularProductsTimePeriod}
                                onChange={(e) => {
                                    setPopularProductsTimePeriod(e.target.value);
                                    setPopularProductsPage(1);
                                }}
                                className="time-period-select"
                            >
                                <option value="7days">Past 7 Days</option>
                                <option value="30days">Past 30 Days</option>
                                <option value="90days">Past 90 Days</option>
                                <option value="365days">Past Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                    </div>
                        <div className="products-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th 
                                            className="sortable" 
                                            onClick={() => handlePopularProductsSort('product')}
                                        >
                                            <span className="th-content">
                                                Product
                                                {renderSortIcon('product', popularProductsSort)}
                                            </span>
                                        </th>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th 
                                            className="sortable" 
                                            onClick={() => handlePopularProductsSort('wishlist_count')}
                                        >
                                            <span className="th-content">
                                                Wishlist Count
                                                {renderSortIcon('wishlist_count', popularProductsSort)}
                                            </span>
                                        </th>
                                        <th 
                                            className="sortable" 
                                            onClick={() => handlePopularProductsSort('add_to_cart')}
                                        >
                                            <span className="th-content">
                                                Add to Cart
                                                {renderSortIcon('add_to_cart', popularProductsSort)}
                                            </span>
                                        </th>
                                        <th 
                                            className="sortable" 
                                            onClick={() => handlePopularProductsSort('purchases')}
                                        >
                                            <span className="th-content">
                                                Purchases
                                                {renderSortIcon('purchases', popularProductsSort)}
                                            </span>
                                        </th>
                                        <th 
                                            className="sortable" 
                                            onClick={() => handlePopularProductsSort('conversion_rate')}
                                        >
                                            <span className="th-content">
                                                Conversion Rate
                                                {renderSortIcon('conversion_rate', popularProductsSort)}
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPopularProducts.map((product) => (
                                        <tr key={product.product_id}>
                                            <td>
                                                <a href={product.product_url} target="_blank" rel="noopener noreferrer">
                                                    {product.product_name}
                                                </a>
                                            </td>
                                            <td>
                                                {product.users && product.users.length > 0 ? (
                                                    <div className="users-list">
                                                        {product.users.map((user, idx) => (
                                                            <span key={idx} className="user-name">
                                                                {user.user_name}
                                                                {idx < product.users.length - 1 && ', '}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="no-data">-</span>
                                                )}
                                            </td>
                                            <td>
                                                {product.users && product.users.length > 0 ? (
                                                    <div className="emails-list">
                                                        {product.users.map((user, idx) => (
                                                            <span key={idx} className="user-email">
                                                                {user.email ? (
                                                                    <a href={`mailto:${user.email}`}>{user.email}</a>
                                                                ) : (
                                                                    <span className="no-email">-</span>
                                                                )}
                                                                {idx < product.users.length - 1 && ', '}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="no-data">-</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge">{product.wishlist_count}</span>
                                            </td>
                                            <td>
                                                <div 
                                                    className="purchase-count-wrapper"
                                                    onMouseEnter={(e) => {
                                                        if (product.variations && product.variations.length > 0 && fixedTooltip.productId !== product.product_id) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setTooltipPosition({
                                                                top: rect.bottom + 8,
                                                                left: rect.left
                                                            });
                                                            setHoveredProductId(product.product_id);
                                                            setTooltipType('add-to-cart');
                                                        }
                                                    }}
                                                    onMouseLeave={() => {
                                                        if (fixedTooltip.productId !== product.product_id) {
                                                            setHoveredProductId(null);
                                                            setTooltipType(null);
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        if (product.variations && product.variations.length > 0) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setTooltipPosition({
                                                                top: rect.bottom + 8,
                                                                left: rect.left
                                                            });
                                                            setFixedTooltip({ productId: product.product_id, type: 'add-to-cart' });
                                                            setHoveredProductId(null);
                                                            setTooltipType(null);
                                                        }
                                                    }}
                                                >
                                                    <span className="purchase-count-value">{product.add_to_cart_count}</span>
                                                    {(hoveredProductId === product.product_id && tooltipType === 'add-to-cart' || fixedTooltip.productId === product.product_id && fixedTooltip.type === 'add-to-cart') && product.variations && product.variations.length > 0 && (
                                                        <div 
                                                            ref={(el) => {
                                                                const key = `${product.product_id}-add-to-cart`;
                                                                if (el) {
                                                                    tooltipRefs.current[key] = el;
                                                                } else {
                                                                    delete tooltipRefs.current[key];
                                                                }
                                                            }}
                                                            className="variation-tooltip"
                                                            style={{
                                                                top: `${tooltipPosition.top}px`,
                                                                left: `${tooltipPosition.left}px`
                                                            }}
                                                            onMouseEnter={(e) => e.stopPropagation()}
                                                            onMouseLeave={(e) => {
                                                                if (fixedTooltip.productId !== product.product_id) {
                                                                    e.stopPropagation();
                                                                }
                                                            }}
                                                        >
                                                            <div className="tooltip-header">
                                                                <span>Add to Cart - Variation Breakdown</span>
                                                                <button 
                                                                    className="tooltip-close"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFixedTooltip({ productId: null, type: null });
                                                                        setHoveredProductId(null);
                                                                        setTooltipType(null);
                                                                    }}
                                                                    aria-label="Close"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                            <div className="tooltip-content">
                                                                {product.variations.map((variation, idx) => (
                                                                    <div key={idx} className="variation-item">
                                                                        <div className="variation-name">{variation.variation_name}</div>
                                                                        <div className="variation-stats">
                                                                            <span className="stat-item">
                                                                                <strong>{variation.add_to_cart_count}</strong> add-to-cart
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div 
                                                    className="purchase-count-wrapper"
                                                    onMouseEnter={(e) => {
                                                        if (product.variations && product.variations.length > 0 && fixedTooltip.productId !== product.product_id) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setTooltipPosition({
                                                                top: rect.bottom + 8,
                                                                left: rect.left
                                                            });
                                                            setHoveredProductId(product.product_id);
                                                            setTooltipType('purchases');
                                                        }
                                                    }}
                                                    onMouseLeave={() => {
                                                        if (fixedTooltip.productId !== product.product_id) {
                                                            setHoveredProductId(null);
                                                            setTooltipType(null);
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        if (product.variations && product.variations.length > 0) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setTooltipPosition({
                                                                top: rect.bottom + 8,
                                                                left: rect.left
                                                            });
                                                            setFixedTooltip({ productId: product.product_id, type: 'purchases' });
                                                            setHoveredProductId(null);
                                                            setTooltipType(null);
                                                        }
                                                    }}
                                                >
                                                    <span className="purchase-count-value">{product.purchase_count}</span>
                                                    {(hoveredProductId === product.product_id && tooltipType === 'purchases' || fixedTooltip.productId === product.product_id && fixedTooltip.type === 'purchases') && product.variations && product.variations.length > 0 && (
                                                        <div 
                                                            ref={(el) => {
                                                                const key = `${product.product_id}-purchases`;
                                                                if (el) {
                                                                    tooltipRefs.current[key] = el;
                                                                } else {
                                                                    delete tooltipRefs.current[key];
                                                                }
                                                            }}
                                                            className="variation-tooltip"
                                                            style={{
                                                                top: `${tooltipPosition.top}px`,
                                                                left: `${tooltipPosition.left}px`
                                                            }}
                                                            onMouseEnter={(e) => e.stopPropagation()}
                                                            onMouseLeave={(e) => {
                                                                if (fixedTooltip.productId !== product.product_id) {
                                                                    e.stopPropagation();
                                                                }
                                                            }}
                                                        >
                                                            <div className="tooltip-header">
                                                                <span>Purchases - Variation Breakdown</span>
                                                                <button 
                                                                    className="tooltip-close"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFixedTooltip({ productId: null, type: null });
                                                                        setHoveredProductId(null);
                                                                        setTooltipType(null);
                                                                    }}
                                                                    aria-label="Close"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                            <div className="tooltip-content">
                                                                {product.variations.map((variation, idx) => (
                                                                    <div key={idx} className="variation-item">
                                                                        <div className="variation-name">{variation.variation_name}</div>
                                                                        <div className="variation-stats">
                                                                            <span className="stat-item">
                                                                                <strong>{variation.purchase_count}</strong> purchases
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`conversion-badge ${product.conversion_rate > 10 ? 'high' : ''}`}>
                                                    {product.conversion_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {popularProductsPagination && (
                            <Pagination
                                currentPage={popularProductsPagination.current_page}
                                totalPages={popularProductsPagination.total_pages}
                                totalItems={popularProductsPagination.total}
                                perPage={popularProductsPagination.per_page}
                                onPageChange={setPopularProductsPage}
                            />
                        )}
                </div>
            )}

            {/* Link Details */}
            {linkDetails && (
                <div className="links-card wishcart-card">
                    <div className="links-header">
                            <h3>
                                <LinkIcon size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Share Links Details
                            </h3>
                            <span className="total-links-badge">Total Links: {linkDetails.total_links || 0}</span>
                        </div>
                    <div className="section-filters">
                        <div className="filter-group">
                            <label htmlFor="link-details-time-period">Time Period</label>
                            <select
                                id="link-details-time-period"
                                value={linkDetailsTimePeriod}
                                onChange={(e) => {
                                    setLinkDetailsTimePeriod(e.target.value);
                                    setLinkDetailsPage(1);
                                }}
                                className="time-period-select"
                            >
                                <option value="7days">Past 7 Days</option>
                                <option value="30days">Past 30 Days</option>
                                <option value="90days">Past 90 Days</option>
                                <option value="365days">Past Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                    </div>
                        {linkDetails.links && linkDetails.links.length > 0 ? (
                            <>
                                <div className="links-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th 
                                                    className="sortable" 
                                                    onClick={() => handleLinkDetailsSort('share_link')}
                                                >
                                                    <span className="th-content">
                                                        Share Link
                                                        {renderSortIcon('share_link', linkDetailsSort)}
                                                    </span>
                                                </th>
                                                <th 
                                                    className="sortable" 
                                                    onClick={() => handleLinkDetailsSort('wishlist_name')}
                                                >
                                                    <span className="th-content">
                                                        Wishlist Name
                                                        {renderSortIcon('wishlist_name', linkDetailsSort)}
                                                    </span>
                                                </th>
                                                <th>User</th>
                                                <th>Email</th>
                                                <th 
                                                    className="sortable" 
                                                    onClick={() => handleLinkDetailsSort('items_count')}
                                                >
                                                    <span className="th-content">
                                                        Items Count
                                                        {renderSortIcon('items_count', linkDetailsSort)}
                                                    </span>
                                                </th>
                                                <th>Products</th>
                                                <th 
                                                    className="sortable" 
                                                    onClick={() => handleLinkDetailsSort('click_count')}
                                                >
                                                    <span className="th-content">
                                                        Click Count
                                                        {renderSortIcon('click_count', linkDetailsSort)}
                                                    </span>
                                                </th>
                                                <th 
                                                    className="sortable" 
                                                    onClick={() => handleLinkDetailsSort('share_type')}
                                                >
                                                    <span className="th-content">
                                                        Share Type
                                                        {renderSortIcon('share_type', linkDetailsSort)}
                                                    </span>
                                                </th>
                                                <th 
                                                    className="sortable" 
                                                    onClick={() => handleLinkDetailsSort('created_date')}
                                                >
                                                    <span className="th-content">
                                                        Created Date
                                                        {renderSortIcon('created_date', linkDetailsSort)}
                                                    </span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedLinkDetails.links.map((link) => (
                                                <tr key={link.share_id}>
                                                    <td>
                                                        <a 
                                                            href={link.share_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="share-link"
                                                            title={link.share_url}
                                                        >
                                                            {link.share_token.substring(0, 20)}...
                                                        </a>
                                                    </td>
                                                    <td>{link.wishlist_name}</td>
                                                    <td>
                                                        {link.user_name ? (
                                                            <span className="user-name">{link.user_name}</span>
                                                        ) : (
                                                            <span className="no-data">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {link.user_email ? (
                                                            <a href={`mailto:${link.user_email}`} className="user-email">
                                                                {link.user_email}
                                                            </a>
                                                        ) : (
                                                            <span className="no-data">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="badge">{link.items_count}</span>
                                                    </td>
                                                    <td>
                                                        <div className="products-list">
                                                            {link.items && link.items.length > 0 ? (
                                                                link.items.slice(0, 3).map((item, idx) => (
                                                                    <span key={idx} className="product-tag">
                                                                        {item.product_name}
                                                                        {item.quantity > 1 && ` (x${item.quantity})`}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="no-items">No items</span>
                                                            )}
                                                            {link.items && link.items.length > 3 && (
                                                                <span className="more-items">+{link.items.length - 3} more</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`click-count ${link.click_count > 0 ? 'has-clicks' : ''}`}>
                                                            {link.click_count}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="share-type-badge">{link.share_type}</span>
                                                    </td>
                                                    <td>
                                                        {link.date_created ? new Date(link.date_created).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {linkDetailsPagination && (
                                    <Pagination
                                        currentPage={linkDetailsPagination.current_page}
                                        totalPages={linkDetailsPagination.total_pages}
                                        totalItems={linkDetailsPagination.total}
                                        perPage={linkDetailsPagination.per_page}
                                        onPageChange={setLinkDetailsPage}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="empty-state">
                                <p>No share links found.</p>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
};

