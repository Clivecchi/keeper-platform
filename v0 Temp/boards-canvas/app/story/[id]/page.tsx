"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Send,
  BookOpen,
  Clock,
  User,
  Star,
} from "lucide-react"
import { Navigation } from "@/components/navigation"

interface StoryFrame {
  id: string
  image: string
  title: string
  content: string
  duration: number
}

interface Comment {
  id: string
  author: string
  avatar: string
  content: string
  timestamp: string
  likes: number
}

interface Story {
  id: string
  title: string
  author: string
  authorAvatar: string
  publishDate: string
  readTime: string
  likes: number
  bookmarks: number
  frames: StoryFrame[]
  description: string
}

export default function StoryViewer() {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [progress, setProgress] = useState(0)

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const story: Story = {
    id: "1",
    title: "Luna's Magical Adventure",
    author: "Sarah Chen",
    authorAvatar: "/placeholder.svg?height=40&width=40",
    publishDate: "2 days ago",
    readTime: "3 min read",
    likes: 127,
    bookmarks: 34,
    description: "A heartwarming tale about a curious fox who discovers the magic hidden in everyday moments.",
    frames: [
      {
        id: "1",
        image: "/placeholder.svg?height=500&width=700&text=Sleepy Village",
        title: "The Sleepy Village",
        content:
          "In a quiet village where the stars danced above thatched roofs, there lived a curious little fox named Luna who dreamed of adventures beyond the cobblestone streets.",
        duration: 4000,
      },
      {
        id: "2",
        image: "/placeholder.svg?height=500&width=700&text=Mysterious Forest",
        title: "The Mysterious Forest",
        content:
          "One evening, Luna discovered a path that glowed with soft, golden light leading deep into the enchanted forest where ancient secrets whispered through the leaves.",
        duration: 4000,
      },
      {
        id: "3",
        image: "/placeholder.svg?height=500&width=700&text=Wishing Tree",
        title: "The Wishing Tree",
        content:
          "At the heart of the forest stood an ancient tree whose leaves shimmered like captured starlight, and Luna felt a warm magic flowing through her paws.",
        duration: 4000,
      },
      {
        id: "4",
        image: "/placeholder.svg?height=500&width=700&text=Wish Come True",
        title: "A Wish Come True",
        content:
          "Luna closed her eyes and made a wish for all the lonely hearts in her village to find friendship, and suddenly the whole world sparkled with new possibilities.",
        duration: 4000,
      },
    ],
  }

  const comments: Comment[] = [
    {
      id: "1",
      author: "Emma Rodriguez",
      avatar: "/placeholder.svg?height=32&width=32",
      content: "This story brought tears to my eyes! The illustrations are absolutely beautiful. 🥺✨",
      timestamp: "2 hours ago",
      likes: 12,
    },
    {
      id: "2",
      author: "Michael Park",
      avatar: "/placeholder.svg?height=32&width=32",
      content: "Perfect bedtime story for my daughter. She loves Luna already! Thank you for creating this.",
      timestamp: "5 hours ago",
      likes: 8,
    },
    {
      id: "3",
      author: "Luna_Fan_2024",
      avatar: "/placeholder.svg?height=32&width=32",
      content: "The way you describe the magical forest is so vivid. I felt like I was walking alongside Luna! 🦊🌟",
      timestamp: "1 day ago",
      likes: 15,
    },
  ]

  useEffect(() => {
    setProgress(((currentFrame + 1) / story.frames.length) * 100)
  }, [currentFrame, story.frames.length])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev < story.frames.length - 1) {
            return prev + 1
          } else {
            setIsPlaying(false)
            return prev
          }
        })
      }, story.frames[currentFrame]?.duration || 4000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentFrame, story.frames])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: story.description,
        url: window.location.href,
      })
    }
  }

  const submitComment = () => {
    if (newComment.trim()) {
      // Handle comment submission
      setNewComment("")
    }
  }

  // Touch handling for swipe gestures
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(false)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    setTouchEnd(e.targetTouches[0].clientX)
    setIsDragging(true)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentFrame < story.frames.length - 1) {
      setCurrentFrame(currentFrame + 1)
    }
    if (isRightSwipe && currentFrame > 0) {
      setCurrentFrame(currentFrame - 1)
    }

    setIsDragging(false)
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentFrame > 0) {
        setCurrentFrame(currentFrame - 1)
      }
      if (e.key === "ArrowRight" && currentFrame < story.frames.length - 1) {
        setCurrentFrame(currentFrame + 1)
      }
      if (e.key === " ") {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
    },
    [currentFrame, story.frames.length, isPlaying],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="h-6 w-px bg-amber-200" />
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Media Story</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Navigation currentView="viewer" />
              <div className="h-6 w-px bg-amber-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={isBookmarked ? "text-amber-600" : ""}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-amber-100 rounded-full h-1">
              <div
                className="bg-amber-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-2 md:px-4 py-4 md:py-6">
        {/* Story Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-4 font-serif">{story.title}</h1>
          <p className="text-lg text-amber-700 mb-6 leading-relaxed">{story.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={story.authorAvatar || "/placeholder.svg"} />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-amber-900">{story.author}</div>
                <div className="text-sm text-amber-600 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {story.publishDate}
                  </span>
                  <span>•</span>
                  <span>{story.readTime}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-amber-600">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {story.likes}
              </span>
              <span className="flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                {story.bookmarks}
              </span>
            </div>
          </div>
        </div>

        {/* Story Frame */}
        <div
          ref={containerRef}
          className="mb-4 md:mb-6 select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-amber-200 overflow-hidden">
            <CardContent className="p-4 md:p-8">
              <div className="text-center mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-amber-800 mb-2 md:mb-4 font-serif">
                  {story.frames[currentFrame]?.title}
                </h2>
              </div>

              <div className="flex justify-center mb-4 md:mb-8 relative">
                <div className="relative max-w-2xl w-full">
                  <div className={`transition-transform duration-300 ${isDragging ? "scale-95" : "scale-100"}`}>
                    <img
                      src={story.frames[currentFrame]?.image || "/placeholder.svg"}
                      alt={story.frames[currentFrame]?.title}
                      className="w-full h-auto rounded-xl shadow-lg border-4 border-white transition-all duration-500"
                      draggable={false}
                    />
                  </div>

                  {/* Decorative corners */}
                  <div className="absolute -top-2 md:-top-3 -left-2 md:-left-3 w-4 md:w-6 h-4 md:h-6 bg-amber-400 rounded-full shadow-md opacity-80"></div>
                  <div className="absolute -top-2 md:-top-3 -right-2 md:-right-3 w-4 md:w-6 h-4 md:h-6 bg-amber-400 rounded-full shadow-md opacity-80"></div>
                  <div className="absolute -bottom-2 md:-bottom-3 -left-2 md:-left-3 w-4 md:w-6 h-4 md:h-6 bg-amber-400 rounded-full shadow-md opacity-80"></div>
                  <div className="absolute -bottom-2 md:-bottom-3 -right-2 md:-right-3 w-4 md:w-6 h-4 md:h-6 bg-amber-400 rounded-full shadow-md opacity-80"></div>

                  {/* Swipe indicators */}
                  {currentFrame > 0 && (
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-amber-600/50 md:hidden">
                      <ChevronLeft className="w-6 h-6" />
                    </div>
                  )}
                  {currentFrame < story.frames.length - 1 && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-600/50 md:hidden">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center max-w-3xl mx-auto px-2">
                <p className="text-lg md:text-xl leading-relaxed text-amber-900 font-serif">
                  {story.frames[currentFrame]?.content}
                </p>
              </div>

              {/* Mobile swipe hint */}
              <div className="text-center mt-4 md:hidden">
                <p className="text-xs text-amber-600/70">Swipe left or right to navigate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 md:gap-6 mb-6 md:mb-8 px-4">
          <Button
            variant="outline"
            size="default"
            onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
            disabled={currentFrame === 0}
            className="bg-white/80 flex-1 md:flex-none"
          >
            <ChevronLeft className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-white/80 flex-1 md:flex-none"
          >
            {isPlaying ? (
              <Pause className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
            ) : (
              <Play className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={() => setCurrentFrame(Math.min(story.frames.length - 1, currentFrame + 1))}
            disabled={currentFrame === story.frames.length - 1}
            className="bg-white/80 flex-1 md:flex-none"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 md:w-5 h-4 md:h-5 ml-1 md:ml-2" />
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={() => setIsMuted(!isMuted)}
            className="bg-white/80 md:flex hidden"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>

        {/* Frame Navigation */}
        <div className="mb-6 md:mb-8 px-2">
          <div className="flex justify-center gap-1 md:gap-2 flex-wrap">
            {story.frames.map((frame, index) => (
              <button
                key={frame.id}
                onClick={() => setCurrentFrame(index)}
                className={`w-12 md:w-16 h-12 md:h-16 rounded-lg border-2 transition-all duration-200 ${
                  index === currentFrame
                    ? "border-amber-500 shadow-lg scale-110"
                    : "border-amber-200 hover:border-amber-400 opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={frame.image || "/placeholder.svg"}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-full object-cover rounded-md"
                  draggable={false}
                />
              </button>
            ))}
          </div>
          <div className="text-center mt-2 md:mt-3 text-xs md:text-sm text-amber-600">
            Frame {currentFrame + 1} of {story.frames.length}
          </div>
        </div>

        {/* Engagement Section */}
        <Card className="bg-white/90 backdrop-blur-sm border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsLiked(!isLiked)}
                  className={`flex items-center gap-2 ${isLiked ? "text-red-500" : "text-amber-600"}`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                  <span>{story.likes + (isLiked ? 1 : 0)}</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center gap-2 text-amber-600"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{comments.length}</span>
                </Button>

                <Button variant="ghost" onClick={handleShare} className="text-amber-600">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-current" />
                <span className="text-sm text-amber-700">4.9 • 23 reviews</span>
              </div>
            </div>

            {showComments && (
              <div className="border-t pt-6">
                <div className="mb-4">
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Share your thoughts about this story..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px] bg-white/80"
                      />
                      <div className="flex justify-end mt-2">
                        <Button size="sm" onClick={submitComment} disabled={!newComment.trim()}>
                          <Send className="w-4 h-4 mr-2" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <ScrollArea className="max-h-96">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{comment.author[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-amber-50 rounded-lg p-3">
                            <div className="font-semibold text-sm text-amber-900 mb-1">{comment.author}</div>
                            <p className="text-amber-800">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-amber-600">
                            <span>{comment.timestamp}</span>
                            <button className="flex items-center gap-1 hover:text-amber-800">
                              <Heart className="w-3 h-3" />
                              {comment.likes}
                            </button>
                            <button className="hover:text-amber-800">Reply</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
