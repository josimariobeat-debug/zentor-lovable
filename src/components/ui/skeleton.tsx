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
  subscriptionSummaryCard: 88,
  subscriptionTableHeader: 40,
  subscriptionTableRow: 70,
  paymentEmpty: 100,
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
        <div
          key={i}
          className="w-full bg-white border border-neutral-200 rounded-2xl p-5 flex items-center gap-5 animate-pulse"
          style={{ height: SKELETON_HEIGHTS.appCardRow }}
        >
          <div className="w-[88px] h-[88px] rounded-2xl bg-neutral-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-[22px] w-44 rounded-md bg-neutral-200" />
              <div className="h-[22px] w-24 rounded-md bg-neutral-100" />
            </div>
            <div className="h-[20px] w-full max-w-[520px] rounded-md bg-neutral-100 mb-3" />
            <div className="flex items-center gap-2">
              <div className="h-[18px] w-24 rounded-md bg-neutral-100" />
              <div className="h-[24px] w-32 rounded-md bg-neutral-100" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SubscriptionSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-neutral-200 rounded-2xl p-5 animate-pulse"
          style={{ height: SKELETON_HEIGHTS.subscriptionSummaryCard }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-200 shrink-0" />
            <div>
              <div className="h-[18px] w-24 rounded-md bg-neutral-100 mb-1" />
              <div className="h-[32px] w-16 rounded-md bg-neutral-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SubscriptionTableSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <>
      <div
        className="grid grid-cols-12 px-6 py-3 bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold tracking-wider uppercase text-neutral-500"
        style={{ height: SKELETON_HEIGHTS.subscriptionTableHeader }}
      >
        <div className="col-span-4">App</div>
        <div className="col-span-2">Início</div>
        <div className="col-span-2">Vencimento</div>
        <div className="col-span-2">Dias restantes</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 px-6 py-4 items-center text-[14px] animate-pulse"
            style={{ height: SKELETON_HEIGHTS.subscriptionTableRow }}
          >
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-200 shrink-0" />
              <div>
                <div className="h-[20px] w-32 rounded-md bg-neutral-200 mb-1" />
                <div className="h-[15px] w-24 rounded-md bg-neutral-100" />
              </div>
            </div>
            <div className="col-span-2 h-[20px] w-24 rounded-md bg-neutral-100" />
            <div className="col-span-2 h-[20px] w-24 rounded-md bg-neutral-100" />
            <div className="col-span-2 h-[20px] w-16 rounded-md bg-neutral-100" />
            <div className="col-span-2 flex justify-end">
              <div className="h-[26px] w-20 rounded-md bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function PaymentHistorySkeleton() {
  return (
    <div
      className="p-10 text-center animate-pulse"
      style={{ height: SKELETON_HEIGHTS.paymentEmpty }}
    >
      <div className="h-[20px] w-48 rounded-md bg-neutral-100 mx-auto" />
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
