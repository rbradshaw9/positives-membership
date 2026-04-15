"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type ContentTypeOption = {
  value: string;
  label: string;
};

type ContentTypeSelectProps = {
  id: string;
  name: string;
  defaultValue: string;
  className?: string;
  options: ContentTypeOption[];
};

export function ContentTypeSelect({
  id,
  name,
  defaultValue,
  className,
  options,
}: ContentTypeSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  function handleChange(nextValue: string) {
    setValue(nextValue);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("type", nextValue);

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      className={className}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
