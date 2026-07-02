import Image, { type StaticImageData } from 'next/image';

import coloredLogo from '../../../public/logo/colored_logo.svg';
import whiteLogo from '../../../public/logo/white_logo.svg';
import blackLogo from '../../../public/logo/black_logo.svg';

type LogoVariant = 'auto' | 'colored' | 'white' | 'black';

type LogoProps = {
  /**
   * Adds custom classes; width/height are usually controlled via Tailwind like `h-10`.
   */
  className?: string;
  /**
   * Choose which logo asset to render. `auto` swaps between the colored and white versions based on the color scheme.
   */
  variant?: LogoVariant;
  /**
   * Bubble the priority flag to Next Image for above-the-fold usage.
   */
  priority?: boolean;
};

const LOGO_SOURCE: Record<Exclude<LogoVariant, 'auto'>, StaticImageData> = {
  colored: coloredLogo,
  white: whiteLogo,
  black: blackLogo,
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

const LOGO_WIDTH = 131; // keep the original aspect ratio (262 x 214) while using a friendlier width
const LOGO_HEIGHT = 107;

export function Logo({ className, variant = 'auto', priority }: LogoProps) {
  if (variant === 'auto') {
    return (
      <span className={joinClasses('inline-flex h-10 w-auto items-center', className)}>
        <Image
          src={LOGO_SOURCE.white}
          alt=""
          aria-hidden={true}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          className="hidden h-full w-auto dark:block"
          priority={priority}
        />
        <Image
          src={LOGO_SOURCE.colored}
          alt="Emplacc"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          className="block h-full w-auto dark:hidden"
          priority={priority}
        />
      </span>
    );
  }

  return (
    <Image
      src={LOGO_SOURCE[variant]}
      alt="Emplacc"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={joinClasses('h-10 w-auto', className)}
      priority={priority}
    />
  );
}

// Официальный знак ВШЭ («Вышка») из HSE Design System. Заливка — градиент акцента
// (HSE blue → cyan), поэтому автоматически следует бренд-теме.
export function HseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 91.978 151.548" className={className} role="img" aria-label="Высшая школа экономики">
      <defs>
        <linearGradient id="hseMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-start)" />
          <stop offset="1" stopColor="var(--accent-end)" />
        </linearGradient>
      </defs>
      <path
        d="M 60.665 67.698 C 67.412 64.681 71.563 60.379 74.452 56.927 C 81.04 49.378 82.421 40.814 82.421 34.956 C 82.421 29.876 81.215 17.113 70.063 8.374 C 62.872 2.826 56.387 0.008 40.877 0.008 L 33.154 0.008 C 32.9 0 32.67 0 32.369 0 L 0 0 L 0 151.548 L 91.978 151.548 L 91.978 122.188 C 91.978 93.034 82.025 75.683 60.665 67.698 Z M 70.444 142.34 L 54.926 142.34 L 54.926 92.049 L 35.067 92.049 L 35.067 142.396 L 21.447 142.396 L 21.447 8.406 L 35.909 8.414 C 44.425 8.414 51.053 11.279 55.601 16.922 C 58.419 20.328 60.371 24.947 61.133 29.979 L 35.067 29.979 L 35.067 38.306 L 61.403 38.306 C 61.173 42.671 60.237 47.846 55.641 53.434 C 52.712 57.093 46.203 63.229 35.496 63.229 L 34.877 63.229 L 34.877 71.658 L 35.329 71.658 C 59.292 71.658 70.452 86.819 70.452 119.37 L 70.452 142.34 L 70.444 142.34 Z"
        fill="url(#hseMarkGrad)"
        fillRule="nonzero"
      />
    </svg>
  );
}
