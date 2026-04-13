
"use client";

import React, { useEffect, useState } from 'react';
import { 
  Zap,
  ArrowRight,
  Smartphone,
  Layers,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [currentDomain, setCurrentDomain] = useState("");
  const [copied, setCopied] = useState(false);

  // Handle redirect result and diagnostic domain
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.hostname);
    }

    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            console.log("Successfully signed in via redirect");
            router.push('/dashboard');
          }
        })
        .catch((error) => {
          console.error("Redirect Auth Error:", error);
          if (error.code === 'auth/unauthorized-domain') {
            toast({
              variant: "destructive",
              title: "Unauthorized Domain",
              description: `Please add ${window.location.hostname} to your Firebase Authorized Domains.`,
            });
          } else {
            toast({ 
              variant: "destructive", 
              title: "Auth Error", 
              description: error.message 
            });
          }
        });
    }
  }, [auth, router]);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to help with multiple accounts
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Domain copied to clipboard." });
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-slate-400 font-bold animate-pulse">Entering mimicme studio...</p>
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
          
          {/* Diagnostic Alert for 403 Errors */}
          <div className="max-w-2xl mx-auto mb-10 animate-in fade-in zoom-in duration-700 delay-300">
            <Alert className="bg-amber-500/5 border-amber-500/20 text-left">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <AlertTitle className="text-amber-500 font-bold">Fixing 403 Access Error</AlertTitle>
              <AlertDescription className="text-slate-400 text-sm mt-2">
                If you see a 403 error during login, you must add the domain below to your Firebase Console &gt; Auth &gt; Settings &gt; Authorized Domains.
                <div className="mt-4 flex items-center gap-2 bg-black/40 p-3 rounded-lg border border-white/5">
                  <code className="text-amber-500 flex-1 font-mono text-xs truncate">{currentDomain}</code>
                  <Button variant="ghost" size="sm" onClick={copyDomain} className="h-8 w-8 p-0 text-slate-400 hover:text-amber-500">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
            <Button onClick={handleLogin} size="lg" className="h-16 px-10 text-lg font-bold bg-amber-500 hover:bg-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all">
              Get Started Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" className="h-16 px-10 text-lg font-bold border-white/10 rounded-2xl hover:bg-white/5">
              View Showcase
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
