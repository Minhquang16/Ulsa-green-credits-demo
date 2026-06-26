import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ColumnsIcon,
} from "lucide-react"

import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Input } from "./ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

const columns = [
  {
    accessorKey: "time",
    header: "Thời gian",
    cell: ({ row }) => {
      const dt = new Date(row.original.time)
      return (
        <span className="text-gray-600 font-medium text-sm">
          {dt.toLocaleDateString('vi-VN')} {dt.getHours()}:{dt.getMinutes().toString().padStart(2, '0')}
        </span>
      )
    },
  },
  {
    accessorKey: "title",
    header: "Hoạt động",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${row.original.icon_class}`}>
            <span className="material-symbols-outlined text-[18px]">{row.original.icon}</span>
          </div>
          <div>
            <div className="font-bold text-gray-800 text-[13px]">{row.original.title}</div>
            <div className="text-gray-500 text-[11px]">{row.original.type_desc}</div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Loại giao dịch",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-gray-600 bg-gray-50 border-gray-200">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "amount",
    header: "Số UGC",
    cell: ({ row }) => (
      <div className={`font-bold ${row.original.amount_class}`}>
        {row.original.is_positive ? '+' : '-'}{row.original.amount}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${row.original.status_class}`}>
        {row.original.status}
      </span>
    ),
  },
]

export default function HistoryDataTable({ data }) {
  const [sorting, setSorting] = React.useState([])
  const [columnFilters, setColumnFilters] = React.useState([])
  const [columnVisibility, setColumnVisibility] = React.useState({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 5,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        <Input
          placeholder="Tìm kiếm giao dịch..."
          value={(table.getColumn("title")?.getFilterValue()) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm rounded-xl"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto rounded-xl">
              <ColumnsIcon className="w-4 h-4 mr-2" />
              Cột hiển thị
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id === "title" ? "Hoạt động" : 
                     column.id === "time" ? "Thời gian" :
                     column.id === "category" ? "Loại" :
                     column.id === "amount" ? "Số lượng" :
                     column.id === "status" ? "Trạng thái" : column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-xs font-bold text-gray-500 uppercase tracking-wider py-3 h-auto">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500 text-sm italic"
                >
                  Không có dữ liệu giao dịch.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-xs text-gray-500 font-medium">
          Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-8 h-8 p-0 rounded-lg"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-8 h-8 p-0 rounded-lg"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
