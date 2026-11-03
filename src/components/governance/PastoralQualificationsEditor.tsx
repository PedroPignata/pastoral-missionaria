import React from 'react';
import { Check } from 'lucide-react';

export const QUALIFICATIONS_OPTIONS = [
  'Intercessão',
  'Pregação',
  'Formação',
  'Testemunho',
  'Música',
  'Condução de oração',
  'Animação',
  'Apoio',
] as const;

export type PastoralQualification = (typeof QUALIFICATIONS_OPTIONS)[number];

interface PastoralQualificationsEditorProps {
  selectedQualifications: string[];
  onChange: (qualifications: string[]) => void;
  disabled?: boolean;
  variant?: 'cards' | 'chips';
  showHelperText?: boolean;
  className?: string;
}

export const PastoralQualificationsEditor: React.FC<PastoralQualificationsEditorProps> = ({
  selectedQualifications = [],
  onChange,
  disabled = false,
  variant = 'cards',
  showHelperText = true,
  className = '',
}) => {
  const safeSelected = Array.isArray(selectedQualifications) ? selectedQualifications : [];

  const handleToggle = (qual: string) => {
    if (disabled) return;
    if (safeSelected.includes(qual)) {
      onChange(safeSelected.filter((q) => q !== qual));
    } else {
      onChange([...safeSelected, qual]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([...QUALIFICATIONS_OPTIONS]);
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header controls: Counter + Actions */}
      <div className="flex items-center justify-between text-xs px-0.5">
        <span className="text-zinc-600 font-medium">
          <strong className="text-pastoral-cafe font-bold">{safeSelected.length}</strong> de{' '}
          {QUALIFICATIONS_OPTIONS.length} selecionadas
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || safeSelected.length === QUALIFICATIONS_OPTIONS.length}
            onClick={handleSelectAll}
            className="text-[11px] font-bold text-pastoral-vinho hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
          >
            Marcar Todas
          </button>
          <span className="text-zinc-300">|</span>
          <button
            type="button"
            disabled={disabled || safeSelected.length === 0}
            onClick={handleClearAll}
            className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 disabled:opacity-40 cursor-pointer"
          >
            Desmarcar
          </button>
        </div>
      </div>

      {/* Variant Cards: Detailed grid with checkboxes */}
      {variant === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {QUALIFICATIONS_OPTIONS.map((qual) => {
            const isSelected = safeSelected.includes(qual);
            return (
              <button
                key={qual}
                type="button"
                disabled={disabled}
                onClick={() => handleToggle(qual)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-pastoral-cafe text-pastoral-creme border-pastoral-cafe shadow-xs font-bold'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-medium'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className="text-xs">{qual}</span>
                {isSelected ? (
                  <div className="w-4 h-4 rounded-full bg-pastoral-dourado text-pastoral-profundo flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Variant Chips: Compact wrap for dense forms */
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200">
          {QUALIFICATIONS_OPTIONS.map((qual) => {
            const isSelected = safeSelected.includes(qual);
            return (
              <button
                key={qual}
                type="button"
                disabled={disabled}
                onClick={() => handleToggle(qual)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-pastoral-cafe text-pastoral-dourado-claro shadow-2xs border border-pastoral-cafe'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3] text-pastoral-dourado" />}
                <span>{qual}</span>
              </button>
            );
          })}
        </div>
      )}

      {showHelperText && (
        <p className="text-[11px] text-zinc-400 italic">
          Habilitações oficiais autorizam o missionário a atuar nas escalas, formações e missões apostólicas.
        </p>
      )}
    </div>
  );
};
