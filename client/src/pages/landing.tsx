import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  FileText, 
  MessageSquare, 
  Shield, 
  Zap, 
  Server,
  Code,
  BarChart3,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Knowledge Ingestion",
    description: "Upload PDFs, documents, text files, and URLs. Your business knowledge is automatically processed and structured.",
  },
  {
    icon: Shield,
    title: "Strict Grounding",
    description: "AI answers only from your approved sources. No hallucinations, no made-up information.",
  },
  {
    icon: Server,
    title: "MCP Server",
    description: "Each project gets its own Model Context Protocol server for controlled AI context delivery.",
  },
  {
    icon: MessageSquare,
    title: "Custom Chatbot",
    description: "Build a fully customizable chatbot widget. Match your brand colors, tone, and messaging.",
  },
  {
    icon: Code,
    title: "Easy Embed",
    description: "Single script tag embedding. Works on any website with zero configuration needed.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track queries, token usage, and discover knowledge gaps in your documentation.",
  },
];

const benefits = [
  "Tenant-isolated knowledge bases",
  "RAG-based accurate responses",
  "Real-time source attribution",
  "White-label chatbot customization",
  "API access for integrations",
  "Enterprise-grade security",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Server className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Knowledge AI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container px-4 mx-auto max-w-7xl">
            <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Enterprise-ready AI knowledge platform</span>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Turn your business knowledge into an{" "}
                <span className="text-primary">AI assistant</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl">
                Upload your documents, create governed AI that answers only from approved sources, 
                and embed a customizable chatbot on any website. All with full control and transparency.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/api/login">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" data-testid="button-learn-more">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container px-4 mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Everything you need to build AI-powered knowledge bases
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A complete platform for ingesting, managing, and deploying business knowledge 
                through AI assistants that never hallucinate.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border/50">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-4 mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                  Built for enterprise scale and security
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Every project gets its own isolated knowledge base, MCP server, and analytics. 
                  Your data stays private and your AI stays grounded in facts.
                </p>
                <ul className="space-y-3">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <Card className="border-border/50 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">AI Assistant</p>
                        <p className="text-xs text-muted-foreground">Powered by your knowledge</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        What are our refund policies?
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg text-sm">
                        Based on your documentation: Customers can request a full refund within 
                        30 days of purchase. After 30 days, pro-rated refunds are available...
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Source: refund-policy.pdf
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container px-4 mx-auto max-w-7xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Ready to transform your business knowledge?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              Start building your AI knowledge base today. Free to get started, 
              enterprise-ready when you scale.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              asChild
              data-testid="button-cta-signup"
            >
              <a href="/api/login">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Server className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Knowledge AI Platform</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Enterprise AI knowledge management
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
