import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-ev-id="ev_37825aad22"
    className={cn('animate-pulse rounded-md bg-neutral-200', className)}
    {...props} />);


}

export { Skeleton };