'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Send, 
  X, 
  Loader2, 
  Bot, 
  User,
  Sparkles,
  AlertCircle,
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';
import Image from 'next/image';
import { useTicketStore } from '@/stores/ticket-store';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiChatProps {
  // Props are now optional as we use global store
  context?: any;
}

// Available free models on Groq
const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Best quality & reasoning' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fastest responses' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Balanced performance' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google compact model' },
];

export function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remainingDaily: number; remainingPerMinute: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get context from global store
  const { filteredStats, dateRange, fetchAllTickets } = useTicketStore();

  // Ensure data is loaded
  useEffect(() => {
    fetchAllTickets();
  }, [fetchAllTickets]);

  const context = filteredStats ? {
    ticketsCreated: filteredStats.ticketsCreated,
    ticketsResolved: filteredStats.ticketsResolved,
    urgentTickets: filteredStats.urgentTickets,
    highTickets: filteredStats.highTickets,
    openTickets: filteredStats.statusBreakdown.open,
    pendingTickets: filteredStats.statusBreakdown.pending,
    resolutionRate: filteredStats.resolutionRate,
    dateRange: dateRange.from && dateRange.to 
      ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
      : undefined,
  } : undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !rateLimitInfo) {
      fetchRateLimitStatus();
    }
  }, [isOpen]);

  const fetchRateLimitStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/status`);
      if (res.ok) {
        const data = await res.json();
        setRateLimitInfo(data.data);
      }
    } catch {
      // Ignore errors
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context,
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || 'Rate limited. Please wait.');
        } else {
          setError(data.error || 'Failed to get response');
        }
        return;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      fetchRateLimitStatus();
    } catch {
      setError('Failed to connect to AI service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "What's the ticket trend this week?",
    "Which priorities need attention?",
    "How can we improve resolution rate?",
    "Summarize the current status",
  ];

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-transform hover:scale-110"
        style={{ backgroundColor: '#419372' }}
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white animate-pulse" />
      </Button>
    );
  }

  return (
    <Card 
      className={cn(
        "fixed z-50 flex flex-col shadow-2xl transition-all duration-300 ease-in-out bg-white border-0",
        // Mobile: smaller floating card, not full screen
        "bottom-4 right-4 w-[calc(100%-2rem)] h-[70vh] max-h-[500px] rounded-xl",
        // Desktop styles
        "md:bottom-6 md:right-6 md:w-[380px] md:h-[500px] md:max-h-none"
      )}
    >
      {/* Simplified Header */}
      <div className="flex items-center justify-between p-3 border-b text-white rounded-t-xl" style={{ backgroundColor: '#419372' }}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold text-sm">Avni Support AI</span>
        </div>
        <div className="flex items-center gap-1">
          {rateLimitInfo && (
            <span className="text-[10px] text-white/80 mr-1">
              {rateLimitInfo.remainingDaily} left
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Compact Model Selector */}
      <div className="px-3 py-2 border-b bg-slate-50">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="h-7 text-[11px] border-slate-200 bg-white">
            <Zap className="h-3 w-3 text-yellow-500 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-xs">
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        {messages.length === 0 && (
          <div className="text-center py-4 px-2">
            <p className="text-xs text-muted-foreground mb-3">Ask me about your support data</p>
            <div className="space-y-1.5">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full text-[11px] justify-start h-auto py-2 px-3 hover:bg-slate-100 rounded-lg text-left"
                  onClick={() => setInput(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-[#419372] text-white'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="bg-slate-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-[#419372]" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      <div className="p-3 bg-white border-t rounded-b-xl">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            disabled={isLoading}
            maxLength={500}
            className="flex-1 h-9 text-sm rounded-lg border-slate-200"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-9 w-9 rounded-lg flex-shrink-0"
            style={{ backgroundColor: input.trim() ? '#419372' : '#cbd5e1' }}
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
