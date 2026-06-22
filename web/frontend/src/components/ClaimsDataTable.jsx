"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export const schema = z.object({
  id: z.number().or(z.string()),
  header: z.string(),
  eventName: z.string().optional(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
  txHash: z.string().optional(),
  createdAt: z.string().optional(),
  decidedAt: z.string().optional(),
})

// Create a separate component for the drag handle
function DragHandle({ id }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <IconGripVertical className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

const columns = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "header",
    header: () => <div className="whitespace-nowrap">Loại</div>,
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "eventName",
    header: () => <div className="whitespace-nowrap">Tên sự kiện</div>,
    cell: ({ row }) => (
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
        {row.original.eventName}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="whitespace-nowrap">Trạng thái</div>,
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <Badge variant="outline" className="px-1.5 text-muted-foreground whitespace-nowrap">
          {row.original.status === "Hoàn thành" ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 mr-1" size={14} />
          ) : row.original.status === "Từ chối" ? (
            <IconCircleXFilled className="fill-red-500 dark:fill-red-400 mr-1" size={14} />
          ) : row.original.status === "Chưa tham gia" ? (
            <div className="size-3.5 mr-1 rounded-full border-2 border-gray-300"></div>
          ) : (
            <IconLoader className="animate-spin mr-1" size={14} />
          )}
          {row.original.status}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "target",
    header: () => <div className="w-full text-right whitespace-nowrap">Số tín chỉ (UGC)</div>,
    cell: ({ row }) => {
      const isRejected = row.original.status === "Từ chối";
      return (
        <div className={`w-full text-right font-extrabold ${isRejected ? 'text-red-500' : 'text-emerald-600'} pr-4 whitespace-nowrap`}>
          {row.original.target}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="w-full text-center whitespace-nowrap">Ngày gửi</div>,
    cell: ({ row }) => {
      const dateVal = row.original.createdAt;
      if (!dateVal) return <div className="w-full text-center text-gray-400">—</div>;
      const formatted = new Date(dateVal).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return <div className="w-full text-center font-medium text-gray-500 whitespace-nowrap">{formatted}</div>;
    },
  },
  {
    accessorKey: "reviewer",
    header: () => <div className="whitespace-nowrap">Người duyệt</div>,
    cell: ({ row }) => {
      const isAssigned = row.original.reviewer && row.original.reviewer !== "Chọn người duyệt"

      if (isAssigned) {
        return <span className="text-sm font-medium whitespace-nowrap">{row.original.reviewer}</span>
      }

      return (
        <>
          <Label htmlFor={`${row.original.id}-reviewer`} className="sr-only">
            Reviewer
          </Label>
          <Select>
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              id={`${row.original.id}-reviewer`}
            >
              <SelectValue placeholder="Chọn người duyệt" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
              <SelectItem value="Jamik Tashpulatov">
                Jamik Tashpulatov
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      )
    },
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
            size="icon"
          >
            <IconDotsVertical size={16} />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
          <DropdownMenuItem>In biên lai</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function DraggableRow({ row }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

function DataTable({ data: initialData, nav }) {
  const [data, setData] = React.useState(() => initialData)
  
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState({})
  const [columnFilters, setColumnFilters] = React.useState([])
  const [sorting, setSorting] = React.useState([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6 bg-white border border-gray-200 rounded-xl pt-4 pb-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select defaultValue="outline">
          <SelectTrigger
            className="flex w-fit md:hidden"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder="Chọn chế độ xem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outline">Tất cả</SelectItem>
            <SelectItem value="past-performance">Đã duyệt</SelectItem>
            <SelectItem value="key-personnel">Từ chối</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="hidden md:flex">
          <TabsTrigger value="outline">Tất cả</TabsTrigger>
          <TabsTrigger value="past-performance">
            Đã duyệt <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 rounded-full">{data.filter(x=>x.status==='Done').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            Từ chối <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 rounded-full">{data.filter(x=>x.status==='Rejected').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">Chờ xử lý</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns size={16} className="mr-2" />
                <span className="hidden lg:inline">Tuỳ chỉnh cột</span>
                <span className="lg:hidden">Cột</span>
                <IconChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === "eventName" ? "Tên sự kiện" :
                       column.id === "status" ? "Trạng thái" :
                       column.id === "target" ? "Số tín chỉ (UGC)" :
                       column.id === "createdAt" ? "Ngày gửi" :
                       column.id === "reviewer" ? "Người duyệt" :
                       typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => nav && nav('/events')}>
            <IconPlus size={16} className="mr-2" />
            <span className="hidden lg:inline">Làm việc xanh, săn UGC! 🌿</span>
          </Button>
        </div>
      </div>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
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
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} /{" "}
            {table.getFilteredRowModel().rows.length} hàng được chọn.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Trang {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft size={16} />
              </Button>
              <Button
                variant="outline"
                className="w-8 h-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                className="w-8 h-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight size={16} />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#22c55e",
  },
  mobile: {
    label: "Mobile",
    color: "#86efac",
  },
}

function TableCellViewer({ item }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground font-semibold whitespace-nowrap">
          {item.header}
        </Button>
      </DrawerTrigger>
      <DrawerContent className={isMobile ? "" : "h-screen top-0 right-0 left-auto mt-0 w-[400px] rounded-none"}>
        <div className="max-h-screen overflow-y-auto">
          <DrawerHeader className="gap-1 mt-4">
            <DrawerTitle>{item.header}</DrawerTitle>
            <DrawerDescription>
              Chi tiết ghi nhận tín chỉ xanh
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 px-4 text-sm mb-6">
            {!isMobile && (
              <>
                <div className="h-[200px] w-full">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <AreaChart
                      accessibilityLayer
                      data={chartData}
                      margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                        hide
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        dataKey="mobile"
                        type="natural"
                        fill="var(--color-mobile)"
                        fillOpacity={0.6}
                        stroke="var(--color-mobile)"
                        stackId="a"
                      />
                      <Area
                        dataKey="desktop"
                        type="natural"
                        fill="var(--color-desktop)"
                        fillOpacity={0.4}
                        stroke="var(--color-desktop)"
                        stackId="a"
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
                <Separator />
                <div className="grid gap-2">
                  <div className="flex gap-2 leading-none font-medium text-green-600">
                    Tăng trưởng 5.2% trong tháng này{" "}
                    <IconTrendingUp className="size-4" />
                  </div>
                  <div className="text-muted-foreground text-xs leading-relaxed">
                    Đây là biểu đồ minh họa tiến độ đạt tín chỉ của bạn. Bạn có thể xem chi tiết từng hoạt động.
                  </div>
                </div>
                <Separator />
              </>
            )}
            <form className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="header">Hoạt động</Label>
                <Input id="header" defaultValue={item.header} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="type">Loại</Label>
                  <Select defaultValue={item.type}>
                    <SelectTrigger id="type" className="w-full" disabled>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hoạt động">Hoạt động</SelectItem>
                      <SelectItem value="Sự kiện">Sự kiện</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-3">
                  <Label htmlFor="status">Trạng thái</Label>
                  <Select defaultValue={item.status}>
                    <SelectTrigger id="status" className="w-full" disabled>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hoàn thành">Hoàn thành</SelectItem>
                      <SelectItem value="Chờ xử lý">Chờ xử lý</SelectItem>
                      <SelectItem value="Từ chối">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="target">Mục tiêu (UGC)</Label>
                  <Input id="target" defaultValue={item.target} readOnly />
                </div>
                <div className="flex flex-col gap-3">
                  <Label htmlFor="limit">Hạn mức (UGC)</Label>
                  <Input id="limit" defaultValue={item.limit} readOnly />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="reviewer">Người duyệt</Label>
                <Input id="reviewer" defaultValue={item.reviewer} readOnly />
              </div>
            </form>
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full bg-green-600 hover:bg-green-700 text-white">Đóng</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// Wrapper to format data from API to the exact schema requested
export default function ClaimsDataTable({ claims, events, loading, nav }) {
  if (loading) {
    return (
      <div className="flex justify-center p-12 bg-white rounded-xl border border-gray-200">
        <IconLoader className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  const mappedData = events ? events.map(ev => {
    const claim = claims?.find(c => c.event_id === ev.id)
    return {
      id: ev.id,
      header: ev.activity_name || "Hoạt động xanh",
      eventName: ev.title || "Sự kiện ngoại khóa",
      type: "Sự kiện",
      status: claim ? (claim.status === "approved" ? "Hoàn thành" : claim.status === "rejected" ? "Từ chối" : "Chờ xử lý") : "Chưa tham gia",
      target: ev.credit_amount ? (claim?.status === "rejected" ? `-${ev.credit_amount}` : `+${ev.credit_amount}`) : "0",
      limit: "0",
      reviewer: claim?.verifier_name || "Hệ thống",
      txHash: claim?.tx_hash || null,
      createdAt: claim?.created_at || ev.start_at || ev.created_at || null,
      decidedAt: claim?.decided_at || null,
    }
  }) : (claims || []).map(c => ({
    id: c.id,
    header: c.activity_name || "Hoạt động xanh",
    eventName: c.event_title || "Sự kiện ngoại khóa",
    type: c.event_id ? "Sự kiện" : "Hoạt động",
    status: c.status === "approved" ? "Hoàn thành" : c.status === "rejected" ? "Từ chối" : "Chờ xử lý",
    target: c.credit_amount ? (c.status === "rejected" ? `-${c.credit_amount}` : `+${c.credit_amount}`) : "0",
    limit: "0",
    reviewer: "Hệ thống",
    txHash: c.tx_hash || null,
    createdAt: c.created_at || null,
    decidedAt: c.decided_at || null,
  }))

  if (!mappedData || mappedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-gray-200 text-gray-400 gap-2">
        <IconCircleCheckFilled size={48} className="opacity-20" />
        <p>Chưa có dữ liệu</p>
      </div>
    )
  }

  return <DataTable data={mappedData} nav={nav} />
}
