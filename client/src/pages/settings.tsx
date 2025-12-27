import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, AlertCircle, CheckCircle, Zap } from "lucide-react";
import type { Project, ChatbotConfig } from "@shared/schema";

// OpenAI models
const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Latest)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

// Google Gemini models
const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Latest)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.0-pro", label: "Gemini 1.0 Pro" },
];

// Tarang AI models
const TARANG_AI_MODELS = [
  { value: "short", label: "Short (tinyllama:latest) - Fast" },
  { value: "medium", label: "Medium (llama3.2:3b) - Better Quality" },
];

export default function Settings() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: config, isLoading } = useQuery<ChatbotConfig | null>({
    queryKey: ["/api/chatbot-config", selectedProject],
    queryFn: async () => {
      if (!selectedProject) return null;
      const response = await fetch(`/api/chatbot-config/${selectedProject}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch config");
      return response.json();
    },
    enabled: !!selectedProject,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/chatbot-config/${selectedProject}`, {
        // AI settings removed as they are now managed by admin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-config", selectedProject] });
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground">
          Configure API keys and manage your chatbot settings.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedProject} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-64" data-testid="select-settings-project">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProject ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Select a project to view and configure settings</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="models" className="space-y-4">
          <TabsList>
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">1. Knowledge Base Setup</h4>
                  <p className="text-muted-foreground">Upload your documents to the Knowledge Library. They'll be automatically indexed and chunked for retrieval.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">2. Configure AI Models</h4>
                  <p className="text-muted-foreground">Set up API keys for your preferred providers (OpenAI, Google Gemini, or Tarang AI) and select specific model versions. You can configure multiple providers and use different models for different purposes.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">3. Context Retrieval via MCP</h4>
                  <p className="text-muted-foreground">When a user sends a question, the MCP Server searches your knowledge base and retrieves relevant document chunks using the configured embedding model.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">4. AI Response</h4>
                  <p className="text-muted-foreground">Your API key is used to send the question + context to your selected AI model (GPT-4o, Gemini, or Tarang AI), which generates an informed response based on your documents.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">5. Test & Deploy</h4>
                  <p className="text-muted-foreground">Test the chatbot in the Test Chatbot page, then embed it on your website using the Embed Script.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MCP Server Endpoints</CardTitle>
                <CardDescription>The chatbot uses these endpoints to access your knowledge base</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm font-mono text-xs">
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">Search knowledge base:</p>
                  <p>POST /api/mcp/{selectedProject}/search</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">Get context:</p>
                  <p>GET /api/mcp/{selectedProject}/context/{"{docId}"}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
