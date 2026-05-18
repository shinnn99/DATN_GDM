import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-primary lg:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-muted-foreground lg:text-sm">
            {description}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

export function Panel({
  icon: Icon,
  title,
  description,
  right,
  children,
  className,
  bodyClassName,
  scroll = true,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
}) {
  return (
    <div className={cn("surface-card flex min-h-0 flex-col", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight text-primary">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {right}
      </header>
      <div
        className={cn(
          "min-h-0 flex-1 px-4 py-3",
          scroll && "scroll-pane",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
