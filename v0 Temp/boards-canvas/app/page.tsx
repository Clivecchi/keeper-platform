"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Pause,
  Plus,
  ImageIcon,
  Type,
  Palette,
  Save,
  Share2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Book,
  Film,
} from "lucide-react"
import { Navigation } from "@/components/navigation"

interface StoryFrame {
  id: string
  image: string
  title: string
  content: string
  duration: number
}

export default function BoardsCanvas() {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [storyTitle, setStoryTitle] = useState("Once Upon a Time...")

  const [frames, setFrames] = useState<StoryFrame[]>([
    {
      id: "1",
      image: "/placeholder.svg?height=400&width=600",
      title: "Chapter 1: The Sleepy Village",
      content:
        "In a quiet village where the stars danced above thatched roofs, there lived a curious little fox named Luna.",
      duration: 3000,
    },
    {
      id: "2",
      image: "/placeholder.svg?height=400&width=600",
      title: "Chapter 2: The Mysterious Forest",
      content:
        "One evening, Luna discovered a path that glowed with soft, golden light leading deep into the enchanted forest.",
      duration: 3000,
    },
    {
      id: "3",
      image: "/placeholder.svg?height=400&width=600",
      title: "Chapter 3: The Wishing Tree",
      content: "At the heart of the forest stood an ancient tree whose leaves shimmered like captured starlight.",
      duration: 3000,
    },
    {
      id: "4",
      image: "/placeholder.svg?height=400&width=600",
      title: "Chapter 4: A Wish Come True",
      content:
        "Luna closed her eyes and made a wish, and suddenly the whole world seemed to sparkle with new possibilities.",
      duration: 3000,
    },
  ])

  const addNewFrame = () => {
    const newFrame: StoryFrame = {
      id: Date.now().toString(),
      image: "/placeholder.svg?height=400&width=600",
      title: `Chapter ${frames.length + 1}`,
      content: "Write your story here...",
      duration: 3000,
    }
    setFrames([...frames, newFrame])
  }

  const updateFrame = (index: number, updates: Partial<StoryFrame>) => {
    const updatedFrames = frames.map((frame, i) => (i === index ? { ...frame, ...updates } : frame))
    setFrames(updatedFrames)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Book className="w-6 h-6 text-amber-600" />
              <span className="font-bold text-xl text-amber-800">Boards</span>
            </div>
            <div className="h-6 w-px bg-amber-200" />
            <div className="flex items-center gap-2 text-amber-700">
              <Film className="w-4 h-4" />
              <span className="text-sm font-medium">Media Story</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Navigation currentView="creator" />
            <div className="h-6 w-px bg-amber-200 mx-2" />
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar Tools */}
        <aside className="w-64 bg-white/60 backdrop-blur-sm border-r p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-amber-800 mb-3">Story Details</h3>
            <Input
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              className="mb-3 bg-white/80"
              placeholder="Story title..."
            />
          </div>

          <div>
            <h3 className="font-semibold text-amber-800 mb-3">Add Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-12 flex-col gap-1 bg-transparent">
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs">Image</span>
              </Button>
              <Button variant="outline" size="sm" className="h-12 flex-col gap-1 bg-transparent">
                <Type className="w-4 h-4" />
                <span className="text-xs">Text</span>
              </Button>
              <Button variant="outline" size="sm" className="h-12 flex-col gap-1 bg-transparent">
                <Palette className="w-4 h-4" />
                <span className="text-xs">Style</span>
              </Button>
              <Button
                onClick={addNewFrame}
                variant="outline"
                size="sm"
                className="h-12 flex-col gap-1 border-dashed border-amber-300 hover:border-amber-400 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Frame</span>
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-amber-800 mb-3">Current Frame</h3>
            {frames[currentFrame] && (
              <div className="space-y-3">
                <Input
                  value={frames[currentFrame].title}
                  onChange={(e) => updateFrame(currentFrame, { title: e.target.value })}
                  className="bg-white/80"
                  placeholder="Chapter title..."
                />
                <Textarea
                  value={frames[currentFrame].content}
                  onChange={(e) => updateFrame(currentFrame, { content: e.target.value })}
                  className="bg-white/80 min-h-[100px]"
                  placeholder="Write your story..."
                />
              </div>
            )}
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 flex flex-col">
          {/* Story Canvas */}
          <div className="flex-1 p-6">
            <Card className="h-full bg-white/80 backdrop-blur-sm shadow-lg border-amber-200">
              <CardContent className="p-8 h-full flex flex-col">
                {frames[currentFrame] && (
                  <>
                    <div className="text-center mb-6">
                      <h1 className="text-3xl font-bold text-amber-800 mb-2 font-serif">{storyTitle}</h1>
                      <h2 className="text-xl text-amber-700 font-medium">{frames[currentFrame].title}</h2>
                    </div>

                    <div className="flex-1 flex items-center justify-center mb-6">
                      <div className="relative max-w-2xl w-full">
                        <img
                          src={frames[currentFrame].image || "/placeholder.svg"}
                          alt={frames[currentFrame].title}
                          className="w-full h-auto rounded-lg shadow-md border-4 border-white"
                        />
                        <div className="absolute -top-2 -left-2 w-4 h-4 bg-amber-400 rounded-full shadow-sm"></div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full shadow-sm"></div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-amber-400 rounded-full shadow-sm"></div>
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-400 rounded-full shadow-sm"></div>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-lg leading-relaxed text-amber-900 font-serif max-w-2xl mx-auto">
                        {frames[currentFrame].content}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filmstrip Navigation */}
          <div className="bg-amber-900/90 backdrop-blur-sm p-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
                disabled={currentFrame === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button variant="secondary" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentFrame(Math.min(frames.length - 1, currentFrame + 1))}
                disabled={currentFrame === frames.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {frames.map((frame, index) => (
                  <Card
                    key={frame.id}
                    className={`flex-shrink-0 w-32 cursor-pointer transition-all duration-200 ${
                      index === currentFrame
                        ? "ring-2 ring-amber-400 shadow-lg scale-105"
                        : "hover:scale-102 opacity-80 hover:opacity-100"
                    }`}
                    onClick={() => setCurrentFrame(index)}
                  >
                    <CardContent className="p-2">
                      <img
                        src={frame.image || "/placeholder.svg"}
                        alt={frame.title}
                        className="w-full h-16 object-cover rounded mb-2"
                      />
                      <div className="text-xs text-center">
                        <div className="font-medium text-amber-100 truncate">Chapter {index + 1}</div>
                        <div className="text-amber-200/80 text-[10px] mt-1">{frame.duration / 1000}s</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card
                  className="flex-shrink-0 w-32 cursor-pointer border-dashed border-amber-400 hover:border-amber-300 transition-colors"
                  onClick={addNewFrame}
                >
                  <CardContent className="p-2 h-full flex items-center justify-center">
                    <div className="text-center text-amber-300">
                      <Plus className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-xs">Add Frame</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </main>
      </div>
    </div>
  )
}
