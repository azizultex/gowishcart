import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    
    // Debounce timer refs for each input
    const debounceTimers = useRef({});
    // Refs to track focused inputs
    const inputRefs = useRef({});
    // Track which input was focused before re-render
    const focusedInputId = useRef(null);
    
    // New structure: product_page, product_listing
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
    
    // Labels section component with local state
    const LabelsSection = ({ labels }) => {
        const [addLabel, setAddLabel] = useState(labels.add || '');
        const [savedLabel, setSavedLabel] = useState(labels.saved || '');
        const addLabelRef = useRef(null);
        const savedLabelRef = useRef(null);
        const addLabelId = 'input-labels-add';
        const savedLabelId = 'input-labels-saved';

        // Sync local state when prop values change
        useEffect(() => {
            if (document.activeElement !== addLabelRef.current) {
                setAddLabel(labels.add || '');
            }
            if (document.activeElement !== savedLabelRef.current) {
                setSavedLabel(labels.saved || '');
            }
        }, [labels.add, labels.saved]);

        // Store refs for focus restoration
        useEffect(() => {
            if (addLabelRef.current) inputRefs.current[addLabelId] = addLabelRef.current;
            if (savedLabelRef.current) inputRefs.current[savedLabelId] = savedLabelRef.current;
            return () => {
                delete inputRefs.current[addLabelId];
                delete inputRefs.current[savedLabelId];
            };
        }, [addLabelId, savedLabelId]);

        const handleAddLabelChange = (e) => {
            const value = e.target.value;
            setAddLabel(value);
            debouncedUpdate('labels', 'add', value, addLabelId);
        };

        const handleAddLabelBlur = () => {
            updateButtonCustomization('labels', 'add', addLabel);
            focusedInputId.current = null;
        };

        const handleSavedLabelChange = (e) => {
            const value = e.target.value;
            setSavedLabel(value);
            debouncedUpdate('labels', 'saved', value, savedLabelId);
        };

        const handleSavedLabelBlur = () => {
            updateButtonCustomization('labels', 'saved', savedLabel);
            focusedInputId.current = null;
        };

        return (
            <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">{__('Button Labels', 'wishcart')}</Label>
                
                <div className="space-y-2">
                    <Label htmlFor="label_add">{__('"Add to Wishlist" Text', 'wishcart')}</Label>
                    <Input
                        ref={addLabelRef}
                        id="label_add"
                        type="text"
                        value={addLabel}
                        onChange={handleAddLabelChange}
                        onBlur={handleAddLabelBlur}
                        placeholder={__('Add to Wishlist', 'wishcart')}
                    />
                    <p className="text-sm text-muted-foreground">
                        {__('Text displayed when product is not in wishlist', 'wishcart')}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="label_saved">{__('"Saved to Wishlist" Text', 'wishcart')}</Label>
                    <Input
                        ref={savedLabelRef}
                        id="label_saved"
                        type="text"
                        value={savedLabel}
                        onChange={handleSavedLabelChange}
                        onBlur={handleSavedLabelBlur}
                        placeholder={__('Saved to Wishlist', 'wishcart')}
                    />
                    <p className="text-sm text-muted-foreground">
                        {__('Text displayed when product is in wishlist', 'wishcart')}
                    </p>
                </div>
            </div>
        );
    };

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

    // Debounced update function to prevent re-renders on every keystroke
    const debouncedUpdate = useCallback((section, key, value, inputId = null) => {
        // Store the input ID if provided (for focus preservation)
        if (inputId) {
            focusedInputId.current = inputId;
        }
        
        // Clear existing timer for this input
        const timerKey = `${section}-${key}`;
        if (debounceTimers.current[timerKey]) {
            clearTimeout(debounceTimers.current[timerKey]);
        }
        
        // Set new timer
        debounceTimers.current[timerKey] = setTimeout(() => {
            const currentCustomization = buttonCustomization || {};
            const currentSection = currentCustomization[section] || {};
            
            updateSettings('wishlist', 'button_customization', {
                ...currentCustomization,
                [section]: {
                    ...currentSection,
                    [key]: value,
                },
            });
            
            // Clear the focused input after update completes
            if (inputId === focusedInputId.current) {
                focusedInputId.current = null;
            }
            
            delete debounceTimers.current[timerKey];
        }, 300); // 300ms debounce delay
    }, [buttonCustomization, updateSettings]);
    
    // Immediate update function (for non-text inputs like selects, color pickers)
    const updateButtonCustomization = useCallback((section, key, value) => {
        const currentCustomization = buttonCustomization || {};
        const currentSection = currentCustomization[section] || {};
        
        updateSettings('wishlist', 'button_customization', {
            ...currentCustomization,
            [section]: {
                ...currentSection,
                [key]: value,
            },
        });
    }, [buttonCustomization, updateSettings]);
    
    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
        };
    }, []);
    
    // Restore focus after re-render if input was previously focused
    // Only restore if we're not currently typing (to avoid interrupting user)
    useEffect(() => {
        if (focusedInputId.current && inputRefs.current[focusedInputId.current]) {
            const inputElement = inputRefs.current[focusedInputId.current];
            // Only restore focus if the element exists and isn't already focused
            // Use a small delay to ensure DOM is ready after re-render
            const timeoutId = setTimeout(() => {
                if (inputElement && document.activeElement !== inputElement && focusedInputId.current) {
                    // Check if user is still interacting with the input
                    const wasFocused = focusedInputId.current;
                    inputElement.focus();
                    // Restore cursor position to end
                    try {
                        const length = inputElement.value?.length || 0;
                        inputElement.setSelectionRange(length, length);
                    } catch (e) {
                        // Ignore selection range errors (e.g., for non-text inputs)
                    }
                    // Clear the focused input ID after restoring
                    if (focusedInputId.current === wasFocused) {
                        focusedInputId.current = null;
                    }
                }
            }, 0);
            
            return () => clearTimeout(timeoutId);
        }
    });

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
    const ColorInput = ({ label, value, onChange, colorPickerId, section, settingKey }) => {
        const isPickerOpen = selectedColorPicker === colorPickerId;
        const currentColor = value || '#ffffff';
        const pickerContainerRef = useRef(null);
        const inputRef = useRef(null);
        const [localValue, setLocalValue] = useState(currentColor);
        const inputId = `color-${colorPickerId}`;

        // Sync local value when prop value changes (from parent)
        useEffect(() => {
            if (value !== localValue && document.activeElement !== inputRef.current) {
                setLocalValue(value || '#ffffff');
            }
        }, [value]);

        // Store ref for focus restoration
        useEffect(() => {
            if (inputRef.current) {
                inputRefs.current[inputId] = inputRef.current;
            }
            return () => {
                delete inputRefs.current[inputId];
            };
        }, [inputId]);

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

        const handleInputChange = (e) => {
            const newValue = e.target.value;
            setLocalValue(newValue);
            // Use debounced update for text input when section/settingKey are provided
            if (section && settingKey) {
                debouncedUpdate(section, settingKey, newValue, inputId);
            }
        };

        const handleInputBlur = () => {
            // Update immediately on blur to ensure value is saved
            if (section && settingKey) {
                const currentCustomization = buttonCustomization || {};
                const currentSection = currentCustomization[section] || {};
                updateSettings('wishlist', 'button_customization', {
                    ...currentCustomization,
                    [section]: {
                        ...currentSection,
                        [settingKey]: localValue,
                    },
                });
            }
            focusedInputId.current = null;
        };

        const handleColorPickerChange = (color) => {
            const hexColor = color.hex;
            setLocalValue(hexColor);
            // Color picker changes should update immediately (not debounced)
            if (section && settingKey) {
                updateButtonCustomization(section, settingKey, hexColor);
            } else {
                onChange(hexColor);
            }
        };

        return (
            <div className="space-y-2">
                <Label className="text-sm">{label}</Label>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={pickerContainerRef}>
                        <div
                            className="w-10 h-10 rounded border-2 border-gray-200 cursor-pointer"
                            style={{ backgroundColor: localValue }}
                            onClick={() => setSelectedColorPicker(isPickerOpen ? null : colorPickerId)}
                        />
                        {isPickerOpen && (
                            <div className="absolute z-50 mt-2">
                                <Sketch
                                    color={localValue}
                                    onChange={handleColorPickerChange}
                                />
                            </div>
                        )}
                    </div>
                    <Input
                        ref={inputRef}
                        type="text"
                        value={localValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        placeholder="#ffffff"
                        className="flex-1 font-mono text-sm"
                    />
                </div>
            </div>
        );
    };

    // Button section component (reusable for product_page)
    const ButtonSection = ({ title, sectionKey, settings: sectionSettings }) => {
        // Local state for text inputs
        const [fontSize, setFontSize] = useState(sectionSettings.fontSize || '');
        const [iconSize, setIconSize] = useState(sectionSettings.iconSize || '');
        const [borderRadius, setBorderRadius] = useState(sectionSettings.borderRadius || '');
        
        const fontSizeRef = useRef(null);
        const iconSizeRef = useRef(null);
        const borderRadiusRef = useRef(null);
        
        const fontSizeId = `input-${sectionKey}-fontSize`;
        const iconSizeId = `input-${sectionKey}-iconSize`;
        const borderRadiusId = `input-${sectionKey}-borderRadius`;

        // Sync local state when prop values change (from parent)
        useEffect(() => {
            if (document.activeElement !== fontSizeRef.current) {
                setFontSize(sectionSettings.fontSize || '');
            }
            if (document.activeElement !== iconSizeRef.current) {
                setIconSize(sectionSettings.iconSize || '');
            }
            if (document.activeElement !== borderRadiusRef.current) {
                setBorderRadius(sectionSettings.borderRadius || '');
            }
        }, [sectionSettings.fontSize, sectionSettings.iconSize, sectionSettings.borderRadius]);

        // Store refs for focus restoration
        useEffect(() => {
            if (fontSizeRef.current) inputRefs.current[fontSizeId] = fontSizeRef.current;
            if (iconSizeRef.current) inputRefs.current[iconSizeId] = iconSizeRef.current;
            if (borderRadiusRef.current) inputRefs.current[borderRadiusId] = borderRadiusRef.current;
            return () => {
                delete inputRefs.current[fontSizeId];
                delete inputRefs.current[iconSizeId];
                delete inputRefs.current[borderRadiusId];
            };
        }, [fontSizeId, iconSizeId, borderRadiusId]);

        const handleTextInputChange = (value, key, ref, inputId) => {
            if (key === 'fontSize') setFontSize(value);
            else if (key === 'iconSize') setIconSize(value);
            else if (key === 'borderRadius') setBorderRadius(value);
            debouncedUpdate(sectionKey, key, value, inputId);
        };

        const handleTextInputBlur = (value, key) => {
            // Update immediately on blur
            updateButtonCustomization(sectionKey, key, value);
            focusedInputId.current = null;
        };

        return (
            <div className="space-y-4 pt-6">
                <Label className="text-base font-semibold">{title}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput
                        label={__('Background Color', 'wishcart')}
                        value={sectionSettings.backgroundColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'backgroundColor', value)}
                        colorPickerId={`${sectionKey}-bg`}
                        section={sectionKey}
                        settingKey="backgroundColor"
                    />
                    <ColorInput
                        label={__('Background Hover Color', 'wishcart')}
                        value={sectionSettings.backgroundHoverColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'backgroundHoverColor', value)}
                        colorPickerId={`${sectionKey}-bg-hover`}
                        section={sectionKey}
                        settingKey="backgroundHoverColor"
                    />
                    <ColorInput
                        label={__('Button Text Color', 'wishcart')}
                        value={sectionSettings.buttonTextColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'buttonTextColor', value)}
                        colorPickerId={`${sectionKey}-btn-text`}
                        section={sectionKey}
                        settingKey="buttonTextColor"
                    />
                    <ColorInput
                        label={__('Button Text Hover Color', 'wishcart')}
                        value={sectionSettings.buttonTextHoverColor}
                        onChange={(value) => updateButtonCustomization(sectionKey, 'buttonTextHoverColor', value)}
                        colorPickerId={`${sectionKey}-btn-text-hover`}
                        section={sectionKey}
                        settingKey="buttonTextHoverColor"
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
                            ref={fontSizeRef}
                            type="text"
                            value={fontSize}
                            onChange={(e) => handleTextInputChange(e.target.value, 'fontSize', fontSizeRef, fontSizeId)}
                            onBlur={() => handleTextInputBlur(fontSize, 'fontSize')}
                            placeholder="16px"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{__('Icon Size', 'wishcart')}</Label>
                        <Input
                            ref={iconSizeRef}
                            type="text"
                            value={iconSize}
                            onChange={(e) => handleTextInputChange(e.target.value, 'iconSize', iconSizeRef, iconSizeId)}
                            onBlur={() => handleTextInputBlur(iconSize, 'iconSize')}
                            placeholder="16px"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm">{__('Border Radius', 'wishcart')}</Label>
                        <Input
                            ref={borderRadiusRef}
                            type="text"
                            value={borderRadius}
                            onChange={(e) => handleTextInputChange(e.target.value, 'borderRadius', borderRadiusRef, borderRadiusId)}
                            onBlur={() => handleTextInputBlur(borderRadius, 'borderRadius')}
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
                {/* Product Page Button Section */}
                <ButtonSection
                    title={__('"Add To Wishlist" Product Page Button', 'wishcart')}
                    sectionKey="product_page"
                    settings={productPage}
                />

                {/* Saved to Wishlist Product Page Button Section */}
                <ButtonSection
                    title={__('"Saved to Wishlist" Product Page Button', 'wishcart')}
                    sectionKey="saved_product_page"
                    settings={savedProductPage}
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
                <LabelsSection labels={labels} />
            </div>

            {/* Live Preview Section */}
            <div className="wishcart-preview-wrapper">
                <ButtonPreview buttonCustomization={buttonCustomization} />
            </div>
        </div>
    );
};

export default ButtonCustomizationSettings;
