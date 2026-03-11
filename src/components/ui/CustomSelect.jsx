import React from 'react';
import Select from 'react-select';
import { ChevronDown } from 'lucide-react';

/**
 * Custom Select component styled to match FluentCart design
 * A wrapper around react-select with consistent FluentCart styling
 */
const CustomSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder = "Select...", 
    isDisabled = false,
    className = "",
    isSearchable = false,
    isClearable = false,
    ...props 
}) => {
    // gowishcart-inspired custom styles
    const customStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '38px',
            backgroundColor: '#ffffff',
            borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: '4px',
            boxShadow: state.isFocused 
                ? '0 0 0 2px rgba(59, 130, 246, 0.1)' 
                : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
            },
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '2px 12px',
            fontSize: '14px',
        }),
        singleValue: (base) => ({
            ...base,
            color: '#111827',
            fontWeight: '500',
            fontSize: '14px',
        }),
        placeholder: (base) => ({
            ...base,
            color: '#9ca3af',
            fontSize: '14px',
        }),
        input: (base) => ({
            ...base,
            color: '#111827',
            fontSize: '14px',
            margin: '0',
            padding: '0',
        }),
        indicatorSeparator: () => ({
            display: 'none',
        }),
        dropdownIndicator: (base, state) => ({
            ...base,
            color: '#6b7280',
            padding: '8px',
            transition: 'all 0.2s ease',
            transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            '&:hover': {
                color: '#374151',
            },
        }),
        menu: (base) => ({
            ...base,
            marginTop: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            zIndex: 9999,
        }),
        menuList: (base) => ({
            ...base,
            padding: '0',
            maxHeight: '300px',
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isDisabled
                ? '#f9fafb'
                : state.isSelected 
                    ? '#f3f4f6' 
                    : state.isFocused 
                        ? '#f9fafb' 
                        : '#ffffff',
            color: state.isDisabled 
                ? '#9ca3af'
                : state.isSelected ? '#111827' : '#374151',
            cursor: state.isDisabled ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: state.isSelected ? '600' : '400',
            padding: '12px 16px',
            transition: 'background-color 0.15s ease',
            opacity: state.isDisabled ? 0.6 : 1,
            '&:active': {
                backgroundColor: state.isDisabled ? '#f9fafb' : '#f3f4f6',
            },
        }),
        noOptionsMessage: (base) => ({
            ...base,
            fontSize: '14px',
            color: '#6b7280',
            padding: '12px 16px',
        }),
    };

    // Custom dropdown indicator component
    const DropdownIndicator = () => (
        <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center' }}>
            <ChevronDown size={16} style={{ color: '#6b7280' }} />
        </div>
    );

    return (
        <Select
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            isDisabled={isDisabled}
            isSearchable={isSearchable}
            isClearable={isClearable}
            styles={customStyles}
            className={className}
            classNamePrefix="custom-select"
            components={{
                DropdownIndicator,
            }}
            {...props}
        />
    );
};

export default CustomSelect;

