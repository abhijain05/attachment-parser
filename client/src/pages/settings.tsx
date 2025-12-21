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
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import type { Project, ChatbotConfig } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showTarangAiKey, setShowTarangAiKey] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [tarangAiApiKey, setTarangAiApiKey] = useState("");
  const [tarangAiUrl, setTarangAiUrl] = useState("");
  const [tarangAiModel, setTarangAiModel] = useState("");
  const [aiProvider, setAiProvider] = useState<"openai" | "gemini" | "tarang_ai">("openai");

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
        openaiApiKey: openaiKey || undefined,
        geminiApiKey: geminiKey || undefined,
        tarangAiApiKey: tarangAiApiKey || undefined,
        tarangAiUrl: tarangAiUrl || undefined,
        tarangAiModel: tarangAiModel || undefined,
        aiProvider,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-config", selectedProject] });
      toast({
        title: "Settings saved",
        description: "Your API keys and provider have been saved securely.",
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
    setOpenaiKey("");
    setGeminiKey("");
    setTarangAiApiKey("");
    setTarangAiUrl("");
    setTarangAiModel("");
    setAiProvider("openai");
  };

  // Update provider when config loads
  if (config && aiProvider === "openai") {
    const provider = config.aiProvider as "openai" | "gemini" | "tarang_ai";
    if (provider && provider !== aiProvider) {
      setAiProvider(provider);
      if (provider === "tarang_ai") {
        setTarangAiUrl(config.tarangAiUrl || "");
        setTarangAiModel(config.tarangAiModel || "");
      }
    }
  }

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
        <Tabs defaultValue="api-keys" className="space-y-4">
          <TabsList>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Provider</CardTitle>
                <CardDescription>
                  Choose which AI provider to use for generating responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={aiProvider} onValueChange={(value) => setAiProvider(value as "openai" | "gemini" | "tarang_ai")}>
                  <SelectTrigger className="w-64" data-testid="select-ai-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-5)</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="tarang_ai">Tarang AI (Self-Hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Provide your own API keys so the chatbot can respond to queries. The AI will use MCP Server to retrieve context from your knowledge base.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OpenAI Key */}
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="openai-key"
                      type={showOpenaiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      data-testid="input-openai-key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      data-testid="button-toggle-openai"
                    >
                      {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/api-keys</a>
                  </p>
                </div>

                {/* Gemini Key */}
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">Google Gemini API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gemini-key"
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="AIza..."
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      data-testid="input-gemini-key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      data-testid="button-toggle-gemini"
                    >
                      {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com/app/apikey</a>
                  </p>
                </div>

                {/* Tarang AI Configuration */}
                <div className="space-y-2">
                  <Label htmlFor="tarang-ai-url">Tarang AI URL</Label>
                  <Input
                    id="tarang-ai-url"
                    type="text"
                    placeholder="http://31.97.210.209:8001"
                    value={tarangAiUrl}
                    onChange={(e) => setTarangAiUrl(e.target.value)}
                    data-testid="input-tarang-ai-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    The endpoint URL for your Tarang AI gateway
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tarang-ai-key">Tarang AI API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tarang-ai-key"
                      type={showTarangAiKey ? "text" : "password"}
                      placeholder="Your Tarang AI API key..."
                      value={tarangAiApiKey}
                      onChange={(e) => setTarangAiApiKey(e.target.value)}
                      data-testid="input-tarang-ai-key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTarangAiKey(!showTarangAiKey)}
                      data-testid="button-toggle-tarang-ai"
                    >
                      {showTarangAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API key for authentication with your Tarang AI gateway
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tarang-ai-model">Tarang AI Model</Label>
                  <Select value={tarangAiModel} onValueChange={setTarangAiModel}>
                    <SelectTrigger id="tarang-ai-model" data-testid="select-tarang-ai-model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (tinyllama:latest) - Fast</SelectItem>
                      <SelectItem value="medium">Medium (llama3.2:3b) - Better Quality</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the model to use for embeddings and responses
                  </p>
                </div>

                <div className="border-t pt-4 flex gap-2">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={!openaiKey && !geminiKey && !tarangAiApiKey || saveMutation.isPending}
                    data-testid="button-save-keys"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setOpenaiKey("");
                    setGeminiKey("");
                    setTarangAiApiKey("");
                    setTarangAiUrl("");
                    setTarangAiModel("");
                  }} data-testid="button-clear-keys">
                    Clear
                  </Button>
                </div>

                {(openaiKey || geminiKey || tarangAiApiKey) && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm text-green-700 dark:text-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <span>Configuration will be saved securely in your project settings.</span>
                  </div>
                )}

                {!openaiKey && !geminiKey && !tarangAiApiKey && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-sm text-yellow-700 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please provide at least one AI provider configuration for the chatbot to work.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
                  <h4 className="font-medium mb-2">2. API Key Configuration</h4>
                  <p className="text-muted-foreground">Provide your own API keys from OpenAI or Gemini above. These keys are stored securely and used only for your chatbot.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">3. Context Retrieval via MCP</h4>
                  <p className="text-muted-foreground">When a user sends a question, the MCP Server searches your knowledge base and retrieves relevant document chunks.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">4. AI Response</h4>
                  <p className="text-muted-foreground">Your API key is used to send the question + context to OpenAI/Gemini, which generates an informed response based on your documents.</p>
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
