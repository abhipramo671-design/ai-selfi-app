
"use client";

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  Sparkles, 
  Download, 
  Trash2, 
  LogOut, 
  User as UserIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export default function AISelfieGenerator() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const generationsQuery = React.useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'generations'),
      orderBy('createdAt', 'desc'),
      limit(12)
    );
  }, [db, user]);

  const { data: generations } = useCollection(generationsQuery);

  const handleLogin = async () => {
    if (!auth) {
      toast({ 
        variant: "destructive", 
        title: "Auth Error", 
        description: "Firebase Auth is not initialized." 
      });
      return;
    }
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast({ title: "Welcome!", description: "Successfully signed in." });
    } catch (error: any) {
      console.error("Login Error:", error);
      
      let errorMessage = error.message || "Could not authenticate with Google.";
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = `Domain "${window.location.hostname}" is not authorized. Please add it to your Firebase Console under Authentication > Settings > Authorized domains.`;
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Google sign-in is not enabled. Please enable it in the Firebase Console.";
      } else if (error.code === 'auth/invalid-api-key') {
        errorMessage = "Invalid API key. Please check your Firebase configuration.";
      }

      toast({ 
        variant: "destructive", 
        title: "Login Failed", 
        description: errorMessage
      });
    }
  };

  const handleLogout = () => auth && signOut(auth);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isTypeValid = ['image/jpeg', 'image/png'].includes(file.type);
      const isSizeValid = file.size <= 5 * 1024 * 1024;
      if (!isTypeValid) toast({ variant: "destructive", title: "Invalid Type", description: `${file.name} is not a JPG or PNG.` });
      if (!isSizeValid) toast({ variant: "destructive", title: "File Too Large", description: `${file.name} exceeds 5MB.` });
      return isTypeValid && isSizeValid;
    });

    if (selectedFiles.length + validFiles.length > 5) {
      toast({ variant: "destructive", title: "Limit Exceeded", description: "You can upload a maximum of 5 images." });
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
      toast({ title: "Upload Complete", description: "Analyzing your features for the portrait..." });

      const result = await generateAIPortrait({
        imageUrls: uploadUrls,
        userId: user.uid
      });

      addDoc(collection(db, 'users', user.uid, 'generations'), {
        url: result.imageUrl,
        prompt: "Professional AI Portrait",
        createdAt: serverTimestamp()
      });

      toast({ 
        title: "Portrait Generated!", 
        description: "Your AI masterpiece is ready in the gallery." 
      });
      
      setSelectedFiles([]);
      setPreviews([]);
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Generation Failed", 
        description: error.message || "Something went wrong during the AI process." 
      });
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-primary/20 bg-card/50 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-primary w-8 h-8" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">AI Portrait Studio</CardTitle>
            <CardDescription>Upload a few selfies and let AI create professional portraits of you.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} className="w-full h-12 text-base font-bold rounded-xl" size="lg">
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary w-6 h-6" />
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block">AI Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 pr-4 border-r">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-primary/20" alt="User" />
              <span className="text-sm font-medium hidden md:inline-block">{user.displayName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid gap-8">
          <section>
            <Card className="border-primary/10 bg-card/40 backdrop-blur-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Reference Selfies
                </CardTitle>
                <CardDescription>Upload 3-5 clear selfies for the best results. JPG/PNG, max 5MB.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 bg-black/5",
                    selectedFiles.length > 0 ? "border-primary/40" : "border-white/10 hover:border-primary/40"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input 
                    type="file" 
                    multiple 
                    accept="image/jpeg,image/png" 
                    onChange={onFileSelect} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    disabled={isGenerating}
                  />
                  
                  {previews.length === 0 ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">Click or drag to upload</p>
                        <p className="text-sm text-muted-foreground">Up to 5 images (Max 5MB each)</p>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 w-full">
                      {previews.map((src, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
                          <img src={src} className="w-full h-full object-cover" alt="Preview" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            className="absolute top-1 right-1 bg-destructive/80 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {previews.length < 5 && (
                        <div className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center hover:border-primary/40 transition-colors">
                          <Plus className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isGenerating && (
                  <div className="space-y-3 p-4 bg-primary/5 rounded-xl animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="flex items-center gap-2">
                        {isUploading ? <Upload className="w-4 h-4 animate-bounce" /> : <Sparkles className="w-4 h-4 animate-pulse" />}
                        {isUploading ? `Uploading images... (${uploadProgress}%)` : "Generating AI Portrait..."}
                      </span>
                      <span className="text-primary">{isUploading ? `${uploadProgress}%` : "In Progress"}</span>
                    </div>
                    <Progress value={isUploading ? uploadProgress : 100} className="h-2" />
                  </div>
                )}

                <Button 
                  onClick={handleGenerate} 
                  disabled={selectedFiles.length < 3 || isGenerating} 
                  className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      AI Magic in Progress...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate AI Portrait
                    </>
                  )}
                </Button>
                {selectedFiles.length < 3 && selectedFiles.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground animate-pulse">
                    Please upload at least 3 images for optimal results.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                Generated History
              </h2>
              {generations && generations.length > 0 && (
                <Badge variant="outline" className="px-3 py-1">{generations.length} Creations</Badge>
              )}
            </div>

            {generations && generations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {generations.map((gen: any) => (
                  <Card key={gen.id} className="group overflow-hidden border-primary/5 hover:border-primary/20 transition-all bg-card/40">
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img src={gen.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Generated" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="w-full font-bold"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = gen.url;
                            link.download = `ai_portrait_${gen.id}.png`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/20 rounded-3xl border-2 border-dashed border-white/5">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No portraits yet</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">Upload your selfies above to start generating AI masterpieces.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
