import React from 'react';
import { __ } from '@wordpress/i18n';
import { Heart } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import '../../styles/settings.scss';

const ButtonPreview = ({ buttonCustomization }) => {
    // Extract settings with defaults
    const general = buttonCustomization?.general || { textColor: '', font: 'default', fontSize: '12px' };
    const productPage = buttonCustomization?.product_page || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#686868',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };
    const productListing = buttonCustomization?.product_listing || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#515151',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };
    const savedProductPage = buttonCustomization?.saved_product_page || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#686868',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };
    const savedProductListing = buttonCustomization?.saved_product_listing || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#515151',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };

    // Icon configuration
    const iconConfig = buttonCustomization?.icon || {};
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

    const labels = buttonCustomization?.labels || { add: '', saved: '' };
    const defaultAddLabel = __('Add to Wishlist', 'wishcart');
    const defaultSavedLabel = __('Saved to Wishlist', 'wishcart');
    const addLabel = labels.add || defaultAddLabel;
    const savedLabel = labels.saved || defaultSavedLabel;

    // Get icon component
    const getIconComponent = (iconConfig, isActive = false, iconSize = '16px') => {
        if (iconConfig.type === 'custom' && iconConfig.customUrl) {
            return (
                <img
                    src={iconConfig.customUrl}
                    alt=""
                    className={cn("wishcart-wishlist-button__icon", isActive && "wishcart-wishlist-button__icon--filled")}
                    style={{ 
                        width: iconSize, 
                        height: iconSize 
                    }}
                />
            );
        }

        const iconValue = iconConfig.value || 'Heart';
        const IconComponent = LucideIcons[iconValue] || Heart;
        
        return (
            <IconComponent 
                className={cn("wishcart-wishlist-button__icon", isActive && "wishcart-wishlist-button__icon--filled")}
                style={{ 
                    width: iconSize, 
                    height: iconSize 
                }}
            />
        );
    };

    // Build button styles for a section
    const buildButtonStyles = (sectionSettings, isActive = false) => {
        const styles = {};

        // Font family - apply general font if section font is default
        if (sectionSettings.font && sectionSettings.font !== 'default') {
            styles.fontFamily = sectionSettings.font;
        } else if (general.font && general.font !== 'default') {
            styles.fontFamily = general.font;
        }

        // Font size - use section font size or general font size
        if (sectionSettings.fontSize) {
            styles.fontSize = sectionSettings.fontSize;
        } else if (general.fontSize) {
            styles.fontSize = general.fontSize;
        }

        // Border radius
        if (sectionSettings.borderRadius) {
            styles.borderRadius = sectionSettings.borderRadius;
        }

        // Background color
        if (sectionSettings.backgroundColor) {
            styles.backgroundColor = sectionSettings.backgroundColor;
        } else {
            styles.backgroundColor = '#ebe9eb'; // Default
        }

        // Text color - use buttonTextColor for the button text
        if (sectionSettings.buttonTextColor) {
            styles.color = sectionSettings.buttonTextColor;
        } else {
            styles.color = '#515151'; // Default
        }

        // Border
        styles.border = '1px solid';
        if (sectionSettings.backgroundColor) {
            styles.borderColor = sectionSettings.backgroundColor;
        } else {
            styles.borderColor = '#e5e7eb';
        }

        // Padding
        styles.padding = '8px 12px';
        styles.display = 'inline-flex';
        styles.alignItems = 'center';
        styles.gap = '8px';
        styles.cursor = 'default';
        styles.transition = 'all 0.2s ease-in-out';
        styles.width = '100%';
        styles.justifyContent = 'flex-start';

        // For active state, apply active colors if available
        if (isActive) {
            // Active state might have different styling
            // For now, we'll use the same colors but could be enhanced
        }

        return styles;
    };

    // Build hover styles (for CSS)
    const buildHoverStyles = (sectionSettings) => {
        return {
            '--hover-bg': sectionSettings.backgroundHoverColor || sectionSettings.backgroundColor,
            '--hover-text': sectionSettings.buttonTextHoverColor || sectionSettings.buttonTextColor,
        };
    };

    // Preview button component
    const PreviewButton = ({ label, icon, isActive, sectionSettings, sectionKey }) => {
        const baseStyles = buildButtonStyles(sectionSettings, isActive);
        const hoverStyles = buildHoverStyles(sectionSettings);
        const iconSize = sectionSettings.iconSize || '16px';

        // Apply general text color if set and no section text color
        if (general.textColor && !sectionSettings.buttonTextColor) {
            baseStyles.color = general.textColor;
        }

        return (
            <button
                type="button"
                className={cn(
                    "wishcart-wishlist-button-preview",
                    isActive && "wishcart-wishlist-button-preview--active"
                )}
                style={{
                    ...baseStyles,
                    ...hoverStyles,
                }}
                onMouseEnter={(e) => {
                    if (sectionSettings.backgroundHoverColor) {
                        e.currentTarget.style.backgroundColor = sectionSettings.backgroundHoverColor;
                    }
                    if (sectionSettings.buttonTextHoverColor) {
                        e.currentTarget.style.color = sectionSettings.buttonTextHoverColor;
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = baseStyles.backgroundColor || '#ebe9eb';
                    e.currentTarget.style.color = baseStyles.color || '#515151';
                }}
            >
                {getIconComponent(icon, isActive, iconSize)}
                <span className="wishcart-wishlist-button__label">{label}</span>
            </button>
        );
    };

    return (
        <div className="wishcart-button-preview-container">
            <div className="wishcart-button-preview-header">
                <h3 className="text-lg font-semibold mb-4">{__('Live Preview', 'wishcart')}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    {__('See how your buttons will look in real-time', 'wishcart')}
                </p>
            </div>

            {/* Product Page Button Preview */}
            <div className="wishcart-preview-section mb-8">
                <h4 className="text-base font-medium mb-4">
                    {__('Product Page Button', 'wishcart')}
                </h4>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">
                            {__('Add to Wishlist', 'wishcart')}
                        </p>
                        <PreviewButton
                            label={addLabel}
                            icon={addToWishlistIcon}
                            isActive={false}
                            sectionSettings={productPage}
                            sectionKey="product_page"
                        />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">
                            {__('Saved to Wishlist', 'wishcart')}
                        </p>
                        <PreviewButton
                            label={savedLabel}
                            icon={savedWishlistIcon}
                            isActive={true}
                            sectionSettings={savedProductPage}
                            sectionKey="saved_product_page"
                        />
                    </div>
                </div>
            </div>

            {/* Product Listing Button Preview */}
            <div className="wishcart-preview-section">
                <h4 className="text-base font-medium mb-4">
                    {__('Product Listing Button', 'wishcart')}
                </h4>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">
                            {__('Add to Wishlist', 'wishcart')}
                        </p>
                        <PreviewButton
                            label={addLabel}
                            icon={addToWishlistIcon}
                            isActive={false}
                            sectionSettings={productListing}
                            sectionKey="product_listing"
                        />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">
                            {__('Saved to Wishlist', 'wishcart')}
                        </p>
                        <PreviewButton
                            label={savedLabel}
                            icon={savedWishlistIcon}
                            isActive={true}
                            sectionSettings={savedProductListing}
                            sectionKey="saved_product_listing"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ButtonPreview;

