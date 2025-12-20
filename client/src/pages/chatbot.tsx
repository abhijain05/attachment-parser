import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Palette,
  Settings,
  MessageCircle,
  Send,
  X,
  Save,
  Loader,
  ThumbsUp,
  ThumbsDown,
  Copy
} from "lucide-react";
import type { Project, ChatbotConfig } from "@shared/schema";

export default function ChatbotBuilder() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [config, setConfig] = useState<Partial<ChatbotConfig>>({
    primaryColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
    textColor: "#1F2937",
    position: "bottom-right",
    welcomeMessage: "Hello! How can I help you today?",
    botName: "AI Assistant",
    tone: "professional",
    showSources: true,
  });
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewMessages, setPreviewMessages] = useState<{ role: string; content: string }[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [previewMessages]);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: savedConfig, isLoading: configLoading } = useQuery<ChatbotConfig>({
    queryKey: ["/api/chatbot-config", selectedProject],
    enabled: !!selectedProject,
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig({
        primaryColor: savedConfig.primaryColor || "#3B82F6",
        backgroundColor: savedConfig.backgroundColor || "#FFFFFF",
        textColor: savedConfig.textColor || "#1F2937",
        position: savedConfig.position || "bottom-right",
        welcomeMessage: savedConfig.welcomeMessage || "Hello! How can I help you today?",
        botName: savedConfig.botName || "AI Assistant",
        tone: savedConfig.tone || "professional",
        showSources: savedConfig.showSources ?? true,
      });
    }
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ChatbotConfig>) => {
      return await apiRequest("PUT", `/api/chatbot-config/${selectedProject}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-config", selectedProject] });
      toast({
        title: "Settings saved",
        description: "Your chatbot configuration has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not save your settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!selectedProject) return;
    saveMutation.mutate(config);
  };

  const handlePreviewSend = () => {
    if (!previewMessage.trim()) return;
    setPreviewMessages((prev) => [
      ...prev,
      { role: "user", content: previewMessage },
    ]);
    setPreviewMessage("");
    
    setIsTyping(true);
    setTimeout(() => {
      setPreviewMessages((prev) => [
        ...prev,
        { role: "assistant", content: "This is a preview response. In production, I would answer based on your uploaded knowledge base." },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chatbot Builder</h1>
          <p className="text-muted-foreground">
            Customize your AI assistant's appearance and behavior.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48" data-testid="select-project-chatbot">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSave}
            disabled={!selectedProject || saveMutation.isPending}
            data-testid="button-save-chatbot"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {!selectedProject ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Project</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Choose a project to customize its chatbot appearance and settings.
            </p>
          </CardContent>
        </Card>
      ) : configLoading ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Tabs defaultValue="appearance">
              <TabsList className="w-full">
                <TabsTrigger value="appearance" className="flex-1">
                  <Palette className="h-4 w-4 mr-2" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Behavior
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appearance" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Visual Settings</CardTitle>
                    <CardDescription>
                      Customize colors and positioning to match your brand.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            id="primaryColor"
                            value={config.primaryColor}
                            onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                            className="h-10 w-14 rounded-md border cursor-pointer"
                          />
                          <Input
                            value={config.primaryColor}
                            onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                            className="font-mono"
                            data-testid="input-primary-color"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="backgroundColor">Background Color</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            id="backgroundColor"
                            value={config.backgroundColor}
                            onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                            className="h-10 w-14 rounded-md border cursor-pointer"
                          />
                          <Input
                            value={config.backgroundColor}
                            onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                            className="font-mono"
                            data-testid="input-background-color"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          id="textColor"
                          value={config.textColor}
                          onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                          className="h-10 w-14 rounded-md border cursor-pointer"
                        />
                        <Input
                          value={config.textColor}
                          onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                          className="font-mono"
                          data-testid="input-text-color"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Widget Position</Label>
                      <Select
                        value={config.position}
                        onValueChange={(v) => setConfig({ ...config, position: v })}
                      >
                        <SelectTrigger data-testid="select-position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="behavior" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bot Settings</CardTitle>
                    <CardDescription>
                      Configure how your AI assistant behaves.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="botName">Bot Name</Label>
                      <Input
                        id="botName"
                        value={config.botName}
                        onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                        placeholder="AI Assistant"
                        data-testid="input-bot-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="welcomeMessage">Welcome Message</Label>
                      <Textarea
                        id="welcomeMessage"
                        value={config.welcomeMessage}
                        onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                        placeholder="Hello! How can I help you today?"
                        rows={3}
                        data-testid="input-welcome-message"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Response Tone</Label>
                      <Select
                        value={config.tone}
                        onValueChange={(v) => setConfig({ ...config, tone: v })}
                      >
                        <SelectTrigger data-testid="select-tone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Sources</Label>
                        <p className="text-sm text-muted-foreground">
                          Display document sources in responses
                        </p>
                      </div>
                      <Switch
                        checked={config.showSources}
                        onCheckedChange={(v) => setConfig({ ...config, showSources: v })}
                        data-testid="switch-show-sources"
                      />
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Live Chat</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow visitors to chat with you in real-time
                          </p>
                        </div>
                        <Switch
                          checked={config.enableLiveChat || false}
                          onCheckedChange={(v) => setConfig({ ...config, enableLiveChat: v })}
                          data-testid="switch-enable-live-chat"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Preview</CardTitle>
                <CardDescription>
                  See how your chatbot will appear on your website.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4 min-h-[500px] flex flex-col items-center justify-center overflow-hidden">
                  <div className="text-xs text-muted-foreground mb-4">Your Website Preview</div>
                  
                  <div className="w-full max-w-sm relative">
                    {!isChatOpen ? (
                      <div className="flex justify-end">
                        <Button
                          size="icon"
                          className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
                          style={{ backgroundColor: config.primaryColor }}
                          onClick={() => setIsChatOpen(true)}
                          data-testid="button-open-preview-chat"
                        >
                          <MessageSquare className="h-5 w-5 text-white" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[450px] animate-in fade-in slide-in-from-bottom-4 duration-300"
                        style={{ backgroundColor: config.backgroundColor }}
                      >
                        <div
                          className="px-4 py-4 flex items-center justify-between flex-shrink-0"
                          style={{ backgroundColor: config.primaryColor }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                              <MessageCircle className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-white font-semibold text-sm">
                                {config.botName}
                              </span>
                              <span className="text-white/70 text-xs">Always here to help</span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-white/20"
                            onClick={() => setIsChatOpen(false)}
                            data-testid="button-close-preview-chat"
                          >
                            <X className="h-4 w-4 text-white" />
                          </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-muted/5">
                          <div
                            className="text-sm p-3 rounded-xl max-w-[85%] rounded-bl-none animate-in fade-in slide-in-from-left-2 duration-500"
                            style={{
                              backgroundColor: `${config.primaryColor}15`,
                              color: config.textColor,
                              border: `1px solid ${config.primaryColor}30`,
                            }}
                          >
                            {config.welcomeMessage}
                          </div>
                          
                          {previewMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={`text-sm p-3 rounded-xl max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                                msg.role === "user" 
                                  ? "ml-auto rounded-br-none" 
                                  : "rounded-bl-none"
                              }`}
                              style={{
                                backgroundColor: msg.role === "assistant" 
                                  ? `${config.primaryColor}15`
                                  : config.primaryColor,
                                color: msg.role === "assistant" ? config.textColor : "white",
                                border: msg.role === "assistant" ? `1px solid ${config.primaryColor}30` : "none",
                              }}
                            >
                              {msg.content}
                            </div>
                          ))}
                          
                          {isTyping && (
                            <div
                              className="text-sm p-3 rounded-xl max-w-[85%] rounded-bl-none flex items-center gap-2 animate-in fade-in duration-300"
                              style={{
                                backgroundColor: `${config.primaryColor}15`,
                                color: config.textColor,
                                border: `1px solid ${config.primaryColor}30`,
                              }}
                            >
                              <Loader className="h-3 w-3 animate-spin" />
                              <span>Typing</span>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        <div 
                          className="p-3 border-t flex-shrink-0" 
                          style={{ borderColor: `${config.textColor}15` }}
                        >
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type a message..."
                              value={previewMessage}
                              onChange={(e) => setPreviewMessage(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handlePreviewSend()}
                              disabled={isTyping}
                              className="text-sm bg-muted/50"
                              style={{ color: config.textColor }}
                              data-testid="input-preview-message"
                            />
                            <Button
                              size="icon"
                              onClick={handlePreviewSend}
                              disabled={isTyping || !previewMessage.trim()}
                              className="flex-shrink-0 text-white hover:scale-105 transition-transform"
                              style={{ backgroundColor: config.primaryColor }}
                              data-testid="button-preview-send"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  Modern Chat Features
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm">✓</div>
                  <div>
                    <p className="font-medium text-sm">Typing Indicators</p>
                    <p className="text-xs text-muted-foreground">Users see when your bot is responding</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm">✓</div>
                  <div>
                    <p className="font-medium text-sm">Smooth Animations</p>
                    <p className="text-xs text-muted-foreground">Messages fade in with smooth transitions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm">✓</div>
                  <div>
                    <p className="font-medium text-sm">Open & Close Button</p>
                    <p className="text-xs text-muted-foreground">Users can minimize the chat anytime</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
