import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

interface AIAgentButtonProps {
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

const AIAgentButton = ({ onClick, isActive = false, className = '' }: AIAgentButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant={isActive ? "default" : "outline"}
      className={`flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-300 transform hover:scale-105 ${className}`}
    >
      <div className="relative">
        <Bot className="h-5 w-5" />
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>
      <span className="font-semibold">AI Assistant</span>
    </Button>
  );
};

export default AIAgentButton;