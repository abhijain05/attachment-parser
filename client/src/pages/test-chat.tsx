import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, MessageCircle, File, Loader2, Paperclip, X } from "lucide-react";
import type { Project, ChatMessage } from "@shared/schema";

interface ChatResponse {
  sessionId: string;
  message: string;
  sources?: { documentId: string; documentName: string; snippet: string }[];
}

export default function TestChat() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string; sources?: any; attachments?: any }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        let content = event.target?.result as string;
        
        // Limit content size to 100KB
        if (content.length > 100000) {
          content = content.substring(0, 100000) + "...[file truncated]";
        }

        setAttachments((prev) => [...prev, {
          name: file.name,
          type: file.type || "text/plain",
          content: content,
        }]);
      };
      
      // Read as text for supported types, data URL for images
      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf" || file.type.includes("word") || file.type.includes("document")) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        projectId: selectedProject,
        sessionId: sessionId || undefined,
        message,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      return res.json();
    },
    onSuccess: (data: ChatResponse) => {
      console.log("[TestChat] Received response:", { message: data.message, messageLength: data.message?.length });
      if (!data.message || data.message.trim().length === 0) {
        console.error("[TestChat] Received empty message from API");
        toast({
          title: "Empty Response",
          description: "The server returned an empty response. Please try again.",
          variant: "destructive",
        });
        return;
      }
      setSessionId(data.sessionId);
      setAttachments([]);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          sources: data.sources,
        },
      ]);
    },
    onError: (error) => {
      console.error("[TestChat] Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !selectedProject) return;
    
    const userMessage = inputValue;
    setInputValue("");
    
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    chatMutation.mutate(userMessage);
  }, [inputValue, selectedProject, chatMutation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Test Chatbot</h1>
        <p className="text-muted-foreground">
          Test your knowledge base by chatting with the AI assistant.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64" data-testid="select-test-project">
            <SelectValue placeholder="Select a project to test" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProject && (
          <Badge variant="secondary">Ready to test</Badge>
        )}
      </div>

      {!selectedProject ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Project</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Choose a project above to start testing your chatbot with your knowledge base.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4 mx-auto" />
                  <p className="text-muted-foreground">Start a conversation with your knowledge base</p>
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-md lg:max-w-2xl rounded-lg p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && msg.role === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-muted-foreground/20 space-y-2">
                      <p className="text-xs font-semibold opacity-70">Sources:</p>
                      {msg.sources.map((source: any, sidx: number) => (
                        <div key={sidx} className="text-xs opacity-80 space-y-1">
                          <div className="flex items-center gap-1">
                            <File className="h-3 w-3" />
                            <span className="font-medium">{source.documentName}</span>
                          </div>
                          <p className="italic">{source.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          <div className="border-t p-4 space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                    <File className="h-3 w-3" />
                    <span>{att.name}</span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-attachment-${idx}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Type your question..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={chatMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={chatMutation.isPending}
                data-testid="button-attach-file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || chatMutation.isPending}
                size="icon"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.gif,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />
            </div>
            {!selectedProject && (
              <p className="text-xs text-muted-foreground">
                Select a project to start chatting
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
