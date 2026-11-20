"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { clearCachedSavedProfiles } from "@/lib/saved-profiles-cache";

type ProfileAction = (formData: FormData) => void | Promise<void>;

export default function ProfileCacheInvalidatingForm({
  action,
  className,
  children,
}: {
  action: ProfileAction;
  className?: string;
  children: ReactNode;
}) {
  const { userId } = useAuth();

  return (
    <form
      action={action}
      className={className}
      onSubmit={() => {
        if (userId) clearCachedSavedProfiles(userId);
      }}
    >
      {children}
    </form>
  );
}
