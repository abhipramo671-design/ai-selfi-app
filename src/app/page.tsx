
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Zap,
  ArrowRight,
  Smartphone,
  Layers,
  ShieldCheck,
  Loader2,
  Camera,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useUser, useAuth } from '@/firebase';
import { 
  signInWithRedirect, 
  GoogleAuthProvider,
  getRedirectResult
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle post-redirect results
  useEffect(() => {
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          if (result && result.user) {
            router.replace('/dashboard');
          }
        })
        .catch((error) => {
          console.error("Auth Redirect Error:", error);
          if (error.code === 'auth/unauthorized-domain') {
            toast({
              variant: "destructive",
              title: "Unauthorized Domain",
              description: "Please ensure this domain is added to Authorized Domains in Firebase Console.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Login Error",
              description: error.message || "Failed to complete sign-in.",
            });
          }
        });
    }
  }, [auth, router]);

  // Handle existing session
  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    if (!auth) return;
    setIsRedirecting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      setIsRedirecting(false);
      console.error("Login Initiation Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Login Failed", 
        description: error.message 
      });
    }
  };

  if (authLoading || user || isRedirecting) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-slate-400 font-bold animate-pulse">
            {isRedirecting ? "Connecting to Google..." : "Entering mimicme studio..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden font-body">
      <nav className="container mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 relative z-20">
        <div className="flex items-center gap-2">
          <Zap className="text-amber-500 w-6 h-6 fill-amber-500" />
          <span className="font-bold text-xl tracking-tight">mimicme</span>
        </div>
        <Button variant="ghost" onClick={handleLogin} className="font-bold text-amber-500 hover:text-amber-400">
          Sign In
        </Button>
      </nav>

      <section className="relative pt-20 pb-12 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full -z-10" />
        <div className="container mx-auto px-6 text-center">
          <Badge className="mb-6 bg-amber-500/10 text-amber-500 border-amber-500/20 py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-1000">
            mimicme ai camera
          </Badge>
          <h1 className="text-5xl lg:text-8xl font-black tracking-tighter mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Turn your selfie <br/> <span className="text-amber-500">into AI art</span>
          </h1>
          <p className="text-slate-400 text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Upload simple selfies and watch our advanced neural networks transform you into studio-quality portraits, anime characters, or fine art paintings.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
            <Button onClick={handleLogin} size="lg" className="h-16 px-10 text-lg font-bold bg-amber-500 hover:bg-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all">
              Get Started Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="h-16 px-10 text-lg font-bold border-white/10 rounded-2xl hover:bg-white/5">
              <Camera className="mr-2 w-5 h-5" />
              Try Guest Mode
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white/[0.01] border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Mobile Friendly</h3>
              <p className="text-slate-500">Capture and generate directly from your phone camera with built-in camera toggle support.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Multiple Styles</h3>
              <p className="text-slate-500">Choose from Anime, Cyberpunk, Oil Painting, and more. Fine-tune with our intensity controls.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Secure & Private</h3>
              <p className="text-slate-500">Your photos are stored securely in your private cloud gallery. We never share your data.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
