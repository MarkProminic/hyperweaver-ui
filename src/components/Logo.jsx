import { useTranslation } from 'react-i18next';

/**
 * Hyperweaver brand mark (inline copy of public/images/hyperweaver-mark.svg):
 * seven two-tone warped thread ribbons in diagonal perspective — near end at the
 * bottom-left, far end converging top-right — pinched through a coupling band.
 * Many threads, one control plane.
 */
const Logo = () => {
  const { t } = useTranslation();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="150"
      height="150"
      viewBox="0 0 256 256"
      role="img"
      aria-label={t('chrome.logo.hyperweaver')}
    >
      <defs>
        {/* tone A: dark-ends orange, bright at the pinch, oriented along the run axis */}
        <linearGradient id="hwToneA" x1="28" y1="0" x2="222" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#cc5200" />
          <stop offset="0.536" stopColor="#ff6600" />
          <stop offset="1" stopColor="#cc5200" />
        </linearGradient>
        {/* tone B: lighter amber counterpart */}
        <linearGradient id="hwToneB" x1="28" y1="0" x2="222" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e08a3c" />
          <stop offset="0.536" stopColor="#ffa64d" />
          <stop offset="1" stopColor="#e08a3c" />
        </linearGradient>
      </defs>

      {/* Diagonal frame: horizontal composition rotated -45deg about center, scaled 0.82.
        NEAR (wide, thick) fan = BOTTOM-LEFT, FAR (small, thin) fan = TOP-RIGHT. */}
      <g transform="translate(128 128) scale(0.82) rotate(-45) translate(-128 -128)">
        {/* seven tapered thread ribbons: near fan wide and thick, far fan converging thin */}
        <g fillRule="nonzero">
          <path
            fill="url(#hwToneA)"
            d="M28,25.5 C82,26.2 106,98.5 132,98.84 C158,99.18 184,57.51 222,58 A4,4 0 0 1 222,66 C184,66.49 158,108.82 132,109.16 C106,109.5 82,37.8 28,38.5 A6.5,6.5 0 0 1 28,25.5 Z"
          />
          <path
            fill="url(#hwToneB)"
            d="M28,57.5 C82,58.2 106,106.5 132,106.84 C158,107.18 184,79.51 222,80 A4,4 0 0 1 222,88 C184,88.49 158,116.82 132,117.16 C106,117.5 82,69.8 28,70.5 A6.5,6.5 0 0 1 28,57.5 Z"
          />
          <path
            fill="url(#hwToneA)"
            d="M28,89.5 C82,90.2 106,114.5 132,114.84 C158,115.18 184,101.51 222,102 A4,4 0 0 1 222,110 C184,110.49 158,124.82 132,125.16 C106,125.5 82,101.8 28,102.5 A6.5,6.5 0 0 1 28,89.5 Z"
          />
          <path
            fill="url(#hwToneB)"
            d="M28,121.5 L222,124 A4,4 0 0 1 222,132 L28,134.5 A6.5,6.5 0 0 1 28,121.5 Z"
          />
          <path
            fill="url(#hwToneA)"
            d="M28,153.5 C82,154.2 106,130.5 132,130.84 C158,131.18 184,145.51 222,146 A4,4 0 0 1 222,154 C184,154.49 158,140.82 132,141.16 C106,141.5 82,165.8 28,166.5 A6.5,6.5 0 0 1 28,153.5 Z"
          />
          <path
            fill="url(#hwToneB)"
            d="M28,185.5 C82,186.2 106,138.5 132,138.84 C158,139.18 184,167.51 222,168 A4,4 0 0 1 222,176 C184,176.49 158,148.82 132,149.16 C106,149.5 82,197.8 28,198.5 A6.5,6.5 0 0 1 28,185.5 Z"
          />
          <path
            fill="url(#hwToneA)"
            d="M28,217.5 C82,218.2 106,146.5 132,146.84 C158,147.18 184,189.51 222,190 A4,4 0 0 1 222,198 C184,198.49 158,156.82 132,157.16 C106,157.5 82,229.8 28,230.5 A6.5,6.5 0 0 1 28,217.5 Z"
          />
        </g>
        {/* coupling band at the pinch: wraps the thread bundle perpendicular to the run axis */}
        <rect x="120" y="92" width="24" height="72" fill="#cc5200" />
      </g>
    </svg>
  );
};

export default Logo;
