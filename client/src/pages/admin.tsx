import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle } from "lucide-react";

interface AdminSettings {
  embeddingProvider: string;
  embeddingModel: string;
}

export default function AdminPanel() {
  const { toast } = useToast();
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
