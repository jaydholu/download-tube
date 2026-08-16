// Mirrors public/favicon.svg — if you change the logo, update both, since
// the favicon has to stay a static file for the browser's <link> tag.
export function Logo({ className = 'w-8 h-8' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="6" fill="#ff3b3b" />
      <path
        d="M16 7v12m0 0l-5-5m5 5l5-5M10 24h12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
