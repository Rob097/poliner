"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { IconClose } from "./icons";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const sheet = (
    <div
      className="fixed inset-0 bg-[rgba(46,41,36,0.4)] z-[200] flex items-end justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-app max-h-[85vh] overflow-y-auto px-5 pt-6 pb-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-xl font-bold m-0">{title}</h3>
          <Button variant="icon" onClick={onClose} aria-label="Chiudi">
            <IconClose size={22} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
