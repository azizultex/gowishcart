import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { __ } from '@wordpress/i18n';
import { Heart, ShoppingCart, X } from 'lucide-react';
import { Sketch } from '@uiw/react-color';
import IconPicker from './IconPicker';
import * as LucideIcons from 'lucide-react';
import ButtonPreview from './ButtonPreview';

const ButtonCustomizationSettings = ({ settings, updateSettings }) => {
    const wishlistSettings = settings.wishlist || {};
    const buttonCustomization = wishlistSettings.button_customization || {};
    
    // New structure: general, product_page, product_listing
    const general = buttonCustomization.general || { textColor: '', font: 'default', fontSize: '12px' };
    const productPage = buttonCustomization.product_page || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#686868',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };
    const productListing = buttonCustomization.product_listing || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#515151',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };
    const savedProductPage = buttonCustomization.saved_product_page || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#686868',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };
    const savedProductListing = buttonCustomization.saved_product_listing || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#515151',
        font: 'default',
        fontSize: '16px',
        iconSize: '16px',
        borderRadius: '3px'
    };
    
    // Icon structure: support both old (single icon) and new (separate icons) format
    // Migrate old format to new format if needed
    // Use useMemo to recompute when buttonCustomization.icon changes
    const { addToWishlistIcon, savedWishlistIcon } = useMemo(() => {
        const oldIcon = buttonCustomization.icon;
        let addIcon, savedIcon;
        
        if (oldIcon && oldIcon.addToWishlist) {
            // New format already exists
            addIcon = oldIcon.addToWishlist || { type: 'predefined', value: 'Heart', customUrl: '' };
            savedIcon = oldIcon.savedWishlist || { type: 'predefined', value: 'Heart', customUrl: '' };
        } else if (oldIcon) {
            // Migrate old format to new format
            addIcon = {
                type: oldIcon.type || 'predefined',
                value: oldIcon.value ? oldIcon.value.charAt(0).toUpperCase() + oldIcon.value.slice(1) : 'Heart',
                customUrl: oldIcon.customUrl || ''
            };
            savedIcon = {
                type: oldIcon.type || 'predefined',
                value: oldIcon.value ? oldIcon.value.charAt(0).toUpperCase() + oldIcon.value.slice(1) : 'Heart',
                customUrl: oldIcon.customUrl || ''
            };
        } else {
            // Default values
            addIcon = { type: 'predefined', value: 'Heart', customUrl: '' };
            savedIcon = { type: 'predefined', value: 'Heart', customUrl: '' };
        }
        
        return { addToWishlistIcon: addIcon, savedWishlistIcon: savedIcon };
    }, [buttonCustomization.icon]);
    
    const labels = buttonCustomization.labels || { add: '', saved: '' };

    // State for color pickers
    const [selectedColorPicker, setSelectedColorPicker] = useState(null);

    // Font options
    const fontOptions = [
        { value: 'default', label: __('Use Default Font', 'wishcart') },
        { value: 'Arial', label: 'Arial' },
        { value: 'Helvetica', label: 'Helvetica' },
        { value: 'Times New Roman', label: 'Times New Roman' },
        { value: 'Georgia', label: 'Georgia' },
        { value: 'Verdana', label: 'Verdana' },
        { value: 'Courier New', label: 'Courier New' },
        { value: 'Tahoma', label: 'Tahoma' },
        { value: 'Trebuchet MS', label: 'Trebuchet MS' },
        { value: 'Comic Sans MS', label: 'Comic Sans MS' },
        { value: 'Impact', label: 'Impact' },
        { value: 'Lucida Console', label: 'Lucida Console' },
    ];

    const updateButtonCustomization = (section, key, value) => {
        const currentCustomization = buttonCustomization || {};
        const currentSection = currentCustomization[section] || {};
        
        updateSettings('wishlist', 'button_customization', {
            ...currentCustomization,
            [section]: {
                ...currentSection,
                [key]: value,
            },
        });
    };

    // Update icon structure (supports nested icon properties)
    const updateIcon = (iconType, property, value) => {
        const currentCustomization = buttonCustomization || {};
        const currentIcon = currentCustomization.icon || {};
        const targetIcon = currentIcon[iconType] || { type: 'predefined', value: 'Heart', customUrl: '' };
        
        updateSettings('wishlist', 'button_customization', {
            ...currentCustomization,
            icon: {
                ...currentIcon,
                [iconType]: {
                    ...targetIcon,
                    [property]: value,
                },
            },
        });
    };

    const handleMediaUpload = (iconType) => {
        // Check if wp.media is available
        if (typeof wp === 'undefined' || !wp.media) {
            alert(__('WordPress media library is not available. Please refresh the page.', 'wishcart'));
            return;
        }

        const mediaUploader = wp.media({
            title: __('Select Icon', 'wishcart'),
            button: {
                text: __('Use this icon', 'wishcart')
            },
            multiple: false,
            library: {
                type: 'image'
            }
        });

        mediaUploader.on('select', function () {
            const selection = mediaUploader.state().get('selection');
            const attachment = selection.first();
            
            if (!attachment) {
                alert(__('No image selected. Please try again.', 'wishcart'));
                return;
            }

            // Get attachment data - use both .toJSON() and .get() methods for compatibility
            const attachmentData = attachment.toJSON ? attachment.toJSON() : attachment;
            
            // Get file extension from filename or URL
            const url = attachmentData.url || attachment.get('url') || '';
            const filename = attachmentData.filename || attachment.get('filename') || url.split('/').pop() || '';
            const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
            
            // Validate file type (PNG or SVG only)
            if (fileExtension !== 'png' && fileExtension !== 'svg') {
                alert(__('Please upload a PNG or SVG file only.', 'wishcart'));
                return;
            }
            
            // Also check MIME type
            const mimeType = attachmentData.mime || attachment.get('mime') || '';
            if (mimeType && mimeType !== 'image/png' && mimeType !== 'image/svg+xml') {
                alert(__('Please upload a PNG or SVG file only.', 'wishcart'));
                return;
            }
            
            // Get image URL - try multiple methods to ensure we get the URL
            let imageUrl = url;
            if (!imageUrl) {
                imageUrl = attachmentData.sizes?.full?.url || 
                          attachmentData.sizes?.medium?.url ||
                          attachment.get('url') ||
                          '';
            }
            
            if (!imageUrl) {
                console.error('Attachment data:', attachmentData);
                alert(__('Error: Could not get image URL. Please try again.', 'wishcart'));
                return;
            }
            
            // Update both type and URL in a single update to ensure consistency
            const currentCustomization = buttonCustomization || {};
            const currentIcon = currentCustomization.icon || {};
            const targetIcon = currentIcon[iconType] || { type: 'predefined', value: 'Heart', customUrl: '' };
            
            updateSettings('wishlist', 'button_customization', {
                ...currentCustomization,
                icon: {
                    ...currentIcon,
                    [iconType]: {
                        ...targetIcon,
                        type: 'custom',
                        customUrl: imageUrl
                    },
                },
            });
        });

        mediaUploader.open();
    };

    // Icon section component (reusable for addToWishlist and savedWishlist)
    const IconSection = ({ title, iconType, iconConfig }) => {
        const SelectedIconComponent = iconConfig.value && LucideIcons[iconConfig.value] 
            ? LucideIcons[iconConfig.value] 
            : null;

        return (
            <div className="space-y-4 border rounded-lg p-4">
                <Label className="text-base font-semibold">{title}</Label>
                
                <RadioGroup
                    value={iconConfig.type || 'predefined'}
                    onValueChange={(value) => updateIcon(iconType, 'type', value)}
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="predefined" id={`${iconType}_predefined`} />
                        <Label htmlFor={`${iconType}_predefined`} className="cursor-pointer">
                            {__('Predefined Icon', 'wishcart')}
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id={`${iconType}_custom`} />
                        <Label htmlFor={`${iconType}_custom`} className="cursor-pointer">
                            {__('Custom Icon', 'wishcart')}
                        </Label>
                    </div>
                </RadioGroup>

                {iconConfig.type === 'predefined' ? (
                    <div className="space-y-2">
                        <Label>{__('Select Icon', 'wishcart')}</Label>
                        <IconPicker
                            selectedIcon={iconConfig.value}
                            onSelect={(iconName) => updateIcon(iconType, 'value', iconName)}
                            label={__('Select Icon', 'wishcart')}
                            triggerLabel={iconConfig.value || __('Select Icon', 'wishcart')}
                        />
                        {SelectedIconComponent && (
                            <div className="mt-2 p-3 border rounded-lg inline-flex items-center gap-2">
                                <SelectedIconComponent className="w-6 h-6" />
                                <span className="text-sm text-muted-foreground">{iconConfig.value}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Label>{__('Custom Icon', 'wishcart')}</Label>
                        
                        {/* Image Preview Area - Always visible when custom is selected */}
                        <div className="w-full">
                            {iconConfig.customUrl ? (
                                <div className="space-y-3">
                                    <div className="relative inline-block border-2 border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <img
                                            src={iconConfig.customUrl}
                                            alt={__('Custom icon preview', 'wishcart')}
                                            className="w-32 h-32 object-contain"
                                            onError={(e) => {
                                                console.error('Failed to load image:', iconConfig.customUrl);
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute -top-2 -right-2 h-7 w-7 p-0 rounded-full bg-white border-2 border-gray-300 hover:bg-red-50 hover:border-red-400 shadow-sm"
                                            onClick={() => updateIcon(iconType, 'customUrl', '')}
                                            title={__('Remove icon', 'wishcart')}
                                        >
                                            <X className="h-4 w-4 text-gray-700" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground break-all">
                                        {iconConfig.customUrl.split('/').pop()}
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        {__('No icon selected', 'wishcart')}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleMediaUpload(iconType)}
                            className="w-full"
                        >
                            {iconConfig.customUrl ? __('Change Icon', 'wishcart') : __('Upload Icon', 'wishcart')}
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    // Color input component with picker
    const ColorInput = ({ label, value, onChange, colorPickerId }) => {
        const isPickerOpen = selectedColorPicker === colorPickerId;
        const currentColor = value || '#ffffff';
        const pickerContainerRef = useRef(null);

        // Close picker when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (pickerContainerRef.current && !pickerContainerRef.current.contains(event.target)) {
                    if (isPickerOpen) {
                        setSelectedColorPicker(null);
                    }
                }
            };

            if (isPickerOpen) {
                document.addEventListener('mousedown', handleClickOutside);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [isPickerOpen]);

        return (
            <div className="space-y-2">
                <Label className="text-sm">{label}</Label>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={pickerContainerRef}>
                        <div
                            className="w-10 h-10 rounded border-2 border-gray-200 cursor-pointer"
                            style={{ backgroundColor: currentColor }}
                            onClick={() => setSelectedColorPicker(isPickerOpen ? null : colorPickerId)}
                        />
                        {isPickerOpen && (
                            <div className="absolute z-50 mt-2">
                                <Sketch
                                    color={currentColor}
                                    onChange={(color) => {
                                        onChange(color.hex);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <Input
                        type="text"
                        value={currentColor}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1 font-mono text-sm"
                    />
                </div>
            </div>
        );
    };

    // Button section component (reusable for product_page and product_listing)
    const ButtonSection = ({ title, sectionKey, settings: sectionSettings }) => {
        return (
            <div className="space-y-4 border-t pt-6">
                <Label className="text-base font-semibold">{title}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput
                        label={__('Background Color', 'wishcart')}
                        value={sectionSettings.backgroundColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'backgroundColor', value)}
                        colorPickerId={`${sectionKey}-bg`}
                    />
                    <ColorInput
                        label={__('Background Hover Color', 'wishcart')}
                        value={sectionSettings.backgroundHoverColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'backgroundHoverColor', value)}
                        colorPickerId={`${sectionKey}-bg-hover`}
                    />
                    <ColorInput
                        label={__('Button Text Color', 'wishcart')}
                        value={sectionSettings.buttonTextColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'buttonTextColor', value)}
                        colorPickerId={`${sectionKey}-btn-text`}
                    />
                    <ColorInput
                        label={__('Button Text Hover Color', 'wishcart')}
                        value={sectionSettings.buttonTextHoverColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'buttonTextHoverColor', value)}
                        colorPickerId={`${sectionKey}-btn-text-hover`}
                    />
                    <div className="space-y-2">
                        <Label className="text-sm">{__('Font', 'wishcart')}</Label>
                        <Select
                            value={sectionSettings.font || 'default'}
                            onValueChange={(value) => updateButtonCustomization(sectionKey, 'font', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={__('Select font', 'wishcart')} />
                            </SelectTrigger>
                            <SelectContent>
                                {fontOptions.map((font) => (
                                    <SelectItem key={font.value} value={font.value}>
                                        {font.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{__('Font Size', 'wishcart')}</Label>
                        <Input
                            type="text"
                            value={sectionSettings.fontSize || ''}
                            onChange={(e) => updateButtonCustomization(sectionKey, 'fontSize', e.target.value)}
                            placeholder="16px"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{__('Icon Size', 'wishcart')}</Label>
                        <Input
                            type="text"
                            value={sectionSettings.iconSize || ''}
                            onChange={(e) => updateButtonCustomization(sectionKey, 'iconSize', e.target.value)}
                            placeholder="16px"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{__('Border Radius', 'wishcart')}</Label>
                        <Input
                            type="text"
                            value={sectionSettings.borderRadius || ''}
                            onChange={(e) => updateButtonCustomization(sectionKey, 'borderRadius', e.target.value)}
                            placeholder="3px"
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="wishcart-button-customization-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
            {/* Settings Section */}
            <div className="wishcart-settings-section">
                {/* General Settings Section */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold">{__('General Settings', 'wishcart')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ColorInput
                            label={__('Text Color', 'wishcart')}
                            value={general.textColor}
                            onChange={(value) => updateButtonCustomization('general', 'textColor', value)}
                            colorPickerId="general-text"
                        />
                        <div className="space-y-2">
                            <Label className="text-sm">{__('Font', 'wishcart')}</Label>
                            <Select
                                value={general.font || 'default'}
                                onValueChange={(value) => updateButtonCustomization('general', 'font', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={__('Select font', 'wishcart')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {fontOptions.map((font) => (
                                        <SelectItem key={font.value} value={font.value}>
                                            {font.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">{__('Select Font Size', 'wishcart')}</Label>
                            <Input
                                type="text"
                                value={general.fontSize || ''}
                                onChange={(e) => updateButtonCustomization('general', 'fontSize', e.target.value)}
                                placeholder="12px"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label className="text-sm">{__('Button Style', 'wishcart')}</Label>
                            <Select
                                value={general.buttonStyle || 'button'}
                                onValueChange={(value) => updateButtonCustomization('general', 'buttonStyle', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={__('Select button style', 'wishcart')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="button">{__('Button (Text + Icon)', 'wishcart')}</SelectItem>
                                    <SelectItem value="text-only">{__('Text Only', 'wishcart')}</SelectItem>
                                    <SelectItem value="text-only-link">{__('Text Only (No Button)', 'wishcart')}</SelectItem>
                                    <SelectItem value="text-icon-link">{__('Text with Icon (No Button)', 'wishcart')}</SelectItem>
                                    <SelectItem value="icon-only">{__('Icon Only', 'wishcart')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {__('Choose how the wishlist button appears', 'wishcart')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Product Page Button Section */}
                <ButtonSection
                    title={__('"Add To Wishlist" Product Page Button', 'wishcart')}
                    sectionKey="product_page"
                    settings={productPage}
                />

                {/* Product Listing Button Section */}
                <ButtonSection
                    title={__('"Add To Wishlist" Product Listing Button', 'wishcart')}
                    sectionKey="product_listing"
                    settings={productListing}
                />

                {/* Saved to Wishlist Product Page Button Section */}
                <ButtonSection
                    title={__('"Saved to Wishlist" Product Page Button', 'wishcart')}
                    sectionKey="saved_product_page"
                    settings={savedProductPage}
                />

                {/* Saved to Wishlist Product Listing Button Section */}
                <ButtonSection
                    title={__('"Saved to Wishlist" Product Listing Button', 'wishcart')}
                    sectionKey="saved_product_listing"
                    settings={savedProductListing}
                />

                {/* Icon Section */}
                <div className="space-y-4 border-t pt-4">
                    <Label className="text-base font-semibold">{__('Icons', 'wishcart')}</Label>
                    <p className="text-sm text-muted-foreground">
                        {__('Configure separate icons for "Add to Wishlist" and "Saved to Wishlist" states', 'wishcart')}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <IconSection
                            title={__('"Add to Wishlist" Icon', 'wishcart')}
                            iconType="addToWishlist"
                            iconConfig={addToWishlistIcon}
                        />
                        <IconSection
                            title={__('"Saved to Wishlist" Icon', 'wishcart')}
                            iconType="savedWishlist"
                            iconConfig={savedWishlistIcon}
                        />
                    </div>
                </div>

                {/* Labels Section */}
                <div className="space-y-4 border-t pt-4">
                    <Label className="text-base font-semibold">{__('Button Labels', 'wishcart')}</Label>
                    
                    <div className="space-y-2">
                        <Label htmlFor="label_add">{__('"Add to Wishlist" Text', 'wishcart')}</Label>
                        <Input
                            id="label_add"
                            type="text"
                            value={labels.add || ''}
                            onChange={(e) => updateButtonCustomization('labels', 'add', e.target.value)}
                            placeholder={__('Add to Wishlist', 'wishcart')}
                        />
                        <p className="text-sm text-muted-foreground">
                            {__('Text displayed when product is not in wishlist', 'wishcart')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="label_saved">{__('"Saved to Wishlist" Text', 'wishcart')}</Label>
                        <Input
                            id="label_saved"
                            type="text"
                            value={labels.saved || ''}
                            onChange={(e) => updateButtonCustomization('labels', 'saved', e.target.value)}
                            placeholder={__('Saved to Wishlist', 'wishcart')}
                        />
                        <p className="text-sm text-muted-foreground">
                            {__('Text displayed when product is in wishlist', 'wishcart')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Live Preview Section */}
            <div className="wishcart-preview-wrapper">
                <ButtonPreview buttonCustomization={buttonCustomization} />
            </div>
        </div>
    );
};

export default ButtonCustomizationSettings;
