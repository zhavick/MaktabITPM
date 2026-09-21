import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

/**
 * Select2 Searchable Dropdown Component
 * Props:
 * - options: Array of { value, label, subLabel?, badge?, avatar? }
 * - value: Selected value or Array of values if isMulti is true
 * - onChange: (selectedValue) => void
 * - placeholder: string
 * - isMulti: boolean
 * - isClearable: boolean
 * - disabled: boolean
 */
export default function Select2({
  options = [],
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  isMulti = false,
  isClearable = true,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    const labelMatch = opt.label?.toLowerCase().includes(search.toLowerCase());
    const subMatch = opt.subLabel?.toLowerCase().includes(search.toLowerCase());
    return labelMatch || subMatch;
  });

  const isSelected = (optValue) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(optValue);
    }
    return value === optValue;
  };

  const handleSelect = (opt) => {
    if (isMulti) {
      const current = Array.isArray(value) ? [...value] : [];
      if (current.includes(opt.value)) {
        onChange(current.filter((v) => v !== opt.value));
      } else {
        onChange([...current, opt.value]);
      }
    } else {
      onChange(opt.value);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(isMulti ? [] : null);
  };

  const selectedLabels = () => {
    if (isMulti) {
      if (!Array.isArray(value) || value.length === 0) return null;
      return options
        .filter((o) => value.includes(o.value))
        .map((o) => (
          <span key={o.value} className="badge badge-primary" style={{ textTransform: 'none', marginRight: 4 }}>
            {o.label}
          </span>
        ));
    }
    const found = options.find((o) => o.value === value);
    return found ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {found.avatar && (
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4f46e5', color: '#fff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {found.label.charAt(0)}
          </div>
        )}
        <span>{found.label}</span>
        {found.badge && <span className="badge badge-secondary">{found.badge}</span>}
      </div>
    ) : null;
  };

  return (
    <div className="select2-container" ref={containerRef}>
      <div
        className={`select2-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, flex: 1, minHeight: 22 }}>
          {selectedLabels() || <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isClearable && value && (!isMulti || value.length > 0) && (
            <X size={16} onClick={handleClear} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
          )}
          <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {isOpen && (
        <div className="select2-dropdown">
          <div className="select2-search-box">
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="select2-search-input"
              placeholder="Cari..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="select2-options-list">
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Tidak ada opsi ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const selected = isSelected(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={`select2-option ${selected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {opt.avatar && (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: selected ? '#ffffff' : '#4f46e5', color: selected ? '#4f46e5' : '#ffffff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {opt.label.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: selected ? 700 : 500 }}>{opt.label}</div>
                        {opt.subLabel && (
                          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{opt.subLabel}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {opt.badge && (
                        <span className={`badge ${selected ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                          {opt.badge}
                        </span>
                      )}
                      {selected && <Check size={14} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
