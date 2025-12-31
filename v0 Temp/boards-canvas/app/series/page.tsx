"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  BookOpen,
  Bot,
  Users,
  Sparkles,
  Settings,
  Eye,
  Brain,
  MessageSquare,
  Calendar,
  MoreHorizontal,
  Edit3,
  Play,
  Clock,
  Star,
  Zap,
} from "lucide-react"

interface AIAgent {
  id: string
  name: string
  role: string
  expertise: string
  avatar: string
  personality: string
  knowledge: string[]
  active: boolean
}

interface MediaStory {
  id: string
  title: string
  description: string
  frames: number
  status: "draft" | "published" | "in-progress"
  aiAssisted: boolean
  thumbnail: string
  createdAt: string
  views: number
  likes: number
}

interface Series {
  id: string
  title: string
  description: string
  genre: string
  stories: MediaStory[]
  aiAgents: AIAgent[]
  subscribers: number
  totalViews: number
  status: "active" | "completed" | "hiatus"
  coverImage: string
  createdAt: string
}

export default function SeriesManagement() {
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)
  const [showCreateSeries, setShowCreateSeries] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [showAIChat, setShowAIChat] = useState<string | null>(null)

  const [series] = useState<Series[]>([
    {
      id: "1",
      title: "Luna's Magical Adventures",
      description:
        "Follow Luna the fox as she discovers magical worlds and makes new friends in this heartwarming series.",
      genre: "Fantasy",
      stories: [
        {
          id: "1",
          title: "The Sleepy Village",
          description: "Luna's first adventure begins in her quiet village",
          frames: 4,
          status: "published",
          aiAssisted: true,
          thumbnail: "/placeholder.svg?height=200&width=300&text=Village",
          createdAt: "2 days ago",
          views: 1250,
          likes: 89,
        },
        {
          id: "2",
          title: "The Enchanted Forest",
          description: "Luna ventures into the mysterious forest",
          frames: 6,
          status: "in-progress",
          aiAssisted: true,
          thumbnail: "/placeholder.svg?height=200&width=300&text=Forest",
          createdAt: "1 day ago",
          views: 0,
          likes: 0,
        },
        {
          id: "3",
          title: "The Crystal Cave",
          description: "A new adventure awaits in the crystal cave",
          frames: 0,
          status: "draft",
          aiAssisted: false,
          thumbnail: "/placeholder.svg?height=200&width=300&text=Cave",
          createdAt: "Today",
          views: 0,
          likes: 0,
        },
      ],
      aiAgents: [
        {
          id: "1",
          name: "Luna",
          role: "Character Expert",
          expertise: "Luna's personality, backstory, and character development",
          avatar: "/placeholder.svg?height=40&width=40&text=🦊",
          personality: "Curious, brave, and kind-hearted",
          knowledge: ["Luna's childhood", "Her magical abilities", "Relationships with other characters"],
          active: true,
        },
        {
          id: "2",
          name: "Sage",
          role: "World Builder",
          expertise: "Magical world lore, geography, and history",
          avatar: "/placeholder.svg?height=40&width=40&text=🧙",
          personality: "Wise, mysterious, and knowledgeable",
          knowledge: ["Magical systems", "World history", "Geography and locations"],
          active: true,
        },
        {
          id: "3",
          name: "Narrator",
          role: "Story Guide",
          expertise: "Plot development, pacing, and narrative structure",
          avatar: "/placeholder.svg?height=40&width=40&text=📖",
          personality: "Thoughtful, creative, and engaging",
          knowledge: ["Story arcs", "Character relationships", "Thematic elements"],
          active: true,
        },
      ],
      subscribers: 1247,
      totalViews: 15680,
      status: "active",
      coverImage: "/placeholder.svg?height=300&width=500&text=Luna Series",
      createdAt: "1 week ago",
    },
  ])

  const currentSeries = series.find((s) => s.id === selectedSeries) || series[0]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-amber-600" />
                <span className="font-bold text-xl text-amber-800">Boards</span>
              </div>
              <div className="h-6 w-px bg-amber-200" />
              <div className="flex items-center gap-2 text-amber-700">
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium">AI-Assisted Series</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateSeries(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Series
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Series Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Your Series
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {series.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSeries(s.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      currentSeries.id === s.id
                        ? "bg-amber-100 border-2 border-amber-300"
                        : "bg-white/60 hover:bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={s.coverImage || "/placeholder.svg"}
                        alt={s.title}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-amber-900 truncate">{s.title}</h3>
                        <p className="text-xs text-amber-600">{s.stories.length} stories</p>
                        <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs mt-1">
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Series Overview */}
            <Card className="bg-white/90 backdrop-blur-sm border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <img
                    src={currentSeries.coverImage || "/placeholder.svg"}
                    alt={currentSeries.title}
                    className="w-32 h-32 rounded-xl object-cover border-4 border-white shadow-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-amber-900 font-serif">{currentSeries.title}</h1>
                      <Badge className="bg-amber-100 text-amber-800">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI-Assisted
                      </Badge>
                    </div>
                    <p className="text-amber-700 mb-4 leading-relaxed">{currentSeries.description}</p>
                    <div className="flex items-center gap-6 text-sm text-amber-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {currentSeries.subscribers.toLocaleString()} subscribers
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {currentSeries.totalViews.toLocaleString()} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {currentSeries.createdAt}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Agents */}
            <Card className="bg-white/90 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-800 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Story Agents
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowCreateAgent(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Agent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentSeries.aiAgents.map((agent) => (
                    <Card key={agent.id} className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-12 h-12 border-2 border-amber-300">
                            <AvatarImage src={agent.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{agent.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-amber-900">{agent.name}</h3>
                            <p className="text-xs text-amber-600">{agent.role}</p>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${agent.active ? "bg-green-500" : "bg-gray-400"}`} />
                        </div>
                        <p className="text-sm text-amber-700 mb-3">{agent.expertise}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {agent.knowledge.length} knowledge areas
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => setShowAIChat(agent.id)}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stories in Series */}
            <Card className="bg-white/90 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Stories in Series
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Story
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentSeries.stories.map((story, index) => (
                    <Card key={story.id} className="bg-white border-amber-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="relative mb-3">
                          <img
                            src={story.thumbnail || "/placeholder.svg"}
                            alt={story.title}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 left-2">
                            <Badge className={getStatusColor(story.status)}>{story.status}</Badge>
                          </div>
                          {story.aiAssisted && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-purple-100 text-purple-800">
                                <Zap className="w-3 h-3 mr-1" />
                                AI
                              </Badge>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                            Episode {index + 1}
                          </div>
                        </div>

                        <h3 className="font-semibold text-amber-900 mb-2">{story.title}</h3>
                        <p className="text-sm text-amber-700 mb-3 line-clamp-2">{story.description}</p>

                        <div className="flex items-center justify-between text-xs text-amber-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {story.createdAt}
                          </span>
                          <span>{story.frames} frames</span>
                        </div>

                        {story.status === "published" && (
                          <div className="flex items-center justify-between text-xs text-amber-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {story.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {story.likes}
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {story.status === "published" && (
                            <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                              <Play className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] bg-white">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={currentSeries.aiAgents.find((a) => a.id === showAIChat)?.avatar || "/placeholder.svg"}
                    />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-amber-800">
                      Chat with {currentSeries.aiAgents.find((a) => a.id === showAIChat)?.name}
                    </CardTitle>
                    <p className="text-sm text-amber-600">
                      {currentSeries.aiAgents.find((a) => a.id === showAIChat)?.role}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAIChat(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96 p-4">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={currentSeries.aiAgents.find((a) => a.id === showAIChat)?.avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-amber-50 rounded-lg p-3 flex-1">
                      <p className="text-amber-900">
                        Hello! I'm {currentSeries.aiAgents.find((a) => a.id === showAIChat)?.name}. I can help you with{" "}
                        {currentSeries.aiAgents.find((a) => a.id === showAIChat)?.expertise.toLowerCase()}. What would
                        you like to explore about the story?
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input placeholder="Ask me about the story..." className="flex-1" />
                  <Button>Send</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
