import { memo } from 'react';

interface PreviewSkeletonProps {
  className?: string;
}

export const PreviewSkeleton = memo(({ className = '' }: PreviewSkeletonProps) => {
  return (
    <div
      className={`flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1 ${className}`}
    >
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-4">
        <div className="w-full rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-5 space-y-4">
          <div className="skeleton-shimmer h-4 w-1/3 rounded bg-bolt-elements-background-depth-3" />
          <div className="space-y-2">
            <div className="skeleton-shimmer h-3 w-full rounded bg-bolt-elements-background-depth-3" />
            <div className="skeleton-shimmer h-3 w-5/6 rounded bg-bolt-elements-background-depth-3" />
            <div className="skeleton-shimmer h-3 w-2/3 rounded bg-bolt-elements-background-depth-3" />
          </div>
          <div className="flex gap-3 pt-1">
            <div className="skeleton-shimmer h-8 flex-1 rounded-md bg-bolt-elements-background-depth-3" />
            <div className="skeleton-shimmer h-8 flex-1 rounded-md bg-bolt-elements-background-depth-3" />
            <div className="skeleton-shimmer h-8 flex-1 rounded-md bg-bolt-elements-background-depth-3" />
          </div>
        </div>

        <p className="text-sm text-bolt-elements-textSecondary">Please wait while we prepare your application...</p>
      </div>
    </div>
  );
});
