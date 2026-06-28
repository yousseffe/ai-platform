"use client";

import React from "react";
import { TrendingUp, ShoppingCart, Shuffle } from "lucide-react";
import { OrgType } from "@/types";

interface OrgTypeBadgeProps {
  type: OrgType | string;
  size?: "xs" | "sm" | "md";
}

const TYPE_CONFIG: Record<string, { label: string; classes: string; Icon: React.ElementType }> = {
  [OrgType.PROVIDER]: {
    label: "Provider",
    classes: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    Icon: TrendingUp,
  },
  [OrgType.CONSUMER]: {
    label: "Consumer",
    classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Icon: ShoppingCart,
  },
  [OrgType.HYBRID]: {
    label: "Hybrid",
    classes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    Icon: Shuffle,
  },
};

const SIZE_CLASSES = {
  xs: "text-[9px] px-1.5 py-0.5 gap-1",
  sm: "text-[10px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

/**
 * Color-coded organization type badge.
 *
 * @param type - The OrgType value (PROVIDER, CONSUMER, HYBRID).
 * @param size - Badge size preset. Defaults to sm.
 * @returns The React badge component.
 */
export default function OrgTypeBadge({ type, size = "sm" }: OrgTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG[OrgType.CONSUMER];
  const { label, classes, Icon } = config;
  const iconSize = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${classes} ${SIZE_CLASSES[size]}`}
    >
      <Icon className={iconSize} strokeWidth={2} />
      {label}
    </span>
  );
}
