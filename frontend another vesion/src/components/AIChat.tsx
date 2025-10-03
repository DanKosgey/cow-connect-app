import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { markdownComponents } from './markdown-components';
import { TypeAnimation } from 'react-type-animation';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Image as ImageIcon,
  Mic, 
  StopCircle,
  Camera,
  Download,
  Eraser,
  Clock,
  Lightbulb,
  MessageSquareDashed,
  TrendingUp,
  Activity,
  BarChart,
  Wheat,
  X
} from 'lucide-react';
import apiService from '@/services/ApiService';

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'suggestion';
}

interface QuickSuggestion {
  text: string;
  icon: React.ElementType;
}

const quickSuggestions: QuickSuggestion[] = [
  { text: "Analyze milk production trends", icon: TrendingUp },
  { text: "Check cattle health status", icon: Activity },
  { text: "Optimize feed management", icon: Wheat },
  { text: "View farm analytics", icon: BarChart }
];

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSendMessage = async () => {
    if (!input.trim() && !imageFile) return;
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      // Use the backend AI service instead of direct Gemini API
      const response = await apiService.Chat.sendMessage(input);
      
      const aiMessage: Message = {
        role: 'ai',
        content: response.response,
        timestamp: new Date(response.timestamp),
        type: 'text'
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage: Message = {
        role: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Here you would typically send the audio to a speech-to-text service
          // For now, we'll just add a placeholder message
          setInput('Audio message recorded (speech-to-text coming soon)');
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  // Initialize with a welcome message
  useEffect(() => {
    setMessages([{
      role: 'ai',
      content: 'Hello! I\'m your DairyChain AI Assistant. How can I help you today?',
      timestamp: new Date(),
      type: 'text'
    }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Export chat history
  const exportChatHistory = () => {
    const chatHistory = messages.map(msg => `[${msg.role.toUpperCase()}] ${msg.timestamp.toLocaleString()}\n${msg.content}\n\n`).join('');
    const blob = new Blob([chatHistory], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dairy-chat-history.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-xl border border-emerald-500/20 shadow-2xl backdrop-blur-sm relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-1" />
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-cyan-500/10 animate-pulse-slow -z-1" />
      
      {/* Header */}
      <div className="p-4 border-b border-emerald-500/20 bg-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Bot className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                DairyChain AI Assistant
              </h2>
              <p className="text-sm text-emerald-500/80">Powered by Gemini</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              Online
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.role === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-emerald-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ml-auto'
                    : 'bg-slate-900/50 border border-emerald-500/20 backdrop-blur-sm'
                }`}
              >
                {message.type === 'text' ? (
                  <ReactMarkdown components={markdownComponents}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p>{message.content}</p>
                )}
                <span className="text-xs opacity-50 mt-2 block">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center space-x-sm text-emerald-400 bg-emerald-500/5 rounded-lg p-sm border border-emerald-500/20">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing your request...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-md border-t border-emerald-500/20 bg-black/40 space-y-lg">
        <div className="flex flex-wrap gap-sm">
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInput(suggestion.text)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-all duration-200 hover:scale-105 group"
            >
              <suggestion.icon className="h-4 w-4 group-hover:animate-pulse" />
              <span>{suggestion.text}</span>
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex items-end space-x-sm">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about dairy farming, management, or get AI insights..."
              className="w-full bg-slate-900/50 border-emerald-500/20 focus:border-emerald-500 text-emerald-100 placeholder:text-emerald-500/50 rounded-xl pr-24"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <div className="absolute right-sm top-1/2 -translate-y-1/2 flex items-center space-x-xs">
              {imageFile && (
                <button
                  onClick={() => setImageFile(null)}
                  className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-emerald-400" />
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                <ImageIcon className="h-4 w-4 text-emerald-400" />
              </button>
              <button
                onClick={toggleRecording}
                className={`p-2 hover:bg-emerald-500/10 rounded-lg transition-colors ${
                  isRecording ? 'text-red-500 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {isRecording ? (
                  <StopCircle className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 transition-opacity rounded-xl px-4 py-2 h-[42px] flex items-center justify-center"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />
    </div>
  );
}
