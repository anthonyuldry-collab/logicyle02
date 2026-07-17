import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { AddressSuggestion, geocodeAddress, searchAddressSuggestions } from '../utils/accommodationGeoUtils';

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  onBlurGeocode?: (point: { lat: number; lng: number } | null) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  latitude?: number;
  longitude?: number;
  cityHint?: string;
}

const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onChange,
  onSelect,
  onBlurGeocode,
  placeholder,
  className = '',
  rows = 2,
  latitude,
  longitude,
  cityHint,
}) => {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedFromListRef = useRef(false);

  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const hasText = value.trim().length > 0;

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3 || selectedFromListRef.current) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAddressSuggestions(q, 6, cityHint);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setActiveIndex(-1);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value, cityHint]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pickSuggestion = (suggestion: AddressSuggestion) => {
    selectedFromListRef.current = true;
    onChange(suggestion.label);
    onSelect?.(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    window.setTimeout(() => {
      selectedFromListRef.current = false;
    }, 0);
  };

  const handleBlur = async () => {
    window.setTimeout(() => setIsOpen(false), 120);
    if (!onBlurGeocode || selectedFromListRef.current) return;
    const address = value.trim();
    if (!address) {
      onBlurGeocode(null);
      return;
    }
    if (hasCoords) return;
    setIsGeocoding(true);
    try {
      const point = await geocodeAddress(address);
      onBlurGeocode(point);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(prev => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onBlur={() => void handleBlur()}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-white/15 bg-slate-900 shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.label}-${suggestion.lat}-${suggestion.lng}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(suggestion)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  index === activeIndex
                    ? 'bg-indigo-500/25 text-white'
                    : 'text-slate-200 hover:bg-white/5'
                }`}
              >
                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                <span className="leading-snug">{suggestion.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-1 flex items-center gap-1.5 text-[11px] leading-snug">
        {isSearching || isGeocoding ? (
          <span className="text-slate-400">Recherche de l&apos;adresse…</span>
        ) : hasCoords ? (
          <>
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-300">
              Adresse validée · GPS {latitude!.toFixed(4)}, {longitude!.toFixed(4)}
            </span>
          </>
        ) : hasText ? (
          <>
            <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-amber-300">
              Choisissez une suggestion ou complétez l&apos;adresse (n°, ville, code postal)
            </span>
          </>
        ) : (
          <span className="text-slate-400">
            Commencez à taper, puis sélectionnez une adresse dans la liste
          </span>
        )}
      </div>
    </div>
  );
};

export default AddressAutocompleteInput;
