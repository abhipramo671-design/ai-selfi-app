"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  FileText, 
  Cpu, 
  Settings, 
  TrendingUp, 
  Users, 
  Database, 
  DollarSign,
  Menu,
  X,
  ChevronRight,
  RefreshCcw,
  Zap,
  MoreVertical,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'gallery', label: 'Image Gallery', icon: ImageIcon },
  { id: 'logs', label: 'User Logs', icon: FileText },
  { id: 'usage', label: 'API Usage', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STATS = [
  { 
    label: 'Total Selfies', 
    value: '24,892', 
    growth: '+12%', 
    icon: TrendingUp,
    description: 'Generated this month'
  },
  { 
    label: 'Active Users', 
    value: '1,284', 
    growth: '+5.4%', 
    icon: Users,
    description: 'Current online'
  },
  { 
    label: 'Storage Used', 
    value: '84.2 GB', 
    progress: 84, 
    icon: Database,
    description: 'of 100GB limit'
  },
  { 
    label: 'API Cost', 
    value: '$432.10', 
    growth: '-2.1%', 
    icon: DollarSign,
    description: 'Estimated for Oct'
  },
];

const RECENT_ACTIVITY = [
  { id: 'usr_9281', prompt: 'Professional headshot, soft lighting', model: 'Imagen 4.0', status: 'Success', time: '2m ago' },
  { id: 'usr_1024', prompt: 'Cyberpunk style portrait', model: 'Stable Diffusion XL', status: 'Pending', time: '5m ago' },
  { id: 'usr_8492', prompt: 'Vintage film photography', model: 'Imagen 4.0', status: 'Success', time: '12m ago' },
  { id: 'usr_3321', prompt: 'Studio portrait, grey background', model: 'Gemini Flash', status: 'Success', time: '15m ago' },
  { id: 'usr_0911', prompt: 'B&W Artistic portrait', model: 'Imagen 4.0', status: 'Success', time: '24m ago' },
];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState('overview');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-body">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/50 backdrop-blur-2xl border-r border-white/5 transition-transform duration-300 lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              mimicme Admin
            </span>
          </div>

          <nav className="flex-1 space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={cn(
                  "flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  activeNav === item.id 
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  activeNav === item.id ? "text-white" : "group-hover:text-amber-500 transition-colors"
                )} />
                <span className="font-medium">{item.label}</span>
                {activeNav === item.id && <ChevronRight className="ml-auto w-4 h-4 opacity-50" />}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 py-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                <img src="https://picsum.photos/seed/admin/100/100" alt="Admin" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Alex Rivera</p>
                <p className="text-xs text-slate-500 truncate">Senior Developer</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-amber-500">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-slate-500 font-medium">Server Status</span>
              <span className="text-xs text-green-500 font-bold flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Operational
              </span>
            </div>
            <div className="w-px h-8 bg-white/5 mx-2" />
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg px-6 h-10">
              Refresh Data
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <Card key={i} className="glass-morphism border-0">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-amber-500" />
                    </div>
                    {stat.growth && (
                      <Badge variant="outline" className={cn(
                        "font-bold bg-white/5 border-0",
                        stat.growth.startsWith('+') ? "text-green-500" : "text-red-500"
                      )}>
                        {stat.growth}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                    <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                  </div>
                  {stat.progress !== undefined && (
                    <div className="mt-4 space-y-2">
                      <Progress value={stat.progress} className="h-1.5 bg-white/5" />
                      <p className="text-[10px] text-slate-500 font-medium text-right uppercase tracking-wider">{stat.description}</p>
                    </div>
                  )}
                  {!stat.progress && (
                    <p className="mt-4 text-xs text-slate-600 font-medium">{stat.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table & Actions */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <Card className="xl:col-span-2 glass-morphism border-0 overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Live feed of mimicme generations across the platform.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-widest font-bold">
                        <th className="px-8 py-5">User ID</th>
                        <th className="px-8 py-5">Prompt</th>
                        <th className="px-8 py-5">Model</th>
                        <th className="px-8 py-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {RECENT_ACTIVITY.map((item, i) => (
                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-5">
                            <span className="font-mono text-xs text-amber-500/80">{item.id}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium truncate max-w-[200px]">{item.prompt}</span>
                              <span className="text-[10px] text-slate-600 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {item.time}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <Badge variant="secondary" className="bg-slate-800 text-slate-400 font-medium border-0">{item.model}</Badge>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              {item.status === 'Success' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                              )}
                              <span className={cn(
                                "text-xs font-bold",
                                item.status === 'Success' ? "text-green-500" : "text-amber-500"
                              )}>
                                {item.status}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card className="glass-morphism border-0">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>System maintenance and controls.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-4">
                  <Button className="w-full justify-start gap-3 h-14 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 font-bold transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 transition-colors">
                      <RefreshCcw className="w-4 h-4 text-red-500 group-hover:text-white" />
                    </div>
                    Clear Firebase Cache
                  </Button>
                  <Button className="w-full justify-start gap-3 h-14 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 font-bold transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                      <Zap className="w-4 h-4 text-amber-500 group-hover:text-white" />
                    </div>
                    Trigger Production Build
                  </Button>
                  <Button className="w-full justify-start gap-3 h-14 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 font-bold transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <ImageIcon className="w-4 h-4 text-blue-500 group-hover:text-white" />
                    </div>
                    Export All Assets
                  </Button>
                </CardContent>
              </Card>

              {/* Usage Card */}
              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white shadow-xl shadow-amber-500/20">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <LayoutDashboard className="w-10 h-10 opacity-30" />
                    <Badge className="bg-black/20 border-0 text-white font-bold">Premium Plan</Badge>
                  </div>
                  <h4 className="text-xl font-bold mb-2">mimicme Resources</h4>
                  <p className="text-white/70 text-sm mb-6">Your instance is scaling automatically based on traffic.</p>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span>CPU Load</span>
                      <span>32%</span>
                    </div>
                    <Progress value={32} className="h-2 bg-white/20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
