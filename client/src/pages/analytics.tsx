import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  MessageSquare,
  FileText,
  Zap,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import type { Project } from "@shared/schema";

interface AnalyticsData {
  totalQueries: number;
  tokensUsed: number;
  averageResponseTime: number;
  answeredRate: number;
  topSources: { documentName: string; hitCount: number }[];
  recentQueries: { query: string; answered: boolean; timestamp: string }[];
  dailyStats: { date: string; queries: number; tokens: number }[];
}

export default function Analytics() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("7d");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", selectedProject, timeRange],
    enabled: !!selectedProject,
  });

  const statCards = [
    {
      title: "Total Queries",
      value: analytics?.totalQueries || 0,
      icon: MessageSquare,
      description: "Questions asked",
      trend: "+12%",
    },
    {
      title: "Tokens Used",
      value: analytics?.tokensUsed?.toLocaleString() || 0,
      icon: Zap,
      description: "API tokens consumed",
      trend: "+8%",
    },
    {
      title: "Avg. Response",
      value: analytics?.averageResponseTime ? `${analytics.averageResponseTime}ms` : "—",
      icon: Clock,
      description: "Response time",
      trend: "-5%",
    },
    {
      title: "Answer Rate",
      value: analytics?.answeredRate ? `${analytics.answeredRate}%` : "—",
      icon: CheckCircle,
      description: "Successfully answered",
      trend: "+2%",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track usage, performance, and insights for your knowledge bases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48" data-testid="select-project-analytics">
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
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedProject ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Project</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Choose a project to view its analytics and usage statistics.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
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
                  <div className="text-3xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(" ", "-")}`}>
                    {stat.value}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Knowledge Sources</CardTitle>
                <CardDescription>Most frequently accessed documents</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.topSources?.length ? (
                  <div className="space-y-4">
                    {analytics.topSources.map((source, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{source.documentName}</p>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, (source.hitCount / (analytics.topSources[0]?.hitCount || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {source.hitCount} hits
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No source data available yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Queries</CardTitle>
                <CardDescription>Latest questions from users</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.recentQueries?.length ? (
                  <div className="space-y-3">
                    {analytics.recentQueries.slice(0, 5).map((query, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        {query.answered ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{query.query}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(query.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={query.answered ? "secondary" : "outline"} className="flex-shrink-0">
                          {query.answered ? "Answered" : "Unanswered"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No queries recorded yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage Trends</CardTitle>
              <CardDescription>Query and token usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.dailyStats?.length ? (
                <div className="h-64 flex items-end gap-1">
                  {analytics.dailyStats.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/80 rounded-t"
                        style={{
                          height: `${Math.max(4, (day.queries / Math.max(...analytics.dailyStats.map((d) => d.queries), 1)) * 200)}px`,
                        }}
                        title={`${day.queries} queries`}
                      />
                      <span className="text-xs text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                        {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Not enough data to display trends.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start using your chatbot to see analytics here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
