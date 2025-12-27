import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { User, UserModelAssignment } from "@shared/schema";

interface AdminSettings {
  embeddingProvider: string;
  embeddingModel: string;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Protect admin page - redirect non-admin users
  if (authLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    navigate("/dashboard");
    return null;
  }
  const [embeddingProvider, setEmbeddingProvider] = useState("sentence-transformers");
  const [embeddingModel, setEmbeddingModel] = useState("all-MiniLM-L6-v2");

  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", "/api/admin/settings", {
        embeddingProvider,
        embeddingModel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings saved",
        description: "Embedding provider settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  // Load settings when data arrives
  if (settings && !embeddingProvider) {
    setEmbeddingProvider(settings.embeddingProvider || "sentence-transformers");
    setEmbeddingModel(settings.embeddingModel || "all-MiniLM-L6-v2");
  }

  const sentenceTransformerModels = [
    { value: "all-MiniLM-L6-v2", label: "All-MiniLM-L6-v2 (Fastest)" },
    { value: "all-mpnet-base-v2", label: "All-MPNET-Base-V2 (Best Quality)" },
    { value: "all-distilroberta-v1", label: "All-DistilRoBERTa-V1" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings for all projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Embedding Provider</CardTitle>
          <CardDescription>
            Choose how text embeddings are generated across all projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="embedding-provider">Provider</Label>
            <Select value={embeddingProvider} onValueChange={setEmbeddingProvider}>
              <SelectTrigger id="embedding-provider" data-testid="select-embedding-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sentence-transformers">
                  Sentence Transformers (Local, Free, Fast)
                </SelectItem>
                <SelectItem value="openai">OpenAI (API-based, Best Quality)</SelectItem>
                <SelectItem value="gemini">Google Gemini (API-based)</SelectItem>
                <SelectItem value="tarang_ai">Tarang AI (Self-hosted)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing this will affect all new document uploads and searches
            </p>
          </div>

          {embeddingProvider === "sentence-transformers" && (
            <div className="space-y-2">
              <Label htmlFor="embedding-model">Model</Label>
              <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                <SelectTrigger id="embedding-model" data-testid="select-embedding-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sentenceTransformerModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Larger models have better quality but are slower
              </p>
            </div>
          )}

          <div className="border-t pt-4 flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-admin-settings"
            >
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {embeddingProvider === "sentence-transformers"
                ? "Local embeddings reduce API costs but may have slightly lower quality"
                : "API-based embeddings provide better quality but use external services"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Model Assignment</CardTitle>
          <CardDescription>
            Assign AI models to individual users. New users default to Tarang AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserModelManagement />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Sentence Transformers (Recommended)</h4>
            <p className="text-muted-foreground">
              ✓ Free • ✓ No API calls • ✓ Privacy-focused • ✓ Fast • ~ 75% quality
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">OpenAI</h4>
            <p className="text-muted-foreground">
              ✓ Excellent quality (95%) • ✗ Costs money • ✗ Requires API key • ✗ Slower
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Google Gemini</h4>
            <p className="text-muted-foreground">
              ✓ Good quality (85%) • ✓ Free tier available • ✗ Requires API key
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Tarang AI</h4>
            <p className="text-muted-foreground">
              ✓ Free • ✓ Self-hosted • ~ 60% quality • ✗ Requires self-hosted setup
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserModelManagement() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [aiProvider, setAiProvider] = useState("tarang_ai");
  const [tarangAiUrl, setTarangAiUrl] = useState("");
  const [tarangAiApiKey, setTarangAiApiKey] = useState("");
  const [tarangAiModel, setTarangAiModel] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [testResults, setTestResults] = useState<{ [key: string]: { valid: boolean; message: string; quotaInfo: string } }>({});

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: assignment, isLoading: assignmentLoading } = useQuery<UserModelAssignment | null>({
    queryKey: ["/api/admin/user-models", selectedUser],
    enabled: !!selectedUser,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/admin/user-models/${selectedUser}`, {
        aiProvider,
        tarangAiUrl,
        tarangAiApiKey,
        tarangAiModel,
        openaiApiKey: openaiKey || undefined,
        openaiModel,
        geminiApiKey: geminiKey || undefined,
        geminiModel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-models", selectedUser] });
      toast({
        title: "Model assigned",
        description: "User model assignment updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign model.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (params: { provider: string; apiKey: string; model?: string; url?: string }) => {
      return await apiRequest("POST", "/api/admin/test-api-key", params);
    },
    onSuccess: (data, params) => {
      const resultKey = `${params.provider}-${params.apiKey.slice(0, 5)}`;
      setTestResults((prev) => ({
        ...prev,
        [resultKey]: data,
      }));
      
      if (data.valid) {
        toast({
          title: "API Key Valid",
          description: data.message,
        });
      } else {
        toast({
          title: "API Key Invalid",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to test API key.",
        variant: "destructive",
      });
    },
  });

  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    setAiProvider("tarang_ai");
    setTarangAiUrl("");
    setTarangAiApiKey("");
    setTarangAiModel("");
    setOpenaiKey("");
    setOpenaiModel("gpt-4o");
    setGeminiKey("");
    setGeminiModel("gemini-2.0-flash");
  };

  if (assignment && !tarangAiUrl && !openaiKey && !geminiKey) {
    if (assignment.tarangAiUrl) setTarangAiUrl(assignment.tarangAiUrl);
    if (assignment.tarangAiApiKey) setTarangAiApiKey(assignment.tarangAiApiKey);
    if (assignment.tarangAiModel) setTarangAiModel(assignment.tarangAiModel);
    if (assignment.openaiApiKey) setOpenaiKey(assignment.openaiApiKey);
    if (assignment.openaiModel) setOpenaiModel(assignment.openaiModel);
    if (assignment.geminiApiKey) setGeminiKey(assignment.geminiApiKey);
    if (assignment.geminiModel) setGeminiModel(assignment.geminiModel);
    if (assignment.aiProvider) setAiProvider(assignment.aiProvider);
  }

  if (usersLoading) {
    return <Skeleton className="h-32" />;
  }

  return (
    <div className="space-y-6">
      <Select value={selectedUser} onValueChange={handleUserChange}>
        <SelectTrigger data-testid="select-admin-user">
          <SelectValue placeholder="Select a user to assign model" />
        </SelectTrigger>
        <SelectContent>
          {users?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedUser && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-ai-provider">AI Provider</Label>
            <Select value={aiProvider} onValueChange={setAiProvider}>
              <SelectTrigger id="user-ai-provider" data-testid="select-user-ai-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tarang_ai">Tarang AI (Default)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {aiProvider === "tarang_ai" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tarang-url">Tarang AI URL</Label>
                <Input
                  id="tarang-url"
                  value={tarangAiUrl}
                  onChange={(e) => setTarangAiUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  data-testid="input-tarang-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarang-key">Tarang AI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="tarang-key"
                    type="password"
                    value={tarangAiApiKey}
                    onChange={(e) => setTarangAiApiKey(e.target.value)}
                    placeholder="API key (if required)"
                    data-testid="input-tarang-key"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate({ provider: "tarang_ai", apiKey: tarangAiApiKey, url: tarangAiUrl })}
                    disabled={!tarangAiApiKey || !tarangAiUrl || testMutation.isPending}
                    data-testid="button-test-tarang-key"
                  >
                    {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tarang-model">Tarang AI Model</Label>
                <Input
                  id="tarang-model"
                  value={tarangAiModel}
                  onChange={(e) => setTarangAiModel(e.target.value)}
                  placeholder="e.g., llama3.2:3b"
                  data-testid="input-tarang-model"
                />
              </div>
            </>
          )}

          {aiProvider === "openai" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    data-testid="input-openai-key"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate({ provider: "openai", apiKey: openaiKey })}
                    disabled={!openaiKey || testMutation.isPending}
                    data-testid="button-test-openai-key"
                  >
                    {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-model">OpenAI Model</Label>
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger id="openai-model" data-testid="select-openai-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {aiProvider === "gemini" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="gemini-key">Google Gemini API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="gemini-key"
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="API key"
                    data-testid="input-gemini-key"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate({ provider: "gemini", apiKey: geminiKey, model: geminiModel })}
                    disabled={!geminiKey || testMutation.isPending}
                    data-testid="button-test-gemini-key"
                  >
                    {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gemini-model">Gemini Model</Label>
                <Select value={geminiModel} onValueChange={setGeminiModel}>
                  <SelectTrigger id="gemini-model" data-testid="select-gemini-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            onClick={() => assignMutation.mutate()}
            disabled={assignmentLoading || assignMutation.isPending}
            data-testid="button-assign-user-model"
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Model"}
          </Button>
        </div>
      )}
    </div>
  );
}
