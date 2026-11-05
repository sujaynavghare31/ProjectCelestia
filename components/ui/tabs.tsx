"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("flex h-11 w-full items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800", className)} {...props} />
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn("relative flex h-full shrink-0 items-center gap-2 px-4 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none data-[state=active]:text-cyan-700 after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-cyan-600 dark:text-slate-400 dark:hover:text-slate-100 dark:data-[state=active]:text-cyan-300 dark:data-[state=active]:after:bg-cyan-400", className)}
      {...props}
    />
  ),
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = TabsPrimitive.Content;
