"use client"

import React from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import SortableHeader from "./SortableHeader"

interface ColumnDef {
  id: string
  label: string
  width: number
}

interface IprKaroTableProps {
  leads: any[]
  columns: ColumnDef[]
  columnWidths: Record<string, number>
  isLoading: boolean
  isLoadingMore: boolean
  currentPage: number
  totalPages: number
  totalCount: number
  onLoadMore: () => void
  onColumnResize: (id: string, newWidth: number) => void
  onColumnReorder: (columns: ColumnDef[]) => void
  renderCell: (colId: string, lead: any, width: number) => React.ReactNode
}

const IprKaroTable: React.FC<IprKaroTableProps> = ({
  leads,
  columns,
  columnWidths,
  isLoading,
  isLoadingMore,
  currentPage,
  totalPages,
  totalCount,
  onLoadMore,
  onColumnResize,
  onColumnReorder,
  renderCell,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = columns.findIndex((i) => i.id === active.id)
      const newIndex = columns.findIndex((i) => i.id === over?.id)
      const newColumns = arrayMove(columns, oldIndex, newIndex)
      onColumnReorder(newColumns)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#5A4C33]/10 overflow-hidden ring-1 ring-[#5A4C33]/5">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-[13px] border-separate border-spacing-0" style={{ tableLayout: "fixed" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <thead className="sticky top-0 z-20 shadow-sm transition-shadow">
              <tr className="bg-[#F8F5EC]">
                <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                  {columns.map((col) => (
                    <SortableHeader
                      key={col.id}
                      id={col.id}
                      width={columnWidths[col.id] || col.width}
                      onResize={onColumnResize}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#D2A02A] leading-none">
                        {col.label}
                      </span>
                    </SortableHeader>
                  ))}
                </SortableContext>
              </tr>
            </thead>
          </DndContext>
          <tbody className="divide-y divide-[#5A4C33]/10 bg-white">
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((c, j) => (
                    <td
                      key={j}
                    className="px-2 py-4 border-r border-b border-[#5A4C33]/5 last:border-r-0"
                      style={{ width: `${columnWidths[c.id] || c.width}px` }}
                    >
                      <div className="h-2 bg-[#5A4C33]/10 rounded-full w-full opacity-40 shadow-sm" />
                    </td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-24 text-center bg-white">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-6xl grayscale opacity-20 filter drop-shadow-sm">📭</div>
                    <p className="text-[#5A4C33] font-black text-xl italic tracking-tight">No leads found</p>
                    <p className="text-[#5A4C33]/40 font-bold max-w-sm mx-auto text-[13px] leading-relaxed">
                      Try adjusting your filters or search terms to find what you're looking for.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-[#F8F5EC] transition-colors duration-150 group border-b border-[#5A4C33]/10"
                >
                  {columns.map((col) => renderCell(col.id, lead, columnWidths[col.id] || col.width))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isLoadingMore && (
        <div className="flex justify-center items-center py-6 border-t border-[#5A4C33]/10 bg-[#F8F5EC]/50">
          <div className="flex items-center gap-2.5">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#D2A02A] border-t-transparent" />
            <span className="text-[#5A4C33]/60 text-[13px] font-black tracking-tight">Loading more leads…</span>
          </div>
        </div>
      )}
      {currentPage < totalPages && !isLoadingMore && !isLoading && leads.length > 0 && (
        <div className="flex justify-center py-5 border-t border-[#5A4C33]/10 bg-[#F8F5EC]/20">
          <button
            onClick={onLoadMore}
            className="bg-white hover:bg-[#F8F5EC] text-[#5A4C33] px-6 py-2 rounded-xl text-[13px] font-black border border-[#5A4C33]/10 shadow-sm transition-all hover:shadow-md hover:border-[#D2A02A]/30 active:scale-95"
          >
            Load More ({leads.length} of {totalCount})
          </button>
        </div>
      )}
      {currentPage >= totalPages && leads.length > 0 && (
        <div className="flex justify-center py-3 border-t border-[#5A4C33]/10 bg-[#F8F5EC]/10">
          <span className="text-[#5A4C33]/30 text-[8.5px] text-center block w-full uppercase tracking-[0.2em] font-black opacity-40">
            End of Leads Repository
          </span>
        </div>
      )}
    </div>
  )
}

export default IprKaroTable
