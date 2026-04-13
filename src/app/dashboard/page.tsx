
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  Download, 
  Trash2, 
  LogOut, 
  Loader2,
  Plus,
  Zap,
  Image as ImageIcon,
  Camera,
  Share2,
  Copy,
  Layers,
  RefreshCw,
  X,
  FlipHorizontal,
  User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection } from '@/firebase';
import { 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  deleteDoc,
  doc,
  serverTimestamp, 
  query, 
  orderBy,
  limit 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateAIPortrait } from '@/ai/flows/generate-portrait';
import { useRouter } from 'next/navigation';

const STYLES = [
  { id: 'realistic', label: 'Realistic', icon: '👔' },
  { id: 'anime', label: 'Anime', icon: '🎨' },
  { id: 'cartoon', label: 'Cartoon', icon: '🧸' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🌆' },
  { id: 'oil-painting', label: 'Oil Painting', icon: '🖼️' },
  { id: 'sketch', label: 'Sketch', icon: '✏️' },
];

export default function Dashboard() {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<any>('realistic');
  const [intensity, setIntensity] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);

  const generationsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'generations'),
      orderBy('createdAt', 'desc'),
      limit(24)
    );
  }, [db, user]);

  const { data: generations } = useCollection(generationsQuery);

  const handleLogout = () => auth && signOut(auth).then(() => router.push('/'));

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera." });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    if (showCamera) startCamera();
  }, [facingMode]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            addFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const addFile = (file: File) => {
    if (selectedFiles.length >= 5) {
      toast({ variant: "destructive", title: "Limit Reached", description: "Maximum 5 photos allowed." });
      return;
    }
    setSelectedFiles(prev => [...prev, file]);
    setPreviews(prev => [...prev, URL.createObjectURL(file)]);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.filter(f => f.type.startsWith('image/')).forEach(addFile);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (selectedFiles.length === 0) return;

    if (!user) {
      toast({ title: "Guest Mode", description: "You are in guest mode. Your art won't be saved to the cloud." });
    }

    setIsGenerating(true);
    setIsUploading(true);
    
    try {
      const storage = getStorage();
      const uploadUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // In Guest mode, we still upload for the AI to process, but we don't save the record
        const path = user ? `users/${user.uid}/uploads/${Date.now()}_${file.name}` : `temp/guest/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, path);
        
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadUrls.push(url);
        
        if (user && db) {
          addDoc(collection(db, 'users', user.uid, 'uploads'), {
            url,
            storagePath: path,
            fileName: file.name,
            createdAt: serverTimestamp()
          });
        }

        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      setIsUploading(false);
      
      const result = await generateAIPortrait({
        imageUrls: uploadUrls,
        userId: user?.uid || 'guest',
        style: selectedStyle,
        intensity: intensity
      });

      if (user && db) {
        addDoc(collection(db, 'users', user.uid, 'generations'), {
          url: result.imageUrl,
          prompt: `Portrait in ${selectedStyle} style (Intensity: ${intensity}%)`,
          style: selectedStyle,
          intensity: intensity,
          referenceUrl: uploadUrls[0],
          createdAt: serverTimestamp()
        });
      } else {
        // Display guest generation
        const a = document.createElement('a');
        a.href = result.imageUrl;
        a.download = `mimicme_guest_portrait.png`;
        toast({ title: "Done!", description: "Download started automatically for your guest generation." });
        a.click();
      }

      toast({ title: "Masterpiece Created!", description: user ? "Your portrait is ready in the gallery." : "Guest generation complete!" });
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

  const deleteGeneration = async (id: string) => {
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'generations', id));
      toast({ title: "Deleted", description: "Generation removed from your history." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete image." });
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      toast({ title: "Copied!", description: "Image copied to clipboard." });
    } catch (err) {
      navigator.clipboard.writeText(url);
      toast({ title: "Link Copied", description: "Direct image link copied to clipboard." });
    }
  };

  const shareImage = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My mimicme Portrait',
          text: 'Check out this AI portrait I generated with mimicme!',
          url: url
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      copyToClipboard(url);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-body pb-24">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <Zap className="text-amber-500 w-8 h-8 fill-amber-500" />
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight leading-none">mimicme</span>
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mt-1">ai camera</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-3 pr-6 border-r border-white/5">
                  <div className="text-right">
                    <p className="text-xs font-bold leading-none mb-1">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Pro Account</p>
                  </div>
                  <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-amber-500/30 p-0.5" alt="User" />
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white rounded-xl">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => router.push('/')} className="bg-amber-500 text-white font-bold rounded-xl px-6">
                Sign In to Save
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-black tracking-tight">Camera Controls</h1>
              <p className="text-slate-400">Transform your identity in seconds with mimicme.</p>
            </div>

            <Card className="glass-morphism border-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    Artistic Style
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 group",
                          selectedStyle === style.id 
                            ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" 
                            : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        <span className="text-2xl group-hover:scale-110 transition-transform">{style.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Style Intensity
                    </label>
                    <span className="text-xs font-bold text-amber-500">{intensity}%</span>
                  </div>
                  <Slider 
                    value={[intensity]} 
                    onValueChange={(val) => setIntensity(val[0])} 
                    max={100} 
                    step={1} 
                    className="py-4"
                  />
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Reference Photos
                    </label>
                    <Button variant="ghost" size="sm" onClick={startCamera} className="h-8 text-amber-500 hover:text-amber-400 font-bold text-[10px] uppercase">
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      Launch mimicme
                    </Button>
                  </div>

                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "relative border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center gap-4 bg-white/[0.01]",
                      isDragging ? "border-amber-500 bg-amber-500/5" : "border-white/5 hover:border-amber-500/40"
                    )}
                  >
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={onFileSelect} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                      disabled={isGenerating}
                    />

                    {previews.length === 0 ? (
                      <div className="text-center space-y-2 py-4">
                        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 mb-2">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-sm">Drop your selfies here</p>
                        <p className="text-xs text-slate-500">PNG, JPG up to 5MB each</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 w-full relative z-30">
                        {previews.map((src, i) => (
                          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
                            <img src={src} className="w-full h-full object-cover" alt="Preview" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                              className="absolute top-1 right-1 bg-red-500/90 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                        {previews.length < 5 && (
                           <div className="aspect-square rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center hover:border-amber-500/40 bg-white/[0.01]">
                            <Plus className="w-5 h-5 text-slate-700" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  {(isGenerating || isUploading) && (
                    <div className="space-y-3 p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/10 animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-amber-500">
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {isUploading ? 'Preparing Assets' : 'mimicme generating'}
                        </span>
                        <span>{isUploading ? `${uploadProgress}%` : "50%"}</span>
                      </div>
                      <Progress value={isUploading ? uploadProgress : 50} className="h-1.5" />
                    </div>
                  )}

                  <Button 
                    onClick={handleGenerate} 
                    disabled={selectedFiles.length === 0 || isGenerating} 
                    className="w-full h-16 text-lg font-bold rounded-[2rem] bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/30 transition-all active:scale-[0.98]"
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cooking...</>
                    ) : (
                      <><Sparkles className="mr-2 h-5 w-5" /> Generate with mimicme</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <Layers className="text-amber-500 w-8 h-8" />
                  Your mimicme Gallery
                </h2>
                <p className="text-slate-500">Your personal cloud of AI masterpieces.</p>
              </div>
            </div>

            {generations && generations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {generations.map((gen: any) => (
                  <Card key={gen.id} className="group relative overflow-hidden glass-morphism border-0 rounded-[2.5rem] transition-all hover:scale-[1.01] hover:shadow-2xl">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img src={gen.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="AI Generated" />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-amber-500 text-white border-0 font-bold uppercase text-[10px] py-1 px-3">
                            {gen.style} ({gen.intensity}%)
                          </Badge>
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                           <Button variant="secondary" size="icon" onClick={() => copyToClipboard(gen.url)} className="h-9 w-9 bg-black/40 backdrop-blur-md text-white rounded-xl">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => deleteGeneration(gen.id)} className="h-9 w-9 rounded-xl">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-8 space-y-4">
                           {gen.referenceUrl && (
                            <div className="flex items-center gap-3 mb-4 p-2 bg-white/5 backdrop-blur-md rounded-2xl w-fit">
                               <img src={gen.referenceUrl} className="w-10 h-10 rounded-lg object-cover border border-white/20" alt="Source" />
                               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Original Reference</div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1 h-12 bg-white text-black font-bold rounded-2xl hover:bg-slate-200"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = gen.url;
                                a.download = `mimicme_portrait_${gen.id}.png`;
                                a.click();
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                            <Button 
                              variant="outline" 
                              className="h-12 w-12 border-white/10 rounded-2xl bg-white/10 backdrop-blur-md"
                              onClick={() => shareImage(gen.url)}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-40 glass-morphism rounded-[3rem] border-0">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-800">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No art yet</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">Upload your selfies to start building your mimicme gallery.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6">
          <Button variant="ghost" size="icon" onClick={stopCamera} className="absolute top-6 right-6 text-white hover:bg-white/10 h-12 w-12 rounded-full">
            <X className="w-8 h-8" />
          </Button>
          
          <div className="relative w-full max-w-md aspect-[3/4] rounded-[2rem] overflow-hidden bg-slate-900 border border-white/10">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            
            <div className="absolute bottom-8 inset-x-0 flex items-center justify-center gap-8">
              <Button onClick={toggleCamera} variant="secondary" size="icon" className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-md text-white">
                <FlipHorizontal className="w-6 h-6" />
              </Button>
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-white" />
              </button>
              <div className="w-14 h-14" />
            </div>
          </div>
          <p className="mt-8 text-slate-400 font-bold uppercase tracking-widest text-xs">Align your face in the mimicme frame</p>
        </div>
      )}
    </div>
  );
}
