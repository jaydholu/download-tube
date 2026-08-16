import { Youtube, Instagram } from 'lucide-react';

const PLATFORM_ICONS = {
  youtube: { Icon: Youtube, className: 'text-red-500', label: 'YouTube' },
  instagram: { Icon: Instagram, className: 'text-pink-500', label: 'Instagram' },
};

export function PlatformBadge({ platform, size = 18 }) {
  const entry = PLATFORM_ICONS[platform];

  if (!entry)
    return null;

  const { Icon, className, label } = entry;

  return <Icon size={size} className={className} aria-label={label} />;
};

// Adaptive summary for a batch of links: shows only the platforms actually present, with a small divider when the batch is mixed.
export function PlatformBadgeGroup({ platforms, size = 16 }) {
  const unique = [...new Set(platforms)].filter(p => PLATFORM_ICONS[p]);

  if (unique.length === 0)
    return null;

  return (
    <div className="flex items-center gap-1">
      {unique.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && <span className="text-surface-600 dark:text-surface-400 text-md font-bold leading-none">/</span>}
          <PlatformBadge platform={p} size={size} />
        </span>
      ))}
    </div>
  );
}
