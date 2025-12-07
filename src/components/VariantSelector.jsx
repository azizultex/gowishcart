import React from 'react';
import CustomSelect from './ui/CustomSelect';
import '../styles/VariantSelector.scss';

const VariantSelector = ({ variants, selectedVariantId, onVariantChange, productId, className = '' }) => {
    if (!variants || variants.length === 0) {
        return null;
    }

    // Format price helper
    const formatPrice = (price) => {
        if (!price && price !== 0) return '';
        const currency = 'USD'; // You might want to get this from settings
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(price);
    };

    // Build options for the select dropdown
    const options = variants.map((variant) => {
        const variantId = variant.id || variant.variation_id || variant.ID;
        const price = variant.price || variant.item_price ? 
            (variant.item_price ? variant.item_price / 100 : variant.price) : 
            (variant.price || 0);
        const regularPrice = variant.regular_price || 
            (variant.compare_price ? variant.compare_price / 100 : null);
        const isOnSale = regularPrice && regularPrice > price;
        
        // Build label with variant name and price
        let label = variant.name || variant.title || `Variant ${variantId}`;
        if (isOnSale) {
            label += ` - ${formatPrice(price)} (was ${formatPrice(regularPrice)})`;
        } else {
            label += ` - ${formatPrice(price)}`;
        }

        return {
            value: variantId.toString(),
            label: label,
            variant: variant,
        };
    });

    // Find selected option
    const selectedOption = options.find(opt => 
        opt.value === selectedVariantId?.toString() || 
        opt.value === selectedVariantId
    ) || (options.length > 0 ? options[0] : null);

    const handleChange = (selectedOption) => {
        if (selectedOption && onVariantChange) {
            const variant = selectedOption.variant;
            const variantId = variant.id || variant.variation_id || variant.ID;
            onVariantChange(variantId, variant);
        }
    };

    return (
        <div className={`variant-selector ${className}`}>
            <CustomSelect
                options={options}
                value={selectedOption}
                onChange={handleChange}
                placeholder="Select variant"
                className="variant-select"
            />
        </div>
    );
};

export default VariantSelector;

