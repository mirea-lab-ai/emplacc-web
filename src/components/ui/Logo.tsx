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
