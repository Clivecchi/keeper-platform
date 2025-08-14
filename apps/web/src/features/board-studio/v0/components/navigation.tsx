"use client"

import { Button } from "./ui/button"
import { BookOpen, Edit3, Library, Eye, Layout, Sparkles } from "lucide-react"

export function Navigation({ currentView }: { currentView: "edit" | "layout" | "preview" | "assist" }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant={currentView === "edit" ? "default" : "outline"} size="sm">
        <Edit3 className="w-4 h-4 mr-2" />
        Edit
      </Button>
      <Button variant={currentView === "layout" ? "default" : "outline"} size="sm">
        <Layout className="w-4 h-4 mr-2" />
        Layout
      </Button>
      <Button variant={currentView === "preview" ? "default" : "outline"} size="sm">
        <Eye className="w-4 h-4 mr-2" />
        Preview
      </Button>
      <Button variant={currentView === "assist" ? "default" : "outline"} size="sm">
        <Sparkles className="w-4 h-4 mr-2" />
        AI Assist
      </Button>
    </div>
  )
}
