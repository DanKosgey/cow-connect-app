import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Brain,
  Activity,
  Zap,
  Target,
  Award,
  Clock,
  TrendingUp
} from "lucide-react";
import { AIChat } from './AIChat';

export function AdminAI() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 p-6 h-full">
      {/* Main AI Chat Section */}
      <div className="flex flex-col space-y-6">
        <AIChat />
      </div>

      {/* Insights Panel */}
      <div className="space-y-6">
        {/* Performance Metrics */}
        <Card className="bg-black/30 border-emerald-500/20 overflow-hidden group hover:border-emerald-500/40 transition-colors duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                AI Performance Metrics
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Live
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-emerald-400" />
                  <span className="text-emerald-100">Response Time</span>
                </div>
                <span className="text-emerald-400">0.8s</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-emerald-400" />
                  <span className="text-emerald-100">Accuracy Score</span>
                </div>
                <span className="text-emerald-400">98.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-emerald-400" />
                  <span className="text-emerald-100">Success Rate</span>
                </div>
                <span className="text-emerald-400">99.2%</span>
              </div>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Card>

        {/* Recent Insights */}
        <Card className="bg-black/30 border-emerald-500/20 overflow-hidden group hover:border-emerald-500/40 transition-colors duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Insights
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Updated
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">2 minutes ago</span>
                </div>
                <p className="text-emerald-100">Milk production increased by 15% this week</p>
              </div>
              <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">15 minutes ago</span>
                </div>
                <p className="text-emerald-100">Feed optimization saved 8% in costs</p>
              </div>
              <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">1 hour ago</span>
                </div>
                <p className="text-emerald-100">Herd health status: 98% optimal</p>
              </div>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Card>
      </div>
    </div>
  );
}
