import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Clock, Users, MapPin, Globe, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VisitorSession, LiveChatMessage, ChatMessage, Project } from "@shared/schema";

interface VisitorsPageProps {
  projectId?: string;
}

export default function VisitorsPage({ projectId: propsProjectId }: VisitorsPageProps) {
  const [location] = useLocation();
  const routeMatch = location.match(/\/visitors\/(.+)/);
  const [selectedProject, setSelectedProject] = useState(propsProjectId || routeMatch?.[1] || "");
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState("live-chat"); // live-chat or ai-history
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch projects for selector
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch visitors
  const { data: visitors = [], isLoading } = useQuery<VisitorSession[]>({
    queryKey: ["/api/visitors", selectedProject],
    queryFn: async () => {
      const res = await fetch(`/api/visitors?projectId=${selectedProject}`);
      if (!res.ok) throw new Error("Failed to fetch visitors");
      return res.json();
    },
    enabled: !!selectedProject,
    refetchInterval: 5000, // Poll every 5s for live updates
  });

  // Fetch live chat messages
  const { data: chatMessages = [] } = useQuery({
    queryKey: ["/api/live-chat", selectedVisitor],
    queryFn: async () => {
      if (!selectedVisitor) return [];
      const res = await apiRequest("GET", `/api/live-chat/${selectedVisitor}`);
      return res.json();
    },
    enabled: !!selectedVisitor,
    refetchInterval: autoRefresh ? 3000 : false, // Poll every 3s or on demand
  });

  // Fetch AI conversation history
  const { data: aiHistory = [] } = useQuery({
    queryKey: ["/api/visitor-ai-history", selectedVisitor],
    queryFn: async () => {
      if (!selectedVisitor) return [];
      const res = await apiRequest("GET", `/api/visitor-ai-history/${selectedVisitor}`);
      return res.json();
    },
    enabled: !!selectedVisitor,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) =>
      apiRequest("POST", "/api/live-chat/send", {
        visitorSessionId: selectedVisitor,
        content,
      }),
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/live-chat", selectedVisitor] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendMessageMutation.mutate(chatMessage);
    }
  };

  const activeVisitors = visitors.filter((v: VisitorSession) => v.isActive);
  const selectedVisitorData = visitors.find((v: VisitorSession) => v.id === selectedVisitor);

  if (!selectedProject) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Active Visitors</h1>
            <p className="text-muted-foreground">
              Monitor real-time visitors and chat with them directly.
            </p>
          </div>
        </div>
        <Card>
          <div className="p-8 flex flex-col items-center justify-center">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Project</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              Choose a project to see its active visitors and manage live chat.
            </p>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-80" data-testid="select-project-visitors">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Visitors</h1>
          <p className="text-muted-foreground">
            Monitor and chat with your website visitors in real-time.
          </p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48" data-testid="select-project-visitors-header">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        {/* Visitors List */}
        <Card className="w-80 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Active Visitors ({activeVisitors.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeVisitors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active visitors</p>
            ) : (
              activeVisitors.map((visitor: VisitorSession) => (
                <div
                  key={visitor.id}
                  onClick={() => setSelectedVisitor(visitor.id)}
                  className={`p-3 rounded-md cursor-pointer transition ${selectedVisitor === visitor.id ? "bg-primary text-primary-foreground" : "hover-elevate"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{visitor.visitorName || "Visitor"}</span>
                    <Badge variant={visitor.chatMode === "live" ? "default" : "secondary"}>
                      {visitor.chatMode}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{visitor.pageUrl}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(visitor.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col gap-4">
          {selectedVisitorData ? (
            <>
              {/* Visitor Details Card */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedVisitorData.visitorName || "Visitor"}</h3>
                    <p className="text-sm text-muted-foreground">{selectedVisitorData.visitorEmail || "No email"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Current Page</p>
                        <p className="truncate font-medium">{selectedVisitorData.pageUrl || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Referrer</p>
                        <p className="truncate font-medium">{selectedVisitorData.referrer || "Direct"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Joined</p>
                        <p className="font-medium">{new Date(selectedVisitorData.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={selectedVisitorData.isActive ? "default" : "secondary"}>
                        {selectedVisitorData.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Chat Tabs */}
              <Card className="flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="w-full rounded-none border-b bg-muted p-0">
                    <TabsTrigger value="live-chat" className="flex-1 rounded-none">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Live Chat
                    </TabsTrigger>
                    <TabsTrigger value="ai-history" className="flex-1 rounded-none">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      AI Conversation
                    </TabsTrigger>
                  </TabsList>

                  {/* Live Chat Tab */}
                  <TabsContent value="live-chat" className="flex-1 flex flex-col p-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No live messages yet</p>
                      ) : (
                        chatMessages.map((msg: LiveChatMessage) => (
                          <div key={msg.id} className={`flex ${msg.sender === "owner" ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-xs px-4 py-2 rounded-md ${msg.sender === "owner"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                                }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2 bg-muted/50">
                      <Input
                        placeholder="Type a message..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        disabled={sendMessageMutation.isPending}
                        data-testid="input-chat-message"
                      />
                      <Button
                        type="submit"
                        disabled={sendMessageMutation.isPending || !chatMessage.trim()}
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* AI Conversation Tab */}
                  <TabsContent value="ai-history" className="flex-1 flex flex-col p-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      {aiHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No AI conversation history</p>
                      ) : (
                        aiHistory.map((session: any, sessionIdx: number) => (
                          <div key={sessionIdx} className="space-y-3 pb-4 border-b">
                            <p className="text-xs text-muted-foreground font-medium">
                              {new Date(session.createdAt).toLocaleDateString()} - {new Date(session.createdAt).toLocaleTimeString()}
                            </p>
                            <div className="space-y-2">
                              {session.messages.map((msg: ChatMessage) => (
                                <div key={msg.id} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                                  <div
                                    className={`max-w-xs px-3 py-2 rounded-md text-sm ${msg.role === "assistant"
                                        ? "bg-blue-100 text-blue-900"
                                        : "bg-gray-100 text-gray-900"
                                      }`}
                                  >
                                    <p>{msg.content}</p>
                                    {msg.sources && msg.sources.length > 0 && (
                                      <div className="mt-2 text-xs border-t pt-1">
                                        <p className="font-medium mb-1">Sources:</p>
                                        {msg.sources.map((src: any, idx: number) => (
                                          <p key={idx}>• {src.documentName}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </>
          ) : (
            <Card className="flex items-center justify-center flex-1">
              <p className="text-muted-foreground">Select a visitor to view details and chat</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
