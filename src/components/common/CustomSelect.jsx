import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomSelect = ({ value, onChange, options = [], disabled = false, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getOptionValue = (opt) => (typeof opt === 'object' && opt !== null ? opt.value : opt);
  const getOptionLabel = (opt) => (typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt);
  const getOptionBadge = (opt) => (typeof opt === 'object' && opt !== null ? opt.badge : null);

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
        <div className="absolute left-0 mt-1 min-w-full w-max max-w-[340px] max-h-60 overflow-y-auto bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt, idx) => {
            const optVal = getOptionValue(opt);
            if (optVal === '──────────') return <div key={`sep-${idx}`} className="my-1 border-t border-[#30363d] pointer-events-none" />;
            const optLabel = getOptionLabel(opt);
            const optBadge = getOptionBadge(opt);
            const isSelected = optVal === value;
            return (
              <button
                key={optVal}
                type="button"
                onClick={() => { onChange(optVal); setIsOpen(false); }}
                className={`theme-menu-item w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between gap-3 ${isSelected ? 'font-bold active-variant' : 'font-medium hover:bg-[#30363d]'}`}
              >
                <span className="truncate">{optLabel}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {optBadge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider saved-item-badge">
                      {optBadge}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;