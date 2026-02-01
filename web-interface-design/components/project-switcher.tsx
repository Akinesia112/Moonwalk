"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const projects = [
  {
    label: "Projects",
    projects: [
      {
        label: "Project: Chronos Legacy",
        value: "chronos-legacy",
      },
      {
        label: "Cyberpunk 2087",
        value: "cyberpunk-2087",
      },
      {
        label: "Fantasy Quest Trailer",
        value: "fantasy-quest",
      },
      {
        label: "Product Launch 2025",
        value: "product-launch",
      },
    ],
  },
]

export function ProjectSwitcher() {
  const [open, setOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState("chronos-legacy")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="justify-between text-sm hover:bg-accent"
        >
          <span className="font-normal">
            {selectedProject
              ? projects[0].projects.find((project) => project.value === selectedProject)?.label
              : "Select project..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search project..." />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            {projects.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.projects.map((project) => (
                  <CommandItem
                    key={project.value}
                    onSelect={() => {
                      setSelectedProject(project.value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedProject === project.value ? "opacity-100" : "opacity-0")}
                    />
                    {project.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
