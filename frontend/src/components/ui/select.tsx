"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

const SelectItemsContext = React.createContext<{
  registerItem: (value: string, label: React.ReactNode) => void;
  getItemLabel: (value: string) => React.ReactNode;
} | null>(null);

interface SelectProps<T = unknown> extends Omit<React.ComponentProps<typeof SelectPrimitive.Root>, 'value' | 'onValueChange'> {
  items?: { value: T; label: React.ReactNode }[];
  value?: T;
  onValueChange?: (value: T) => void;
  children?: React.ReactNode;
}

function Select<T = unknown>({ children, items, ...props }: SelectProps<T>) {
  const [itemsMap, setItemsMap] = React.useState<Record<string, React.ReactNode>>(() => {
    if (!items) return {};
    const initial: Record<string, React.ReactNode> = {};
    items.forEach((item) => {
      initial[String(item.value)] = item.label;
    });
    return initial;
  });

  React.useEffect(() => {
    if (items) {
      const timer = setTimeout(() => {
        setItemsMap((prev) => {
          const next = { ...prev };
          items.forEach((item) => {
            next[String(item.value)] = item.label;
          });
          return next;
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [items]);

  const registerItem = React.useCallback((value: string, label: React.ReactNode) => {
    setItemsMap((prev) => {
      if (prev[value] === label) return prev;
      return { ...prev, [value]: label };
    });
  }, []);

  const getItemLabel = React.useCallback((value: string) => {
    return itemsMap[value];
  }, [itemsMap]);

  return (
    <SelectItemsContext.Provider value={{ registerItem, getItemLabel }}>
      <SelectPrimitive.Root {...(props as unknown as React.ComponentProps<typeof SelectPrimitive.Root>)}>
        {children}
      </SelectPrimitive.Root>
    </SelectItemsContext.Provider>
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, placeholder, children, ...props }: SelectPrimitive.Value.Props) {
  const context = React.useContext(SelectItemsContext);

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left text-xs font-medium text-slate-900 dark:text-slate-100", className)}
      placeholder={placeholder}
      {...props}
    >
      {(value) => {
        if (value === undefined || value === null || value === "") {
          return placeholder;
        }

        const cachedLabel = context?.getItemLabel(String(value));
        if (cachedLabel) {
          return cachedLabel;
        }

        if (typeof children === "function") {
          return (children as (val: unknown) => React.ReactNode)(value);
        }
        return value;
      }}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-card px-3 text-xs text-slate-900 dark:text-slate-100 shadow-xs transition-colors hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 select-none",
        size === "sm" ? "h-8 rounded-md" : "h-9",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-3.5 w-3.5 opacity-50 shrink-0 text-slate-900 dark:text-slate-100" />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-[120px] overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md border border-border ring-1 ring-black/5 dark:ring-white/5 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="space-y-0.5">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: SelectPrimitive.Item.Props) {
  const context = React.useContext(SelectItemsContext);

  React.useEffect(() => {
    if (context && value !== undefined) {
      context.registerItem(String(value), children);
    }
  }, [context, value, children]);

  return (
    <SelectPrimitive.Item
      value={value}
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2.5 text-xs text-foreground outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap text-xs">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex.5 size-4 items-center justify-center text-primary" />
        }
      >
        <CheckIcon className="pointer-events-none h-3.5 w-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
