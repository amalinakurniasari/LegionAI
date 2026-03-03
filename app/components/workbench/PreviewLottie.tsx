import { memo, useMemo, useState, useEffect } from 'react';
import Lottie from 'lottie-react';

interface PreviewLottieProps {
  className?: string;
}

export const PreviewLottie = memo(({ className = '' }: PreviewLottieProps) => {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    fetch('/loading.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  const lottieOptions = useMemo(() => ({
    loop: true,
    autoplay: true,
  }), []);

  return (
    <div
      className={`flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1 ${className}`}
    >
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-4">
        <div 
          className="w-full"
          style={{
            aspectRatio: '1 / 1',
            maxWidth: '400px',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <div 
            style={{ 
              width: '100%', 
              height: '100%',
              transform: 'scale(1.6)',
              transformOrigin: 'center',
            }}
          >
            <Lottie 
              animationData={animationData}
              {...lottieOptions}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});