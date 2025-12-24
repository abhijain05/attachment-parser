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
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showTarangAiKey, setShowTarangAiKey] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [tarangAiApiKey, setTarangAiApiKey] = useState("");
  const [tarangAiUrl, setTarangAiUrl] = useState("");
  const [tarangAiModel, setTarangAiModel] = useState("");

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
        openaiModel: openaiModel || undefined,
        geminiApiKey: geminiKey || undefined,
        geminiModel: geminiModel || undefined,
        tarangAiApiKey: tarangAiApiKey || undefined,
        tarangAiUrl: tarangAiUrl || undefined,
        tarangAiModel: tarangAiModel || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-config", selectedProject] });
      toast({
        title: "Settings saved",
        description: "Your API keys and models have been saved securely.",
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
    setOpenaiModel("gpt-4o");
    setGeminiKey("");
    setGeminiModel("gemini-2.0-flash");
    setTarangAiApiKey("");
    setTarangAiUrl("");
    setTarangAiModel("");
  };

  // Update settings when config loads
  if (config && !openaiKey && !geminiKey && !tarangAiApiKey) {
    if (config.openaiApiKey) setOpenaiKey(config.openaiApiKey);
    if (config.openaiModel) setOpenaiModel(config.openaiModel);
    if (config.geminiApiKey) setGeminiKey(config.geminiApiKey);
    if (config.geminiModel) setGeminiModel(config.geminiModel);
    if (config.tarangAiApiKey) setTarangAiApiKey(config.tarangAiApiKey);
    if (config.tarangAiUrl) setTarangAiUrl(config.tarangAiUrl);
    if (config.tarangAiModel) setTarangAiModel(config.tarangAiModel);
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
        <Tabs defaultValue="models" className="space-y-4">
          <TabsList>
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Configure AI Models</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Set up API keys and select specific models for each AI provider. Configure all models or choose your primary provider.
              </p>
            </div>

            {/* OpenAI Configuration Card */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                      <span className="text-white dark:text-black font-bold text-sm">OAI</span>
                    </div>
                    <div>
                      <CardTitle>OpenAI</CardTitle>
                      <CardDescription>GPT-4, GPT-4 Turbo, and more</CardDescription>
                    </div>
                  </div>
                  {openaiKey && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-300" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">Configured</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="openai-model">Model</Label>
                  <Select value={openaiModel} onValueChange={setOpenaiModel} disabled={!openaiKey}>
                    <SelectTrigger id="openai-model" data-testid="select-openai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENAI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select which OpenAI model to use for your chatbot
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Google Gemini Configuration Card */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">G</span>
                    </div>
                    <div>
                      <CardTitle>Google Gemini</CardTitle>
                      <CardDescription>Gemini 2.0, 1.5 Pro, and more</CardDescription>
                    </div>
                  </div>
                  {geminiKey && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-300" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">Configured</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">API Key</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="gemini-model">Model</Label>
                  <Select value={geminiModel} onValueChange={setGeminiModel} disabled={!geminiKey}>
                    <SelectTrigger id="gemini-model" data-testid="select-gemini-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GEMINI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select which Gemini model to use for your chatbot
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tarang AI Configuration Card */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Tarang AI</CardTitle>
                      <CardDescription>Self-hosted local models</CardDescription>
                    </div>
                  </div>
                  {tarangAiApiKey && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-300" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">Configured</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tarang-ai-url">Endpoint URL</Label>
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
                  <Label htmlFor="tarang-ai-key">API Key</Label>
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
                  <Label htmlFor="tarang-ai-model">Model</Label>
                  <Select value={tarangAiModel} onValueChange={setTarangAiModel} disabled={!tarangAiApiKey}>
                    <SelectTrigger id="tarang-ai-model" data-testid="select-tarang-ai-model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARANG_AI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the model to use for embeddings and responses
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 sticky bottom-0 bg-background/95 backdrop-blur p-4 -mx-6 px-6">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!openaiKey && !geminiKey && !tarangAiApiKey || saveMutation.isPending}
                data-testid="button-save-keys"
                size="lg"
              >
                {saveMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
              <Button variant="outline" onClick={() => {
                setOpenaiKey("");
                setOpenaiModel("gpt-4o");
                setGeminiKey("");
                setGeminiModel("gemini-2.0-flash");
                setTarangAiApiKey("");
                setTarangAiUrl("");
                setTarangAiModel("");
              }} data-testid="button-clear-keys" size="lg">
                Clear All
              </Button>
            </div>

            {/* Status Messages */}
            {(openaiKey || geminiKey || tarangAiApiKey) && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm text-green-700 dark:text-green-200">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Configuration will be saved securely in your project settings.</span>
              </div>
            )}

            {!openaiKey && !geminiKey && !tarangAiApiKey && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-sm text-yellow-700 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Please provide at least one AI provider configuration for the chatbot to work.</span>
              </div>
            )}
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
