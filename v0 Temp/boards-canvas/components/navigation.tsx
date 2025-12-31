"use client"

import { Button } from "@/components/ui/button"
import { BookOpen, Edit3, Library } from "lucide-react"

export function Navigation({ currentView }: { currentView: "creator" | "viewer" | "series" }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant={currentView === "series" ? "default" : "outline"} size="sm" asChild>
        <a href="/series">
          <Library className="w-4 h-4 mr-2" />
          Series
        </a>
      </Button>
      <Button variant={currentView === "creator" ? "default" : "outline"} size="sm" asChild>
        <a href="/">
          <Edit3 className="w-4 h-4 mr-2" />
          Creator
        </a>
      </Button>
      <Button variant={currentView === "viewer" ? "default" : "outline"} size="sm" asChild>
        <a href="/story/demo">
          <BookOpen className="w-4 h-4 mr-2" />
          Viewer
        </a>
      </Button>
    </div>
  )
}
