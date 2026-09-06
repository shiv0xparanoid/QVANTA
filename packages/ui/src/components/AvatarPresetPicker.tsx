import * as React from "react";

type AvatarPresetId = 0 | 1 | 2;

interface AvatarPreset {
  id: AvatarPresetId;
  name: string;
  headShape: "round" | "square" | "oval";
  color: string;
  bgColor: string;
}

const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 0,
    name: "Scholar",
    headShape: "round",
    color: "#3b82f6",
    bgColor: "bg-blue-500"
  },
  {
    id: 1,
    name: "Engineer",
    headShape: "square",
    color: "#f97316",
    bgColor: "bg-orange-500"
  },
  {
    id: 2,
    name: "Sage",
    headShape: "oval",
    color: "#a855f7",
    bgColor: "bg-purple-500"
  }
];

interface AvatarPresetPickerProps {
  value?: AvatarPresetId;
  onChange: (presetId: AvatarPresetId) => void;
  className?: string;
  swatchClassName?: string;
  disabled?: boolean;
}

const headShapeClasses: Record<AvatarPreset["headShape"], string> = {
  round: "rounded-full",
  square: "rounded-md",
  oval: "rounded-full h-14 w-10"
};

const AvatarSwatch: React.FC<{ preset: AvatarPreset }> = ({ preset }) => {
  const shapeClass =
    preset.headShape === "oval"
      ? "rounded-[50%] h-12 w-8 sm:h-14 sm:w-10"
      : preset.headShape === "square"
      ? "rounded-md h-10 w-10 sm:h-12 sm:w-12"
      : "rounded-full h-10 w-10 sm:h-12 sm:w-12";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`${shapeClass} border-2 border-white/10 shadow-inner`}
        style={{ backgroundColor: preset.color }}
      />
      <span className="text-[11px] font-medium text-text-300">
        {preset.name}
      </span>
    </div>
  );
};

const AvatarPresetPicker: React.FC<AvatarPresetPickerProps> = ({
  value,
  onChange,
  className = "",
  swatchClassName = "",
  disabled = false
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-4 sm:gap-6 ${className}`}>
      {AVATAR_PRESETS.map((preset) => {
        const isSelected = value === preset.id;
        return (
          <button
            key={String(preset.id)}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(preset.id)}
            aria-label={`Select ${preset.name} avatar`}
            aria-pressed={isSelected}
            className={`group flex flex-col items-center gap-2 rounded-xl p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-950 disabled:pointer-events-none disabled:opacity-50 ${
              isSelected
                ? "bg-bg-800 ring-2 ring-primary-500"
                : "hover:bg-bg-800/60"
            } ${swatchClassName}`}
          >
            <AvatarSwatch preset={preset} />
            <div
              className={`h-1.5 w-8 rounded-full transition-all ${
                isSelected ? preset.bgColor : "bg-bg-700"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

AvatarPresetPicker.displayName = "AvatarPresetPicker";

export { AvatarPresetPicker, AVATAR_PRESETS };
export type { AvatarPresetPickerProps, AvatarPreset, AvatarPresetId };
