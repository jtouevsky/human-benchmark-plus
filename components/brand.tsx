export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 4 42 14v20L24 44 6 34V14Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m24 12 10 6v12l-10 6-10-6V18Z"
        fill="currentColor"
        fillOpacity=".06"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M24 4v8m18 2-8 4m8 16-8-4M24 44v-8M6 34l8-4M6 14l8 4M14 18l10 6 10-6M24 24v12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
    </svg>
  );
}
