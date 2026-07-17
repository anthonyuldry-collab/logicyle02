import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getUrineColorMeta, URINE_COLOR_SCALE } from '../utils/trainingCampUtils';

interface UrineColorPickerProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  compact?: boolean;
}

const UrineColorPicker: React.FC<UrineColorPickerProps> = ({
  value,
  onChange,
  disabled = false,
  compact = true,
}) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = getUrineColorMeta(value);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 272;
    const padding = 8;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - menuWidth - padding);
    }
    let top = rect.bottom + 4;
    const estimatedHeight = 340;
    if (top + estimatedHeight > window.innerHeight - padding && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 4;
    }
    setMenuPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open]);

  const menu =
    open && !disabled && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Couleur urine"
            className="fixed z-[9999] w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-2"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1 mb-1.5">
              Couleur urine
            </p>
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              {URINE_COLOR_SCALE.map((item) => {
                const active = value === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      active ? 'bg-sky-50 ring-1 ring-sky-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="shrink-0 w-7 h-7 rounded-md border border-black/10 shadow-sm"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-gray-800">
                        {item.value}. {item.label}
                      </span>
                      <span className="block text-[10px] text-gray-500 truncate">{item.status}</span>
                    </span>
                  </button>
                );
              })}
              {value !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined);
                    setOpen(false);
                  }}
                  className="w-full text-center text-[11px] text-gray-500 hover:text-gray-700 py-1.5 mt-1 border-t border-gray-100"
                >
                  Effacer
                </button>
              )}
            </div>
            <p className="text-[9px] text-gray-400 px-1 pt-1.5 border-t border-gray-100 mt-1">
              Indicateur d’hydratation — pas un diagnostic médical.
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${compact ? 'min-w-[4.5rem]' : 'w-full'}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={
          selected
            ? `${selected.label} — ${selected.status}`
            : 'Sélectionner la couleur urine'
        }
        className={`flex items-center gap-1.5 w-full rounded border px-1.5 py-1 text-left transition-colors ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200'
            : 'bg-white border-gray-300 hover:border-sky-400'
        }`}
      >
        <span
          className="shrink-0 w-5 h-5 rounded-full border border-black/15 shadow-inner"
          style={{ backgroundColor: selected?.hex || '#e5e7eb' }}
        />
        {!compact && (
          <span className="text-xs text-gray-700 truncate">
            {selected ? selected.label : 'Couleur…'}
          </span>
        )}
        {compact && (
          <span className="text-[10px] text-gray-500 font-medium">
            {selected ? selected.value : '—'}
          </span>
        )}
      </button>
      {menu}
    </div>
  );
};

export default UrineColorPicker;
