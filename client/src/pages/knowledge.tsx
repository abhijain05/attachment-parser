import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Upload,
  Search,
  Trash2,
  Link as LinkIcon,
  File,
  FileType,
  CheckCircle,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import type { Project, Document } from "@shared/schema";

interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
}

export default function Knowledge() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadQueue, setUploadQueue] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("sentence-transformers");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", selectedProject],
    queryFn: async () => {
      const response = await fetch(`/api/documents?projectId=${selectedProject}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    enabled: !!selectedProject,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedProject] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Upload complete",
        description: "Your document has been processed.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const urlMutation = useMutation({
    mutationFn: async (data: { projectId: string; url: string }) => {
      return await apiRequest("POST", "/api/documents/url", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedProject] });
      setIsUrlDialogOpen(false);
      setUrlInput("");
      toast({
        title: "URL added",
        description: "Content is being extracted from the URL.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add URL",
        description: "Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedProject] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete document",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const regenerateEmbeddingsMutation = useMutation({
    mutationFn: async (data: { documentId: string; provider: string }) => {
      return await apiRequest("POST", `/api/documents/${data.documentId}/regenerate-embeddings`, { provider: data.provider });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedProject] });
      setIsRegenerateDialogOpen(false);
      setSelectedDocId("");
      toast({
        title: "Embeddings regeneration started",
        description: "Your document embeddings are being regenerated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to regenerate embeddings",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!selectedProject) {
      toast({
        title: "Select a project first",
        description: "Choose a project before uploading documents.",
        variant: "destructive",
      });
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [selectedProject, toast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject) {
      toast({
        title: "Select a project first",
        description: "Choose a project before uploading documents.",
        variant: "destructive",
      });
      return;
    }
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = "";
  }, [selectedProject, toast]);

  const processFiles = (files: File[]) => {
    const validTypes = [".pdf", ".txt", ".md", ".markdown", ".docx"];
    const validFiles = files.filter((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      return validTypes.includes(ext);
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Some files skipped",
        description: "Only PDF, DOCX, TXT, and Markdown files are supported.",
        variant: "destructive",
      });
    }

    validFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProject);
      
      setUploadQueue((prev) => [...prev, { file, progress: 0, status: "uploading" }]);
      
      uploadMutation.mutate(formData, {
        onSuccess: () => {
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.file === file ? { ...item, status: "complete", progress: 100 } : item
            )
          );
          setTimeout(() => {
            setUploadQueue((prev) => prev.filter((item) => item.file !== file));
          }, 2000);
        },
        onError: () => {
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.file === file ? { ...item, status: "error" } : item
            )
          );
        },
      });
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !selectedProject) return;
    urlMutation.mutate({ projectId: selectedProject, url: urlInput });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <File className="h-5 w-5 text-red-500" />;
      case "docx":
        return <FileText className="h-5 w-5 text-blue-600" />;
      case "txt":
        return <FileText className="h-5 w-5 text-gray-500" />;
      case "md":
      case "markdown":
        return <FileType className="h-5 w-5 text-blue-500" />;
      case "url":
        return <LinkIcon className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredDocuments = documents?.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Library</h1>
          <p className="text-muted-foreground">
            Upload and manage your business knowledge sources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48" data-testid="select-project">
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
            variant="outline"
            onClick={() => setIsUrlDialogOpen(true)}
            disabled={!selectedProject}
            data-testid="button-add-url"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Add URL
          </Button>
        </div>
      </div>

      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        } ${!selectedProject ? "opacity-50" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {isDragging ? "Drop files here" : "Upload Documents"}
          </h3>
          <p className="text-muted-foreground text-center mb-4 max-w-sm">
            Drag and drop PDF, DOCX, TXT, or Markdown files, or click to browse.
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown"
            onChange={handleFileInput}
            disabled={!selectedProject}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={!selectedProject}
            data-testid="button-upload-files"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
          {!selectedProject && (
            <p className="text-sm text-muted-foreground mt-4">
              Please select a project first.
            </p>
          )}
        </CardContent>
      </Card>

      {uploadQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploading Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadQueue.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file.name}</p>
                  {item.status === "uploading" && (
                    <Progress value={50} className="h-1 mt-1" />
                  )}
                </div>
                {item.status === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {item.status === "complete" && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {item.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedProject && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-documents"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? "No matching documents" : "No documents yet"}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  {searchQuery
                    ? "Try a different search term."
                    : "Upload your first document to start building your knowledge base."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="group" data-testid={`card-document-${doc.id}`}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {getFileIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{doc.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="uppercase">{doc.type}</span>
                        {doc.metadata?.size && (
                          <>
                            <span>•</span>
                            <span>{(doc.metadata.size / 1024).toFixed(1)} KB</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                    {regenerateEmbeddingsMutation.isPending && selectedDocId === doc.id ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid={`badge-regenerating-${doc.id}`}>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Regenerating
                      </Badge>
                    ) : (
                      getStatusBadge(doc.status || "processing")
                    )}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Regenerate embeddings"
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setSelectedProvider("sentence-transformers");
                          setIsRegenerateDialogOpen(true);
                        }}
                        disabled={regenerateEmbeddingsMutation.isPending && selectedDocId === doc.id}
                        data-testid={`button-regenerate-embeddings-${doc.id}`}
                      >
                        <FileText className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUrlSubmit}>
            <DialogHeader>
              <DialogTitle>Add URL Content</DialogTitle>
              <DialogDescription>
                Enter a URL to extract and add its content to your knowledge base.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/docs/page"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="mt-2"
                data-testid="input-url"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUrlDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!urlInput.trim() || urlMutation.isPending}
                data-testid="button-submit-url"
              >
                {urlMutation.isPending ? "Adding..." : "Add URL"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegenerateDialogOpen} onOpenChange={setIsRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Embeddings</DialogTitle>
            <DialogDescription>
              Choose an embedding provider to regenerate embeddings for this document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="provider">Embedding Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger id="provider" className="mt-2" data-testid="select-embedding-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sentence-transformers">Sentence Transformers (Local)</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="tarang_ai">Tarang AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRegenerateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => regenerateEmbeddingsMutation.mutate({ documentId: selectedDocId, provider: selectedProvider })}
              disabled={regenerateEmbeddingsMutation.isPending}
              data-testid="button-regenerate-embeddings-submit"
            >
              {regenerateEmbeddingsMutation.isPending ? "Regenerating..." : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
