import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Code,
  Copy,
  CheckCircle,
  ExternalLink,
  FileCode,
  Info
} from "lucide-react";
import type { Project } from "@shared/schema";

export default function EmbedScript() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const selectedProjectData = projects?.find((p) => p.id === selectedProject);

  const getEmbedScript = () => {
    if (!selectedProject) return "";
    const baseUrl = window.location.origin;
    return `<!-- Knowledge AI Chatbot Widget -->
<script>
  (function() {
    // Create or retrieve visitor session ID
    var sessionId = localStorage.getItem('kabot-session') || 'visitor-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('kabot-session', sessionId);
    
    // Track visitor session (no API key needed - JWT handled by widget)
    fetch('${baseUrl}/api/visitor/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: '${selectedProject}',
        sessionId: sessionId,
        pageUrl: window.location.href,
        referrer: document.referrer
      })
    }).catch(e => console.debug('Visitor tracking:', e));
    
    // Load widget script
    var script = document.createElement('script');
    script.src = '${baseUrl}/widget.js?projectId=${selectedProject}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  };

  const handleCopy = async () => {
    const script = getEmbedScript();
    if (!script) return;

    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The embed script has been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select and copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Embed Script</h1>
          <p className="text-muted-foreground">
            Add your AI chatbot to any website with a single script tag.
          </p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48" data-testid="select-project-embed">
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
      </div>

      {!selectedProject ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Code className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Project</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Choose a project to generate its embed script.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-primary" />
                  Embed Code
                </CardTitle>
                <CardDescription>
                  Copy and paste this script into your website's HTML, just before the closing &lt;/body&gt; tag.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                data-testid="button-copy-script"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Script
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
                  <code className="text-foreground" data-testid="code-embed-script">
                    {getEmbedScript()}
                  </code>
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Installation Steps</CardTitle>
              <CardDescription>
                Follow these steps to add the chatbot to your website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                    1
                  </Badge>
                  <div>
                    <h4 className="font-medium">Copy the embed script</h4>
                    <p className="text-sm text-muted-foreground">
                      Click the "Copy Script" button above to copy the code.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                    2
                  </Badge>
                  <div>
                    <h4 className="font-medium">Paste into your HTML</h4>
                    <p className="text-sm text-muted-foreground">
                      Add the script just before the closing &lt;/body&gt; tag in your website's HTML.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                    3
                  </Badge>
                  <div>
                    <h4 className="font-medium">Deploy your changes</h4>
                    <p className="text-sm text-muted-foreground">
                      Save and publish your website. The chatbot widget will appear automatically.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Project Name</span>
                  <span className="text-sm font-medium">{selectedProjectData?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Project ID</span>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {selectedProject}
                  </code>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">API Key</span>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                    {selectedProjectData?.mcpApiKey}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-4 py-4">
              <ExternalLink className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Need help with integration?</h4>
                <p className="text-sm text-muted-foreground">
                  For platforms like WordPress, Shopify, or React apps, check our integration guides
                  for specific instructions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
