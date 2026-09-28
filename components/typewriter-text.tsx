"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Phase = "typing" | "pausing" | "deleting";

const DEFAULT_WORDS = ["Beneficios", "Descuentos", "Recompensas", "Premios"];

const TYPING_SPEED = 90;
const DELETING_SPEED = 45;
const PAUSE_AFTER_TYPING = 1400;
const PAUSE_BEFORE_NEXT = 400;

export function TypewriterText({
  words = DEFAULT_WORDS,
  className,
}: {
  words?: string[];
  className?: string;
}) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    const current = words[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < current.length) {
        timeout = setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          TYPING_SPEED,
        );
      } else {
        timeout = setTimeout(() => setPhase("pausing"), PAUSE_AFTER_TYPING);
      }
    } else if (phase === "pausing") {
      timeout = setTimeout(() => setPhase("deleting"), 0);
    } else {
      // deleting
      if (text.length > 0) {
        timeout = setTimeout(
          () => setText(current.slice(0, text.length - 1)),
          DELETING_SPEED,
        );
      } else {
        timeout = setTimeout(() => {
          setWordIndex((i) => (i + 1) % words.length);
          setPhase("typing");
        }, PAUSE_BEFORE_NEXT);
      }
    }

    return () => clearTimeout(timeout);
  }, [text, phase, wordIndex, words]);

  // El color y la fuente los hereda del contenedor (currentColor), para poder
  // reusar el efecto en distintos tonos sin tocar el componente.
  return (
    <span className={cn("inline-block whitespace-nowrap", className)}>
      <span aria-label={words[wordIndex]}>{text}</span>
      <span
        aria-hidden="true"
        className="inline-block w-[2px] h-[0.9em] translate-y-[0.05em] ml-0.5 bg-current rounded-full animate-[caret-blink_1.1s_ease-in-out_infinite]"
      />
    </span>
  );
}
