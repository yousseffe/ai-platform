"use client";

import React from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { OrgRole } from "@/types";
import { getOrgRoleMeta } from "@/lib/org-role-meta";

interface OrgRoleComboboxProps {
  orgType?: string;
  value: OrgRole;
  onChange: (value: OrgRole) => void;
  roles?: readonly OrgRole[];
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  placeholder?: string;
}

const assignableRoles = [
  OrgRole.MAINTAINER,
  OrgRole.CONTRIBUTOR,
  OrgRole.VIEWER,
] as const;

export default function OrgRoleCombobox({
  orgType,
  value,
  onChange,
  roles = assignableRoles,
  disabled = false,
  className,
  itemClassName,
  placeholder = "Select a role",
}: OrgRoleComboboxProps) {
  const anchorRef = useComboboxAnchor();
  const roleOptions = roles.map((role) => ({
    value: role,
    label: getOrgRoleMeta(role, orgType).longLabel,
  }));

  const getRoleLabel = (role: OrgRole | null | undefined) =>
    role ? getOrgRoleMeta(role, orgType).longLabel : placeholder;

  return (
    <Combobox
      items={roles}
      itemToStringLabel={(role) => getRoleLabel(role as OrgRole)}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue as OrgRole);
        }
      }}
      disabled={disabled}
    >
      <div ref={anchorRef}>
        <ComboboxTrigger
          className={className}
          disabled={disabled}
        >
          <ComboboxValue placeholder={placeholder}>
            {(selectedValue) => getRoleLabel(selectedValue as OrgRole)}
          </ComboboxValue>
        </ComboboxTrigger>
      </div>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxInput
          placeholder="Search roles..."
          showClear
          className="w-full"
          disabled={disabled}
        />
        <ComboboxEmpty>No roles found.</ComboboxEmpty>
        <ComboboxList>
          {roleOptions.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option.value}
              className={itemClassName}
            >
              {option.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
