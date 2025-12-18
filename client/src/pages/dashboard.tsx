import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  FolderOpen, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Plus,
  ArrowRight,
  Clock
} from "lucide-react";
import type { Project } from "@shared/schema";

interface DashboardStats {
  totalProjects: number;
  totalDocuments: number;
  totalQueries: number;
  tokensUsed: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const recentProjects = projects?.slice(0, 4) || [];

  const statCards = [
    {
      title: "Total Projects",
      value: stats?.totalProjects || 0,
      icon: FolderOpen,
      description: "Active knowledge bases",
    },
    {
      title: "Documents",
      value: stats?.totalDocuments || 0,
      icon: FileText,
      description: "Uploaded knowledge sources",
    },
    {
      title: "Total Queries",
      value: stats?.totalQueries || 0,
      icon: MessageSquare,
      description: "AI conversations",
    },
    {
      title: "Tokens Used",
      value: stats?.tokensUsed?.toLocaleString() || 0,
      icon: BarChart3,
      description: "This month",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your knowledge platform.
          </p>
        </div>
        <Button asChild data-testid="button-new-project">
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-3xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(" ", "-")}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Recent Projects</CardTitle>
              <CardDescription>Your most recently updated knowledge bases</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-sm font-medium mb-1">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first knowledge base to get started.
                </p>
                <Button size="sm" asChild>
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link 
                    key={project.id} 
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover-elevate active-elevate-2 transition-colors cursor-pointer"
                    data-testid={`project-card-${project.id}`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{project.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks to manage your knowledge bases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 px-4" 
                asChild
                data-testid="button-upload-documents"
              >
                <Link href="/knowledge">
                  <FileText className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Upload Documents</div>
                    <div className="text-xs text-muted-foreground">Add knowledge sources</div>
                  </div>
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 px-4" 
                asChild
                data-testid="button-customize-chatbot"
              >
                <Link href="/chatbot">
                  <MessageSquare className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Customize Chatbot</div>
                    <div className="text-xs text-muted-foreground">Brand your AI assistant</div>
                  </div>
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 px-4" 
                asChild
                data-testid="button-get-embed"
              >
                <Link href="/embed">
                  <Plus className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Get Embed Script</div>
                    <div className="text-xs text-muted-foreground">Add to your website</div>
                  </div>
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 px-4" 
                asChild
                data-testid="button-view-analytics"
              >
                <Link href="/analytics">
                  <BarChart3 className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">View Analytics</div>
                    <div className="text-xs text-muted-foreground">Track usage & insights</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
