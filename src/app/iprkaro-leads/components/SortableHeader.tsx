"use client"

import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { FaGripVertical } from "react-icons/fa"

interface SortableHeaderProps {
  id: string
  children: React.ReactNode
  width?: number
  onResize: (id: string, newWidth: number) => void
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  id,
  children,
  width,
  onResize,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
    width: width ? `${width}px` : "auto",
    minWidth: width ? `${width}px` : "auto",
    cursor: "move",
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.pageX
    const startWidth = width || 150
    const handleMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (ev.pageX - startX))
      onResize(id, newWidth)
    }
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider select-none group relative whitespace-nowrap text-[#D2A02A] bg-white border-r border-b border-[#5A4C33]/10 last:border-r-0 z-10"
      {...attributes}
      {...listeners}
    >
      <div className="p-2 flex items-center gap-1 overflow-hidden pointer-events-none">
        <div className="p-0.5 -ml-0.5 flex-shrink-0">
          <FaGripVertical className="opacity-0 group-hover:opacity-100 text-[#D2A02A] transition-opacity text-[8px]" />
        </div>
        <span className="truncate flex-1">{children}</span>
      </div>
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#D2A02A]/40 transition-colors z-20 pointer-events-auto"
      />
    </th>
  )
}

export default SortableHeader
