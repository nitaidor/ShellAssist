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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`custom-dropdown-btn text-sm font-medium rounded-md px-3 py-2.5 shadow-sm transition-colors h-10 flex items-center justify-between gap-2.5 min-w-[125px] w-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && !disabled && (
        <div className="absolute left-0 mt-1 min-w-full w-max max-w-[320px] max-h-60 overflow-y-auto bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt, idx) => {
            if (opt === '──────────') return <div key={`sep-${idx}`} className="my-1 border-t border-[#30363d] pointer-events-none" />;
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`theme-menu-item w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between gap-4 ${isSelected ? 'font-bold active-variant' : 'font-medium hover:bg-[#30363d]'}`}
              >
                <span className="truncate">{opt}</span>
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