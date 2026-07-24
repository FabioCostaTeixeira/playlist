"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SortableItem = { contentId: string; durationSeconds: number };

/**
 * Lista ordenada e arrastável dos itens da programação. O arrastar é custom
 * (pointer events, sem dependência): como cada linha tem `key` estável por
 * `contentId`, o nó DOM da linha arrastada persiste durante a reordenação e
 * mantém a captura do ponteiro — então o movimento segue mesmo o cursor saindo
 * da linha. `onReorder` deve reordenar de forma imutável (ver `reorder`).
 */
export function SortableItems({
  items,
  nameFor,
  onReorder,
  onDurationChange,
  onRemove,
}: {
  items: SortableItem[];
  nameFor: (contentId: string) => string;
  onReorder: (from: number, to: number) => void;
  onDurationChange: (contentId: string, seconds: number) => void;
  onRemove: (contentId: string) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const dragRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const setDrag = (index: number | null) => {
    dragRef.current = index;
    setDragIndex(index);
  };

  const handleMove = (clientY: number) => {
    const from = dragRef.current;
    if (from === null || !listRef.current) return;
    const rows = Array.from(listRef.current.children) as HTMLElement[];
    let target = rows.length - 1;
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        target = i;
        break;
      }
    }
    if (target !== from) {
      onReorder(from, target);
      setDrag(target);
    }
  };

  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum item na programação. Adicione conteúdos abaixo.
      </p>
    );
  }

  return (
    <ul ref={listRef} className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item.contentId}
          data-dragging={dragIndex === index}
          className="flex items-center gap-2 rounded-lg border bg-card p-2 data-[dragging=true]:border-primary data-[dragging=true]:shadow-lg data-[dragging=true]:opacity-90"
        >
          <button
            type="button"
            aria-label={`Arrastar ${nameFor(item.contentId)}`}
            title="Arraste para reordenar"
            style={{ touchAction: "none" }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setDrag(index);
            }}
            onPointerMove={(event) => {
              if (dragRef.current !== null) handleMove(event.clientY);
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              setDrag(null);
            }}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>

          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
            {index + 1}
          </span>

          <span className="flex-1 truncate text-sm font-medium">
            {nameFor(item.contentId)}
          </span>

          <Input
            className="w-20"
            type="number"
            min={3}
            max={86400}
            value={item.durationSeconds}
            onChange={(event) =>
              onDurationChange(item.contentId, Number(event.target.value))
            }
            aria-label={`Duração de ${nameFor(item.contentId)} em segundos`}
          />

          <div className="flex flex-col">
            <button
              type="button"
              aria-label={`Mover ${nameFor(item.contentId)} para cima`}
              disabled={index === 0}
              onClick={() => onReorder(index, index - 1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Mover ${nameFor(item.contentId)} para baixo`}
              disabled={index === items.length - 1}
              onClick={() => onReorder(index, index + 1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remover ${nameFor(item.contentId)}`}
            onClick={() => onRemove(item.contentId)}
          >
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}
