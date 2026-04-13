
"use client";

import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  Sparkles, 
  Download, 
  Trash2, 
  LogOut, 
  Loader2,
  CheckCircle2,
  Plus,
  Zap,
  User as UserIcon,
  Image as ImageIcon,
  ChevronRight,
  Info
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection } from '@/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  limit 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateAIPortrait } from '@/ai/flows/generate-portrait';

const STYLES = [
  { id: 'realistic', label: 'Realistic', description: 'Professional studio headshot', icon: '👔' },
  { id: 'anime', label: 'Anime', description: 'Ghibli-inspired art', icon: '🎨' },
  { id: 'cartoon', label: 'Cartoon', description: '3D Pixar-style character', icon: '🧸' },
];

export default function AISelfieGenerator() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<'realistic' | 'anime' | 'cartoon'>('realistic');

  const generationsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'generations'),
      orderBy('createdAt', 'desc'),
      limit(12)
    );
  }, [db, user]);

  const { data: generations } = useCollection(generationsQuery);

  const handleLogin = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: "Welcome back!", description: "Let's create some art." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    }
  };

  const handleLogout = () => auth && signOut(auth);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isTypeValid = ['image/jpeg', 'image/png'].includes(file.type);
      const isSizeValid = file.size <= 5 * 1024 * 1024;
      return isTypeValid && isSizeValid;
    });

    if (selectedFiles.length + validFiles.length > 5) {
      toast({ variant: "destructive", title: "Limit Exceeded", description: "Max 5 images allowed." });
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!user || selectedFiles.length === 0 || !db) return;

    setIsGenerating(true);
    setIsUploading(true);
    
    try {
      const storage = getStorage();
      const uploadUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const storagePath = `users/${user.uid}/uploads/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, storagePath);
        
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadUrls.push(url);
        
        addDoc(collection(db, 'users', user.uid, 'uploads'), {
          url,
          storagePath,
          fileName: file.name,
          createdAt: serverTimestamp()
        });

        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      setIsUploading(false);
      
      const result = await generateAIPortrait({
        imageUrls: uploadUrls,
        userId: user.uid,
        style: selectedStyle
      });

      addDoc(collection(db, 'users', user.uid, 'generations'), {
        url: result.imageUrl,
        prompt: `Portrait in ${selectedStyle} style`,
        style: selectedStyle,
        referenceUrl: uploadUrls[0], // Store first image for comparison
        createdAt: serverTimestamp()
      });

      toast({ title: "Masterpiece Ready!", description: "Your AI portrait has been added to the gallery." });
      setSelectedFiles([]);
      setPreviews([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: error.message });
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full" />
        
        <Card className="max-w-md w-full glass-morphism border-white/5 relative z-10 p-4">
          <CardHeader className="text-center pb-8">
            <div className="w-20 h-20 bg-amber-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/20 border border-amber-500/30">
              <Sparkles className="text-amber-500 w-10 h-10" />
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight text-white mb-2">AI Studio</CardTitle>
            <CardDescription className="text-slate-400 text-lg">Turn your selfie into AI art instantly.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleLogin} 
              className="w-full h-14 text-lg font-bold rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              Sign in with Google
            </Button>
            <p className="text-center text-xs text-slate-500 mt-6 px-4">
              By joining, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-body pb-24">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight leading-none text-white">AI Studio</span>
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mt-1">Creative Suite</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 pr-6 border-r border-white/5">
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-none mb-1">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Premium Member</p>
              </div>
              <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-amber-500/50 p-0.5" alt="User" />
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-bold">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Controls Panel */}
          <div className="lg:col-span-5 space-y-8">
            <section className="space-y-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight text-white">Create Art</h1>
                <p className="text-slate-400">Upload your selfies and select a style.</p>
              </div>

              <Card className="glass-morphism border-0 overflow-hidden rounded-[2rem]">
                <CardContent className="p-8 space-y-8">
                  {/* Style Selector */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Choose Your Style
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id as any)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 group",
                            selectedStyle === style.id 
                              ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" 
                              : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                          )}
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">{style.icon}</span>
                          <span className="text-xs font-bold">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        Reference Photos
                      </span>
                      <span className={cn(selectedFiles.length >= 3 ? "text-green-500" : "text-slate-500")}>
                        {selectedFiles.length}/5
                      </span>
                    </label>
                    <div 
                      className={cn(
                        "relative border-2 border-dashed rounded-[2rem] p-10 transition-all flex flex-col items-center justify-center gap-4 bg-white/[0.02]",
                        selectedFiles.length > 0 ? "border-amber-500/40" : "border-white/5 hover:border-amber-500/40"
                      )}
                    >
                      <input 
                        type="file" 
                        multiple 
                        accept="image/jpeg,image/png" 
                        onChange={onFileSelect} 
                        className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                        disabled={isGenerating}
                      />
                      
                      {previews.length === 0 ? (
                        <div className="text-center space-y-3">
                          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
                            <Plus className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-200">Upload Selfies</p>
                            <p className="text-xs text-slate-500">Drop images here or click to browse</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 w-full relative z-30">
                          {previews.map((src, i) => (
                            <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/5">
                              <img src={src} className="w-full h-full object-cover" alt="Preview" />
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                className="absolute top-1.5 right-1.5 bg-red-500/90 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          ))}
                          {previews.length < 5 && (
                            <div className="aspect-square rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center hover:border-amber-500/40 transition-colors bg-white/[0.01]">
                              <Plus className="w-6 h-6 text-slate-600" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress & Action */}
                  <div className="space-y-6">
                    {isGenerating && (
                      <div className="space-y-3 p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/10 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-amber-500">
                          <span className="flex items-center gap-2">
                            {isUploading ? <Upload className="w-3.5 h-3.5 animate-bounce" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                            {isUploading ? `Uploading...` : `Generating ${selectedStyle}...`}
                          </span>
                          <span>{isUploading ? `${uploadProgress}%` : "Magic time"}</span>
                        </div>
                        <Progress value={isUploading ? uploadProgress : 100} className="h-1.5 bg-white/5" />
                      </div>
                    )}

                    <Button 
                      onClick={handleGenerate} 
                      disabled={selectedFiles.length < 3 || isGenerating} 
                      className="w-full h-16 text-lg font-bold rounded-[2rem] bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:grayscale transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-3 h-6 w-6" />
                          Generate My Portrait
                        </>
                      )}
                    </Button>
                    {selectedFiles.length < 3 && (
                      <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <Info className="w-3 h-3" />
                        Minimum 3 photos required
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Gallery Panel */}
          <div className="lg:col-span-7 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-amber-500" />
                  Your Gallery
                </h2>
                <p className="text-slate-400">View and download your AI masterpieces.</p>
              </div>
              {generations && generations.length > 0 && (
                <Badge variant="secondary" className="bg-white/5 text-amber-500 border-0 px-4 py-1.5 rounded-xl font-bold">
                  {generations.length} Creations
                </Badge>
              )}
            </div>

            {generations && generations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {generations.map((gen: any) => (
                  <Card key={gen.id} className="group overflow-hidden glass-morphism border-0 rounded-[2.5rem] transition-all hover:scale-[1.02]">
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img src={gen.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Generated" />
                      
                      {/* Compare Hint - Shows reference if stored */}
                      {gen.referenceUrl && (
                        <div className="absolute top-4 left-4 z-20">
                           <Badge className="bg-black/60 backdrop-blur-md border-0 text-[10px] uppercase font-bold tracking-widest p-2">
                             Before/After Mode
                           </Badge>
                        </div>
                      )}

                      {/* Reference Hover Overlay (Optional UX) */}
                      {gen.referenceUrl && (
                        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                            <img src={gen.referenceUrl} className="w-full h-full object-cover" alt="Source" />
                          </div>
                        </div>
                      )}

                      {/* Actions Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-8 pt-20 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-amber-500 text-white border-0 font-bold uppercase text-[10px] tracking-widest">
                              {gen.style || 'AI Result'}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {new Date(gen.createdAt?.seconds * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          <Button 
                            className="w-full h-12 font-bold rounded-2xl bg-white text-black hover:bg-slate-200 transition-colors"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = gen.url;
                              link.download = `ai_portrait_${gen.id}.png`;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download High-Res
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 glass-morphism rounded-[3rem] border-0">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No art yet</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">Upload your selfies to start building your professional AI gallery.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 lg:hidden z-50 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent">
        <Button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-full h-14 rounded-2xl bg-amber-500 text-white font-bold shadow-2xl shadow-amber-500/40"
        >
          Start New Generation
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
