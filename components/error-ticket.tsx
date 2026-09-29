/**
 * El código de error dentro del ticket del logo (el mismo motivo del favicon).
 * Sin hooks ni datos: sirve igual en not-found (servidor) y en error (cliente).
 */
export function ErrorTicket({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <svg viewBox="0 0 320 150" className="w-full text-olive-700">
        <path
          d="M14 6H306a8 8 0 0 1 8 8v42a19 19 0 0 0 0 38v42a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V94a19 19 0 0 0 0-38V14a8 8 0 0 1 8-8Z"
          fill="var(--color-olive-50)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path d="M232 18V132" stroke="currentColor" strokeWidth="3" strokeDasharray="8 7" />
      </svg>
      <div className="absolute inset-0 flex">
        <div className="flex w-[72.5%] flex-col items-center justify-center">
          <span className="font-display text-6xl font-semibold leading-none tracking-tight text-ink sm:text-7xl">
            {code}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="font-nav rotate-90 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.3em] text-olive-700">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
