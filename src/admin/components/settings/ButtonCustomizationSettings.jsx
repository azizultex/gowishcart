import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { __ } from '@wordpress/i18n';
import { Heart, ShoppingCart, X } from 'lucide-react';
import IconPicker from './IconPicker';
import * as LucideIcons from 'lucide-react';
import ButtonPreview from './ButtonPreview';

const ButtonCustomizationSettings = ({ settings, updateSettings }) => {
    const wishlistSettings = settings.wishlist || {};
    const buttonCustomization = wishlistSettings.button_customization || {};
    
    // Local state for button customization (prevents re-renders during input focus)
    const [localButtonCustomization, setLocalButtonCustomization] = useState(buttonCustomization);
    // Ref to track latest local state for use in callbacks
    const localButtonCustomizationRef = useRef(buttonCustomization);
    
    // Debounce timer refs for each input
    const debounceTimers = useRef({});
    // Refs to track focused inputs
    const inputRefs = useRef({});
    // Track which input was focused before re-render
    const focusedInputId = useRef(null);
    // Track if any input is currently focused (prevents parent state updates)
    const isAnyInputFocused = useRef(false);
    
    // Sync local state with props when props change AND no input is focused
    useEffect(() => {
        if (!isAnyInputFocused.current) {
            setLocalButtonCustomization(buttonCustomization);
            localButtonCustomizationRef.current = buttonCustomization;
        }
    }, [buttonCustomization]);
    
    // Keep ref in sync with local state
    useEffect(() => {
        localButtonCustomizationRef.current = localButtonCustomization;
    }, [localButtonCustomization]);
    
    // New structure: product_page, product_listing
    // Use local state for derived values to prevent re-renders
    const productPage = localButtonCustomization.product_page || {
        backgroundColor: 'linear-gradient(180deg, #ffffff29, #fff0), #253241',
        backgroundHoverColor: 'linear-gradient(180deg, #ffffff29, #fff0), #253241',
        buttonTextColor: '#ffffff',
        buttonTextHoverColor: '#ffffff',
        font: 'Manrope, sans-serif',
        fontSize: '14px',
        iconSize: '14px',
        borderRadius: '8px'
    };
    const savedProductPage = localButtonCustomization.saved_product_page || {
        backgroundColor: 'linear-gradient(180deg, #ffffff29, #fff0), #253241',
        backgroundHoverColor: 'linear-gradient(180deg, #ffffff29, #fff0), #253241',
        buttonTextColor: '#ffffff',
        buttonTextHoverColor: '#ffffff',
        font: 'Manrope, sans-serif',
        fontSize: '14px',
        iconSize: '14px',
        borderRadius: '8px'
    };
    const savedProductListing = localButtonCustomization.saved_product_listing || {
        backgroundColor: '#ebe9eb',
        backgroundHoverColor: '#dad8da',
        buttonTextColor: '#515151',
        buttonTextHoverColor: '#515151',
        font: 'Manrope, sans-serif',
        fontSize: '14px',
        iconSize: '14px',
        borderRadius: '3px'
    };
    
    // Icon structure: support both old (single icon) and new (separate icons) format
    // Migrate old format to new format if needed
    // Use useMemo to recompute when localButtonCustomization.icon changes
    const { addToWishlistIcon, savedWishlistIcon } = useMemo(() => {
        const oldIcon = localButtonCustomization.icon;
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
    }, [localButtonCustomization.icon]);
    
    const labels = localButtonCustomization.labels || { add: '', saved: '' };
    const buttonStyle = localButtonCustomization.buttonStyle || 'button';

    // Helper to normalize color values to a safe HEX value for the HTML5 color input
    const normalizeHexColor = (value, fallback = '#ffffff') => {
        if (!value || typeof value !== 'string') {
            return fallback;
        }

        let color = value.trim();

        // If the value looks like a gradient or anything non-hex, fall back
        if (!color.startsWith('#')) {
            return fallback;
        }

        // Support short HEX (#abc)
        const shortHexMatch = color.match(/^#([0-9a-fA-F]{3})$/);
        if (shortHexMatch) {
            const [r, g, b] = shortHexMatch[1].split('');
            return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
        }

        // Support full HEX (#aabbcc)
        const fullHexMatch = color.match(/^#([0-9a-fA-F]{6})$/);
        if (fullHexMatch) {
            return `#${fullHexMatch[0].slice(1).toLowerCase()}`.padStart(7, '#');
        }

        return fallback;
    };
    
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
        };

        const handleAddLabelFocus = () => {
            isAnyInputFocused.current = true;
        };

        const handleAddLabelBlur = () => {
            isAnyInputFocused.current = false;
            updateButtonCustomization('labels', 'add', addLabel);
            focusedInputId.current = null;
        };

        const handleSavedLabelChange = (e) => {
            const value = e.target.value;
            setSavedLabel(value);
        };

        const handleSavedLabelFocus = () => {
            isAnyInputFocused.current = true;
        };

        const handleSavedLabelBlur = () => {
            isAnyInputFocused.current = false;
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
                        onFocus={handleAddLabelFocus}
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
                        onFocus={handleSavedLabelFocus}
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
        { value: 'Manrope, sans-serif', label: 'Manrope, sans-serif' },
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
    
    // Immediate update function (for non-text inputs like selects, color pickers)
    const updateButtonCustomization = useCallback((section, key, value) => {
        // Always update local state immediately for preview
        setLocalButtonCustomization(prev => {
            const currentSection = prev[section] || {};
            return {
                ...prev,
                [section]: {
                    ...currentSection,
                    [key]: value,
                },
            };
        });
        
        // Only update parent state if no input is focused
        if (!isAnyInputFocused.current) {
            const currentCustomization = localButtonCustomizationRef.current || {};
            const currentSection = currentCustomization[section] || {};
            
            updateSettings('wishlist', 'button_customization', {
                ...currentCustomization,
                [section]: {
                    ...currentSection,
                    [key]: value,
                },
            });
        }
    }, [updateSettings]);

    // Handler for top-level properties (like buttonStyle)
    const updateTopLevelProperty = useCallback((key, value) => {
        // Always update local state immediately for preview
        setLocalButtonCustomization(prev => ({
            ...prev,
            [key]: value,
        }));
        
        // Update parent state immediately
        const currentCustomization = localButtonCustomizationRef.current || {};
        updateSettings('wishlist', 'button_customization', {
            ...currentCustomization,
            [key]: value,
        });
    }, [updateSettings]);
    
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
        // Always update local state immediately for preview
        setLocalButtonCustomization(prev => {
            const currentIcon = prev.icon || {};
            const targetIcon = currentIcon[iconType] || { type: 'predefined', value: 'Heart', customUrl: '' };
            return {
                ...prev,
                icon: {
                    ...currentIcon,
                    [iconType]: {
                        ...targetIcon,
                        [property]: value,
                    },
                },
            };
        });
        
        // Only update parent state if no input is focused
        if (!isAnyInputFocused.current) {
            const currentCustomization = localButtonCustomizationRef.current || {};
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
        }
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
            // Always update local state immediately for preview
            setLocalButtonCustomization(prev => {
                const currentIcon = prev.icon || {};
                const targetIcon = currentIcon[iconType] || { type: 'predefined', value: 'Heart', customUrl: '' };
                return {
                    ...prev,
                    icon: {
                        ...currentIcon,
                        [iconType]: {
                            ...targetIcon,
                            type: 'custom',
                            customUrl: imageUrl
                        },
                    },
                };
            });
            
            // Only update parent state if no input is focused
            if (!isAnyInputFocused.current) {
                const currentCustomization = localButtonCustomizationRef.current || {};
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
            }
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

    // Color input component using HTML5 input type="color" plus a HEX text field
    const ColorInput = ({ label, value, onChange, colorPickerId, section, settingKey }) => {
        const inputRef = useRef(null);
        const colorInputRef = useRef(null);
        const [localValue, setLocalValue] = useState(value || '#ffffff');
        const inputId = `color-${colorPickerId}`;

        // Sync local value when prop value changes (from parent)
        useEffect(() => {
            if (value !== localValue && document.activeElement !== inputRef.current && document.activeElement !== colorInputRef.current) {
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

        const handleTextChange = (e) => {
            const newValue = e.target.value;
            setLocalValue(newValue);
        };

        const handleTextFocus = () => {
            isAnyInputFocused.current = true;
        };

        const handleTextBlur = () => {
            isAnyInputFocused.current = false;

            // Normalize to a valid HEX color for storage
            const normalized = normalizeHexColor(localValue, '#ffffff');
            setLocalValue(normalized);

            if (section && settingKey) {
                updateButtonCustomization(section, settingKey, normalized);
            } else if (onChange) {
                onChange(normalized);
            }

            focusedInputId.current = null;
        };

        const handleColorInputChange = (e) => {
            const hexColor = e.target.value;
            setLocalValue(hexColor); // Update local component state
        };

        const handleColorInputBlur = () => {
            // Update parent state when color picker closes (user clicks outside)
            const normalized = normalizeHexColor(localValue, '#ffffff');
            setLocalValue(normalized);

            if (section && settingKey) {
                updateButtonCustomization(section, settingKey, normalized);
            } else if (onChange) {
                onChange(normalized);
            }
        };

        const colorPickerValue = normalizeHexColor(localValue || value, '#ffffff');

        return (
            <div className="space-y-2">
                <Label className="text-sm">{label}</Label>
                <div className="flex items-center gap-2">
                    <input
                        ref={colorInputRef}
                        type="color"
                        value={colorPickerValue}
                        onChange={handleColorInputChange}
                        onBlur={handleColorInputBlur}
                        className="w-10 h-10 rounded border-2 border-gray-200 cursor-pointer bg-transparent p-0"
                        aria-label={label}
                    />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={localValue}
                        onChange={handleTextChange}
                        onFocus={handleTextFocus}
                        onBlur={handleTextBlur}
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
        };

        const handleTextInputFocus = () => {
            isAnyInputFocused.current = true;
        };

        const handleTextInputBlur = (value, key) => {
            isAnyInputFocused.current = false;
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
                            onFocus={handleTextInputFocus}
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
                            onFocus={handleTextInputFocus}
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
                            onFocus={handleTextInputFocus}
                            onBlur={() => handleTextInputBlur(borderRadius, 'borderRadius')}
                            placeholder="3px"
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Button style options
    const buttonStyleOptions = [
        { value: 'button', label: __('Button (Text + Icon)', 'wishcart') },
        { value: 'text-only', label: __('Text Only', 'wishcart') },
        { value: 'text-only-link', label: __('Text Only (No Button)', 'wishcart') },
        { value: 'text-icon-link', label: __('Text with Icon (No Button)', 'wishcart') },
        { value: 'icon-only', label: __('Icon Only', 'wishcart') },
    ];

    return (
        <div className="wishcart-button-customization-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
                {/* Settings Section */}
            <div className="wishcart-settings-section">
                {/* General Settings Section */}
                <div className="space-y-4 pb-6 border-b">
                    <Label className="text-base font-semibold">{__('General Settings', 'wishcart')}</Label>
                    <div className="space-y-2">
                        <Label className="text-sm">{__('Button Style', 'wishcart')}</Label>
                        <Select
                            value={buttonStyle}
                            onValueChange={(value) => updateTopLevelProperty('buttonStyle', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={__('Select button style', 'wishcart')} />
                            </SelectTrigger>
                            <SelectContent>
                                {buttonStyleOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            {__('Choose how the wishlist button should be displayed', 'wishcart')}
                        </p>
                    </div>
                </div>

                {/* Button Section */}
                <ButtonSection
                    title={__('"Add To Wishlist" Button', 'wishcart')}
                    sectionKey="product_page"
                    settings={productPage}
                />

                {/* Saved to Wishlist Button Section */}
                <ButtonSection
                    title={__('"Saved to Wishlist" Button', 'wishcart')}
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
                <ButtonPreview buttonCustomization={localButtonCustomization} />
            </div>
        </div>
    );
};

export default ButtonCustomizationSettings;
