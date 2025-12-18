import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Copy,
  CheckCircle,
  Search,
  FileText,
  List,
  Code,
  Lock
} from "lucide-react";
import type { Project } from "@shared/schema";

interface MCPEndpoint {
  name: string;
  method: string;
  path: string;
  description: string;
  icon: React.ElementType;
  request: string;
  response: string;
}

export default function MCPServer() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const selectedProjectData = projects?.find((p) => p.id === selectedProject);
  const baseUrl = window.location.origin;

  const endpoints: MCPEndpoint[] = [
    {
      name: "Search Knowledge",
      method: "POST",
      path: `/api/mcp/${selectedProject}/search`,
      description: "Search through your knowledge base using natural language queries.",
      icon: Search,
      request: JSON.stringify({
        query: "What is the refund policy?",
        limit: 5
      }, null, 2),
      response: JSON.stringify({
        results: [
          {
            documentId: "doc_123",
            documentName: "refund-policy.pdf",
            content: "Customers can request a full refund within 30 days...",
            score: 0.95
          }
        ]
      }, null, 2),
    },
    {
      name: "Get Context",
      method: "GET",
      path: `/api/mcp/${selectedProject}/context/:docId`,
      description: "Retrieve the full context of a specific document or chunk.",
      icon: FileText,
      request: "GET /api/mcp/{projectId}/context/doc_123",
      response: JSON.stringify({
        documentId: "doc_123",
        name: "refund-policy.pdf",
        content: "Full document content here...",
        metadata: {
          type: "pdf",
          createdAt: "2024-01-15T10:30:00Z"
        }
      }, null, 2),
    },
    {
      name: "List Sources",
      method: "GET",
      path: `/api/mcp/${selectedProject}/sources`,
      description: "List all available knowledge sources in the project.",
      icon: List,
      request: "GET /api/mcp/{projectId}/sources",
      response: JSON.stringify({
        sources: [
          {
            id: "doc_123",
            name: "refund-policy.pdf",
            type: "pdf",
            status: "ready",
            chunks: 12
          },
          {
            id: "doc_456",
            name: "faq.md",
            type: "markdown",
            status: "ready",
            chunks: 8
          }
        ],
        total: 2
      }, null, 2),
    },
  ];

  const handleCopy = async (text: string, endpoint: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEndpoint(endpoint);
      toast({
        title: "Copied to clipboard",
        description: "The endpoint URL has been copied.",
      });
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select and copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MCP Server</h1>
          <p className="text-muted-foreground">
            Model Context Protocol endpoints for your AI integrations.
          </p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48" data-testid="select-project-mcp">
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
            <Server className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Project</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Choose a project to view its MCP server endpoints and documentation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    Server Status
                  </CardTitle>
                  <CardDescription>
                    Your MCP server is ready to accept requests.
                  </CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Base URL</span>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {baseUrl}/api/mcp/{selectedProject}
                  </code>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    API Key
                  </span>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                    {selectedProjectData?.mcpApiKey}
                  </code>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Authentication</span>
                  <span className="text-sm">Bearer Token (API Key)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Endpoints</CardTitle>
              <CardDescription>
                Available endpoints for accessing your knowledge base programmatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endpoints.map((endpoint) => (
                  <Card key={endpoint.name} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <endpoint.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{endpoint.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {endpoint.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {endpoint.method}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 mb-4">
                        <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded overflow-x-auto">
                          {baseUrl}{endpoint.path}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(`${baseUrl}${endpoint.path}`, endpoint.name)}
                          data-testid={`button-copy-${endpoint.name.toLowerCase().replace(" ", "-")}`}
                        >
                          {copiedEndpoint === endpoint.name ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <Tabs defaultValue="request" className="w-full">
                        <TabsList className="h-8">
                          <TabsTrigger value="request" className="text-xs">Request</TabsTrigger>
                          <TabsTrigger value="response" className="text-xs">Response</TabsTrigger>
                        </TabsList>
                        <TabsContent value="request" className="mt-2">
                          <pre className="p-3 rounded-lg bg-muted font-mono text-xs overflow-x-auto">
                            <code>{endpoint.request}</code>
                          </pre>
                        </TabsContent>
                        <TabsContent value="response" className="mt-2">
                          <pre className="p-3 rounded-lg bg-muted font-mono text-xs overflow-x-auto">
                            <code>{endpoint.response}</code>
                          </pre>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-4 py-4">
              <Code className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Authentication Required</h4>
                <p className="text-sm text-muted-foreground">
                  All API requests must include the API key in the Authorization header:
                </p>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded mt-2 inline-block">
                  Authorization: Bearer {selectedProjectData?.mcpApiKey}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
