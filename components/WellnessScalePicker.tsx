import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  WellnessScaleKey,
  WellnessScaleLevel,
  getWellnessScaleMeta,
  getWellnessScaleOptions,
} from '../utils/trainingCampUtils';

interface WellnessScalePickerProps {
  scale: WellnessScaleKey;
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  /** `segmented` = pastilles 1–5 (vue athlète) ; `dropdown` = menu compact (grille staff). */
  variant?: 'dropdown' | 'segmented';
}

/** Sélecteur 1–5 avec libellés coach (fatigue, moral, courbatures…). */
const WellnessScalePicker: React.FC<WellnessScalePickerProps> = ({
  scale,
  value,
  onChange,
  disabled = false,
  variant = 'dropdown',
}) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const options = getWellnessScaleOptions(scale);
  const selected = getWellnessScaleMeta(scale, value);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 240;
    const padding = 8;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - menuWidth - padding);
    }
    let top = rect.bottom + 4;
    const estimatedHeight = 280;
    if (top + estimatedHeight > window.innerHeight - padding && rect.top > estimatedHeight) {
      top = Math.max(padding, rect.top - estimatedHeight - 4);
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

  const toneClass = (level: WellnessScaleLevel) => {
    // Pour fatigue / courbatures : 1 = bien (vert), 5 = mauvais (rouge)
    // Pour moral / appétit / sommeil : 1 = mauvais, 5 = bien
    const inverted = scale === 'fatigue' || scale === 'muscleSoreness';
    const score = inverted ? 6 - level : level;
    if (score <= 2) return 'bg-red-950 border-red-500/50 text-red-100';
    if (score === 3) return 'bg-amber-950 border-amber-500/50 text-amber-100';
    return 'bg-emerald-950 border-emerald-500/50 text-emerald-100';
  };

  const menu =
    open && !disabled && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="fixed z-[9999] w-60 rounded-xl border border-gray-200 bg-white shadow-xl p-2"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1 mb-1.5">
              {options.title} — échelle 1 à 5
            </p>
            <p className="text-[10px] text-gray-500 px-1 mb-2">{options.hint}</p>
            <div className="space-y-0.5">
              {options.levels.map((item) => {
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
                      active ? 'ring-1 ring-sky-300 bg-sky-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center border ${toneClass(
                        item.value,
                      )}`}
                    >
                      {item.value}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-gray-800">{item.label}</span>
                      <span className="block text-[10px] text-gray-500">{item.detail}</span>
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
          </div>,
          document.body,
        )
      : null;

  if (variant === 'segmented') {
    return (
      <div className="w-full space-y-1.5">
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={options.title}>
          {options.levels.map((item) => {
            const active = value === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                title={`${item.label} — ${item.detail}`}
                onClick={() => onChange(active ? undefined : item.value)}
                className={`flex flex-col items-center justify-center rounded-xl border px-1 py-2 transition-colors ${
                  disabled ? 'opacity-60 cursor-not-allowed' : ''
                } ${
                  active
                    ? `${toneClass(item.value)} ring-1 ring-sky-400/60`
                    : 'bg-slate-950 border-white/15 text-slate-300 hover:border-sky-400/50 hover:bg-slate-800'
                }`}
              >
                <span className="text-sm font-bold tabular-nums leading-none text-inherit">{item.value}</span>
                <span className="mt-1 text-[9px] font-medium leading-tight text-center line-clamp-2 text-inherit opacity-90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="text-[11px] text-slate-300 px-0.5">{selected.detail}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-[6.5rem]">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={selected ? `${selected.label} — ${selected.detail}` : options.hint}
        className={`flex items-center gap-1.5 w-full rounded border px-1.5 py-1 text-left transition-colors ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200'
            : selected
              ? toneClass(selected.value)
              : 'bg-white border-gray-300 hover:border-sky-400 text-gray-500'
        }`}
      >
        {selected ? (
          <>
            <span className="text-[11px] font-bold tabular-nums">{selected.value}</span>
            <span className="text-[10px] font-medium truncate">{selected.label}</span>
          </>
        ) : (
          <span className="text-[10px] text-gray-400">Choisir…</span>
        )}
      </button>
      {menu}
    </div>
  );
};

export default WellnessScalePicker;
