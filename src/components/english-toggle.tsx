"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { showEnglishStore, useLocalStore } from "@/lib/local-store";

/** Global switch: show English translations under the Danish text. */
export function EnglishToggle() {
  const id = useId();
  const checked = useLocalStore(showEnglishStore);
  return (
    <div className="flex items-center gap-2 text-sm">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(value) => showEnglishStore.set(value)}
      />
      <label htmlFor={id}>Show English</label>
    </div>
  );
}

/** English text that is only shown when the user turned translations on. */
export function EnglishText({
  children,
  className,
}: {
  children?: string;
  className?: string;
}) {
  const show = useLocalStore(showEnglishStore);
  if (!show || !children) return null;
  return (
    <p
      lang="en"
      className={className ?? "text-sm text-muted-foreground italic"}
    >
      {children}
    </p>
  );
}
