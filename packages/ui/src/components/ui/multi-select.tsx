"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export type MultiSelectOption = {
  id: number
  name: string
}

export type MultiSelectProps = {
  options: MultiSelectOption[]
  selected: number[]
  onChange: (selected: number[]) => void
  placeholder?: string
  disabled?: boolean
  searchPlaceholder?: string
  emptyText?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  disabled = false,
  searchPlaceholder = "Search...",
  emptyText = "No items found.",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const selectedOptions = React.useMemo(
    () => options.filter((opt) => selected.includes(opt.id)),
    [options, selected]
  )

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm])

  const handleSelect = (optionId: number) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId]
    onChange(newSelected)
  }

  const handleRemove = (optionId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((id) => id !== optionId))
  }

  const displayText =
    selectedOptions.length === 0
      ? placeholder
      : `${selectedOptions.length} selected`

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{displayText}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={String(option.id)}
                    onSelect={() => handleSelect(option.id)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
                        selected.includes(option.id)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="size-4" />
                    </div>
                    <span>{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <Badge
              key={option.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-xs">{option.name}</span>
              <button
                type="button"
                onClick={(e) => handleRemove(option.id, e)}
                className="ml-1 rounded-sm hover:bg-secondary-foreground/20"
                aria-label={`Remove ${option.name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
