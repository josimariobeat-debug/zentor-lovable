import { cn } from '@/lib/utils';

/**
 * Base skeleton primitive. Animated muted block.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-ev-id="ev_37825aad22"
      className={cn('animate-pulse rounded-md bg-neutral-200', className)}
      {...props}
    />
  );
}

/**
 * Heights of real cards (computed once, kept here as source of truth).
 * Update these when the matching real component changes its outer height.
 *
 * - appCardRow:    AppCard (Meus Apps list) → p-5 + 88px image + 2 border ≈ 130px
 * - storiesRow:    Stories list row         → py-4 + 56*4/3 image ≈ 107px → 108px
 * - storeCard:     LojaApps grid card       → p-5 + 64 icon row + mb-4 + desc 44 + mb-5 + 16 pt + 36 footer ≈ 236px
 * - mediaGridItem: aspect-square card grid  → consumer provides aspect ratio
 */
export const SKELETON_HEIGHTS = {
  appCardRow: 130,
  storiesRow: 108,
  storeCard: 236,
} as const;

interface SkeletonCardProps {
  /** Number of placeholders to render */
  count?: number;
  className?: string;
}

/**
 * Meus Apps list skeleton. Matches AppCard outer dimensions exactly.
 */
export function AppCardRowSkeleton({ count = 2, className }: SkeletonCardProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`h-[${SKELETON_HEIGHTS.appCardRow}px] rounded-2xl`} style={{ height: SKELETON_HEIGHTS.appCardRow }} />
      ))}
    </div>
  );
}

/**
 * Stories list skeleton. Mirrors the bordered container with internal rows,
 * so the white card shell does not pop in when data arrives.
 */
export function StoriesRowsSkeleton({ count = 3 }: SkeletonCardProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse',
            i !== count - 1 && 'border-b border-neutral-100',
          )}
          style={{ height: SKELETON_HEIGHTS.storiesRow }}
        />
      ))}
    </div>
  );
}

/**
 * LojaApps grid skeleton. Matches the real card structure (icon + text + footer).
 */
export function StoreCardSkeleton({ count = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-neutral-200 rounded-2xl p-5 animate-pulse"
          style={{ height: SKELETON_HEIGHTS.storeCard }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-neutral-200 shrink-0" />
            <div className="flex-1">
              <div className="h-5 bg-neutral-200 rounded w-32 mb-2" />
              <div className="h-4 bg-neutral-100 rounded w-20" />
            </div>
          </div>
          <div className="h-[44px] bg-neutral-100 rounded mb-5" />
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            <div className="h-5 bg-neutral-200 rounded w-20" />
            <div className="h-9 bg-neutral-200 rounded-lg w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton };
