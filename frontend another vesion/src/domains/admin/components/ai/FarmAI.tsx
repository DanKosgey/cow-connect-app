import React, { useRef } from 'react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Lightbulb,
  Milk,
  Wheat,
  TrendingUp,
  AlertCircle,
  BarChart3,
  PiggyBank,
  Calendar
} from "lucide-react";
import { logger } from '../lib/logger';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import apiService from '@/services/ApiService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'chat' | 'insight' | 'alert';
}

interface Insight {
  id: string;
  title: string;
  content: string;
  type: 'daily' | 'weekly' | 'anomaly' | 'recommendation';
  timestamp: Date;
  farmerId?: string;
}

interface FarmAINotification {
  type: 'production' | 'health' | 'efficiency' | 'maintenance';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

const FarmAI = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI farming assistant powered by advanced agricultural intelligence. I can help you with dairy farming questions, milk production optimization, herd management, feed strategies, and personalized recommendations based on your farm data. What would you like to know?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'chat'
    }
  ]);
  const [insights, setInsights] = useState<Insight[]>([
    {
      id: '1',
      title: 'Weekly Production Summary',
      content: 'Your milk production has increased by 15% this week compared to last week. The average quality grade remains at A with consistent fat content.',
      type: 'weekly',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      title: 'Feed Optimization Recommendation',
      content: 'Based on current milk production patterns, consider increasing protein content in evening feed by 5% to optimize morning milk yield.',
      type: 'recommendation',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      title: 'Weather Impact Alert',
      content: 'Upcoming temperature drop may affect milk production. Ensure adequate shelter and consider adjusting feeding schedule.',
      type: 'anomaly',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [farmNotifications, setFarmNotifications] = useState<FarmAINotification[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "How can I improve milk production this month?",
    "What's the optimal feeding schedule?",
    "How to maintain cow health during winter?",
    "Analyze my farm's performance trends",
    "What are the market price predictions?",
    "Best practices for herd management"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    logger.debug('FarmAI component mounted');
    // Simulating real-time farm-specific AI notifications with detailed insights
    const mockFarmNotifications: FarmAINotification[] = [
      {
        type: 'production',
        title: 'Milk Production Optimization',
        description: 'Optimal milking time adjustment suggested: Switch to 4-hour intervals to increase yield by 8%',
        priority: 'medium',
        timestamp: new Date()
      },
      {
        type: 'production',
        title: 'Feed Mix Optimization',
        description: 'AI suggests increasing protein content by 2.5% to optimize milk fat content',
        priority: 'medium',
        timestamp: new Date()
      },
      {
        type: 'health',
        title: 'Early Health Alert',
        description: 'AI detected potential respiratory patterns in Barn 2, Section C. Veterinary check recommended.',
        priority: 'high',
        timestamp: new Date()
      },
      {
        type: 'health',
        title: 'Herd Wellness Update',
        description: 'Automated health monitoring shows improved vitals after recent feed adjustments',
        priority: 'low',
        timestamp: new Date()
      },
      {
        type: 'efficiency',
        title: 'Water Usage Optimization',
        description: 'Smart sensors indicate 15% excess water usage in Section B. Checking for leaks advised.',
        priority: 'medium',
        timestamp: new Date()
      },
      {
        type: 'efficiency',
        title: 'Energy Efficiency Alert',
        description: 'Night-time cooling systems running longer than optimal. Potential savings of 12% identified.',
        priority: 'medium',
        timestamp: new Date()
      },
      {
        type: 'maintenance',
        title: 'Preventive Maintenance Alert',
        description: 'Milking system #3 showing early signs of wear. Schedule maintenance within 5 days.',
        priority: 'medium',
        timestamp: new Date()
      },
      {
        type: 'maintenance',
        title: 'Equipment Performance Update',
        description: 'Feed distribution system efficiency decreased by 5%. Calibration recommended.',
        priority: 'low',
        timestamp: new Date()
      }
    ];

    setFarmNotifications(mockFarmNotifications);
    return () => {
      logger.debug('FarmAI component unmounted');
    };
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'chat'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Use the backend AI service instead of direct Gemini API
      const response = await apiService.Chat.sendMessage(inputMessage);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: 'ai',
        timestamp: new Date(),
        type: 'chat'
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI service:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I'm experiencing connectivity issues with the AI service. Please try again in a moment, or contact our support team for immediate assistance with your agricultural questions.",
        sender: 'ai',
        timestamp: new Date(),
        type: 'chat'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsight = async (type: 'daily' | 'weekly' | 'market' | 'health') => {
    setIsLoading(true);
    try {
      const prompts = {
        daily: "Generate a daily farm insight focusing on today's milk production, cow health status, and any immediate recommendations for tomorrow.",
        weekly: "Create a comprehensive weekly farm performance summary including production trends, quality metrics, and strategic recommendations for next week.",
        market: "Provide current dairy market analysis, price trends, and selling strategy recommendations based on market conditions.",
        health: "Analyze herd health patterns and provide preventive care recommendations based on seasonal factors and current farm conditions."
      };

      // Use the backend AI service instead of direct Gemini API
      const context = `As an AI analyst for DairyChain Pro dairy farm management platform, ${prompts[type]} 
              Base your analysis on typical dairy farm metrics and provide specific, actionable recommendations. 
              Include relevant numbers and percentages where appropriate. Keep the insight concise but comprehensive.`;
      
      const response = await apiService.Chat.sendMessage(context);
      
      const newInsight: Insight = {
        id: Date.now().toString(),
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Farm Insight`,
        content: response.response,
        type: type === 'market' ? 'recommendation' : type === 'health' ? 'anomaly' : type,
        timestamp: new Date()
      };
      setInsights(prev => [newInsight, ...prev]);
    } catch (error) {
      console.error('Error generating insight:', error);
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

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Calendar className="h-4 w-4" />;
      case 'weekly': return <BarChart3 className="h-4 w-4" />;
      case 'anomaly': return <AlertCircle className="h-4 w-4" />;
      case 'recommendation': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'weekly': return 'bg-green-50 border-green-200 text-green-800';
      case 'anomaly': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'recommendation': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-green-950/10 to-green-900/5 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-green-950 dark:text-green-50 mb-8">
          Farm Intelligence Center
        </h1>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Production Optimization Section */}
          <Card className="border-green-900/20 shadow-lg hover:shadow-xl transition-shadow duration-200 backdrop-blur-sm bg-white/50 dark:bg-green-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-green-950 dark:text-green-50">
                Production Insights
                <Badge className="bg-green-900 text-white">AI-Optimized</Badge>
              </CardTitle>
              <CardDescription className="text-green-800 dark:text-green-200">
                Smart production recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {farmNotifications
                .filter(n => n.type === 'production')
                .map((notification, index) => (
                  <Alert key={index} className="mb-4 border-l-4 border-green-700 bg-green-50/50 dark:bg-green-900/50">
                    <AlertTitle className="flex items-center gap-2 text-green-900 dark:text-green-50 font-semibold">
                      {notification.title}
                      <Badge variant={getPriorityColor(notification.priority)}
                             className="text-xs font-medium">
                        {notification.priority}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-green-800 dark:text-green-100">
                      {notification.description}
                    </AlertDescription>
                  </Alert>
                ))}
            </CardContent>
          </Card>

          {/* Herd Health Section */}
          <Card className="border-green-900/20 shadow-lg hover:shadow-xl transition-shadow duration-200 backdrop-blur-sm bg-white/50 dark:bg-green-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-green-950 dark:text-green-50">
                Herd Health Monitor
                <Badge className="bg-green-900 text-white">Real-time</Badge>
              </CardTitle>
              <CardDescription className="text-green-800 dark:text-green-200">
                AI-powered health monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {farmNotifications
                .filter(n => n.type === 'health')
                .map((notification, index) => (
                  <Alert key={index} className="mb-4 border-l-4 border-green-700 bg-green-50/50 dark:bg-green-900/50">
                    <AlertTitle className="flex items-center gap-2 text-green-900 dark:text-green-50 font-semibold">
                      {notification.title}
                      <Badge variant={getPriorityColor(notification.priority)}
                             className="text-xs font-medium">
                        {notification.priority}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-green-800 dark:text-green-100">
                      {notification.description}
                    </AlertDescription>
                  </Alert>
                ))}
            </CardContent>
          </Card>

          {/* Efficiency Metrics Section */}
          <Card className="border-green-900/20 shadow-lg hover:shadow-xl transition-shadow duration-200 backdrop-blur-sm bg-white/50 dark:bg-green-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-green-950 dark:text-green-50">
                Resource Efficiency
                <Badge className="bg-green-900 text-white">Analytics</Badge>
              </CardTitle>
              <CardDescription className="text-green-800 dark:text-green-200">
                Resource optimization insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {farmNotifications
                .filter(n => n.type === 'efficiency')
                .map((notification, index) => (
                  <Alert key={index} className="mb-4 border-l-4 border-green-700 bg-green-50/50 dark:bg-green-900/50">
                    <AlertTitle className="flex items-center gap-2 text-green-900 dark:text-green-50 font-semibold">
                      {notification.title}
                      <Badge variant={getPriorityColor(notification.priority)}
                             className="text-xs font-medium">
                        {notification.priority}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-green-800 dark:text-green-100">
                      {notification.description}
                    </AlertDescription>
                  </Alert>
                ))}
            </CardContent>
          </Card>

          {/* Maintenance Alerts Section */}
          <Card className="border-green-900/20 shadow-lg hover:shadow-xl transition-shadow duration-200 backdrop-blur-sm bg-white/50 dark:bg-green-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-green-950 dark:text-green-50">
                Smart Maintenance
                <Badge className="bg-green-900 text-white">Predictive</Badge>
              </CardTitle>
              <CardDescription className="text-green-800 dark:text-green-200">
                Equipment and facility maintenance alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {farmNotifications
                .filter(n => n.type === 'maintenance')
                .map((notification, index) => (
                  <Alert key={index} className="mb-4 border-l-4 border-green-700 bg-green-50/50 dark:bg-green-900/50">
                    <AlertTitle className="flex items-center gap-2 text-green-900 dark:text-green-50 font-semibold">
                      {notification.title}
                      <Badge variant={getPriorityColor(notification.priority)}
                             className="text-xs font-medium">
                        {notification.priority}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-green-800 dark:text-green-100">
                      {notification.description}
                    </AlertDescription>
                  </Alert>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FarmAI;
