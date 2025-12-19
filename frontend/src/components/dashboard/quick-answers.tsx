'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Loader2, 
  BarChart3, 
  AlertTriangle, 
  Building2, 
  Bug,
  TrendingUp,
  Clock
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Question {
  id: string;
  question: string;
  category: string;
}

interface Answer {
  question: string;
  answer: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  overview: <BarChart3 className="h-4 w-4" />,
  status: <Clock className="h-4 w-4" />,
  companies: <Building2 className="h-4 w-4" />,
  priority: <AlertTriangle className="h-4 w-4" />,
  rft: <Bug className="h-4 w-4" />,
  performance: <TrendingUp className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  overview: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  status: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  companies: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  priority: 'bg-red-500/10 text-red-700 border-red-500/20',
  rft: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  performance: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
};

async function fetchQuestions(): Promise<Question[]> {
  const res = await fetch(`${API_BASE_URL}/api/quick-answers/questions`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function fetchAnswer(questionId: string): Promise<Answer | null> {
  const res = await fetch(`${API_BASE_URL}/api/quick-answers/answer?questionId=${questionId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

export function QuickAnswers() {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<Answer | null>(null);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ['quickQuestions'],
    queryFn: fetchQuestions,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const handleQuestionClick = async (questionId: string) => {
    setSelectedQuestion(questionId);
    setIsLoadingAnswer(true);
    setCurrentAnswer(null);

    try {
      const answer = await fetchAnswer(questionId);
      setCurrentAnswer(answer);
    } catch (error) {
      console.error('Failed to fetch answer:', error);
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  // Parse markdown-style bold text
  const formatAnswer = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-primary">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5 text-primary" />
          Quick Answers
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Get instant insights from your support data
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Questions Grid */}
        <div className="grid gap-2">
          {questions.map((q) => (
            <Button
              key={q.id}
              variant={selectedQuestion === q.id ? "default" : "outline"}
              className="justify-start h-auto py-3 px-4 text-left"
              onClick={() => handleQuestionClick(q.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-1.5 rounded ${CATEGORY_COLORS[q.category] || 'bg-muted'}`}>
                  {CATEGORY_ICONS[q.category] || <MessageCircle className="h-4 w-4" />}
                </div>
                <span className="text-sm flex-1">{q.question}</span>
              </div>
            </Button>
          ))}
        </div>

        {/* Answer Section */}
        {(isLoadingAnswer || currentAnswer) && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
            {isLoadingAnswer ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Analyzing data...</span>
              </div>
            ) : currentAnswer ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">
                  {currentAnswer.question}
                </div>
                <div className="text-base">
                  {formatAnswer(currentAnswer.answer)}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="text-xs">
                    Updated: {new Date(currentAnswer.timestamp).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Badge>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Empty State */}
        {!selectedQuestion && !isLoadingAnswer && (
          <div className="text-center py-6 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click a question above to get instant answers</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
