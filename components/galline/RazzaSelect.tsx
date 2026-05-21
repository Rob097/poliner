"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { IconCheck, IconChevron } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import { RAZZE_ORDINATE_PER_NOME, trovaRazza } from "@/lib/data/razze";

interface RazzaSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

function normalizeQuery(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const CLEAR_OPTION_LABEL = "Nessuna razza";

export function RazzaSelect({ value, onChange }: RazzaSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedRazza = trovaRazza(value);
  const normalizedQuery = normalizeQuery(query.trim());
  const filteredRazze = normalizedQuery
    ? RAZZE_ORDINATE_PER_NOME.filter((razza) =>
        normalizeQuery(razza.nome).includes(normalizedQuery),
      )
    : RAZZE_ORDINATE_PER_NOME;
  const showClearOption =
    value !== null &&
    (normalizedQuery === "" ||
      normalizeQuery(CLEAR_OPTION_LABEL).includes(normalizedQuery));
  const options = [
    ...(showClearOption
      ? [{ id: null, nome: CLEAR_OPTION_LABEL, selected: false }]
      : []),
    ...filteredRazze.map((razza) => ({
      id: razza.id,
      nome: razza.nome,
      selected: value === razza.id,
    })),
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery("");
      setActiveIndex(0);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function openOptions() {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }

  function commitSelection(nextValue: string | null) {
    onChange(nextValue);
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openOptions();
        return;
      }
      setActiveIndex((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openOptions();
        return;
      }
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commitSelection(option.id);
    }
  }

  const inputValue = open ? query : selectedRazza?.nome ?? "";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onFocus={openOptions}
          onClick={() => {
            if (!open) openOptions();
          }}
          onChange={(e) => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Scegli una razza..."
          className="pr-10"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        <IconChevron
          size={18}
          color="var(--text-secondary)"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 transition-transform",
            open && "-rotate-90",
          )}
        />
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-sm)] border-2 border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--text-secondary)]">
              Nessuna razza trovata.
            </div>
          ) : (
            options.map((option, index) => (
              <button
                key={option.id ?? "clear"}
                type="button"
                role="option"
                aria-selected={option.selected}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitSelection(option.id);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm",
                  index > 0 && "border-t border-[var(--border)]",
                  activeIndex === index && "bg-[var(--bg-warm)]",
                  option.selected && "font-semibold text-[var(--primary)]",
                )}
              >
                <span>{option.nome}</span>
                {option.selected ? <IconCheck size={16} color="var(--primary)" /> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}