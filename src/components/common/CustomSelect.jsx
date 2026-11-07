import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomSelect = ({
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  alignRight = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuListRef = useRef(null);
  const selectedItemRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll the dropdown menu when opened so the selected / best installed model sits at the top of the view
  useEffect(() => {
    if (isOpen && menuListRef.current && selectedItemRef.current) {
      menuListRef.current.scrollTop = Math.max(0, selectedItemRef.current.offsetTop - 4);
    }
  }, [isOpen]);

  const getOptionValue = (opt) => (typeof opt === 'object' && opt !== null ? opt.value : opt);
  const getOptionLabel = (opt) => (typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt);
  const getOptionBadge = (opt) => (typeof opt === 'object' && opt !== null ? opt.badge : null);
  const getOptionDisabled = (opt) => (typeof opt === 'object' && opt !== null ? Boolean(opt.disabled) : false);

  const selectedOption = options.find((opt) => getOptionValue(opt) === value);
  const displayLabel = selectedOption ? getOptionLabel(selectedOption) : value;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`custom-dropdown-btn text-sm font-medium rounded-md px-3 py-2.5 shadow-sm transition-colors h-10 flex items-center justify-between gap-2.5 min-w-[125px] w-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && !disabled && (
        <div
          ref={menuListRef}
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} mt-1 min-w-full w-max max-w-[380px] max-h-64 overflow-y-auto bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100`}
        >
          {options.map((opt, idx) => {
            const optVal = getOptionValue(opt);
            if (optVal === '──────────') return <div key={`sep-${idx}`} className="my-1 border-t border-[#30363d] pointer-events-none" />;
            const optLabel = getOptionLabel(opt);
            const optBadge = getOptionBadge(opt);
            const optDisabled = getOptionDisabled(opt);
            const isSelected = optVal === value;

            return (
              <button
                key={optVal}
                ref={isSelected ? selectedItemRef : null}
                type="button"
                disabled={optDisabled}
                onClick={() => {
                  if (!optDisabled) {
                    onChange(optVal);
                    setIsOpen(false);
                  }
                }}
                className={`theme-menu-item w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between gap-3 ${
                  optDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isSelected
                    ? 'font-bold active-variant'
                    : 'font-medium hover:bg-[#30363d]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{optLabel}</span>
                  {optBadge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider saved-item-badge shrink-0">
                      {optBadge}
                    </span>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;