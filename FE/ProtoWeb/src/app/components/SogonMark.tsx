import { useId } from 'react';

type SogonMarkProps = {
  className?: string;
  /** S자 지퍼의 스티치와 핀 속 하트 색상. */
  seam?: string;
  title?: string;
};

const S_TRACK =
  'M14.5 15C22 6.5 46 7 50.5 16.5 55 26 44 30.5 32 32.5 20 34.5 9 38.5 12.5 48.5 16 58.5 39.5 59.5 50.5 50';
const DATE_PIN =
  'M50.5 42.5a8.5 8.5 0 0 1 8.5 8.4c0 6-8.5 11-8.5 11S42 56.9 42 50.9a8.5 8.5 0 0 1 8.5-8.4Z';
const PIN_HEART =
  'M50.5 55.3c-.3 0-.8-.4-2.1-1.5-1.5-1.3-2.4-2.2-2.4-3.6a2.2 2.2 0 0 1 2.2-2.3c.9 0 1.7.5 2.3 1.3.6-.8 1.4-1.3 2.3-1.3a2.2 2.2 0 0 1 2.2 2.3c0 1.4-.9 2.3-2.4 3.6-1.3 1.1-1.8 1.5-2.1 1.5Z';

/**
 * 소곤.zip 심볼.
 *
 * 두 취향 점이 합쳐져 Sogon의 S자 지퍼가 되고,
 * 압축이 풀린 끝은 둘만의 데이트 장소 핀으로 이어진다.
 * public/logo-mark.svg와 같은 도형을 쓴다.
 */
export function SogonMark({ className, seam = '#FFF9FB', title }: SogonMarkProps) {
  const instanceId = useId().replace(/:/g, '');
  const trackGradientId = `sogon-track-${instanceId}`;
  const pinGradientId = `sogon-pin-${instanceId}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={trackGradientId} x1="8" y1="7" x2="56" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F58DAE" />
          <stop offset=".5" stopColor="#CD79B7" />
          <stop offset="1" stopColor="#8D76D8" />
        </linearGradient>
        <linearGradient id={pinGradientId} x1="43" y1="43" x2="57" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#AB96EB" />
          <stop offset="1" stopColor="#8068D2" />
        </linearGradient>
      </defs>

      <g transform="translate(64 0) scale(-1 1)">
        <circle cx="7.5" cy="9.5" r="4.5" fill="#F6A0BA" />
        <circle cx="18.5" cy="5.5" r="3.5" fill="#AE99E8" />
        <path
          d="M8 10 14.5 15M18.5 6 14.5 15"
          fill="none"
          stroke={`url(#${trackGradientId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d={S_TRACK}
          fill="none"
          stroke={`url(#${trackGradientId})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={S_TRACK}
          fill="none"
          stroke={seam}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="1 4.2"
        />
        <g transform="translate(32 32.5) rotate(-10)">
          <rect x="-4.8" y="-4" width="9.6" height="8" rx="2.5" fill={seam} />
          <path d="M0 3.5v5" stroke={seam} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="0" cy="-0.2" r="1.25" fill="#B86BAC" />
        </g>
        <path fill={`url(#${pinGradientId})`} d={DATE_PIN} />
        <path fill={seam} d={PIN_HEART} />
      </g>
    </svg>
  );
}
