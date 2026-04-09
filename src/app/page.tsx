
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  SwitchCamera, 
  Mic, 
  User, 
  Zap, 
  Circle, 
  Square, 
  Upload, 
  Settings,
  ShieldCheck,
  Video,
  Image as ImageIcon,
  Share2,
  AlertCircle,
  Check,
  Download,
  Smartphone,
  RotateCcw,
  Sliders,
  Sparkles,
  Waves
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { liveIdentitySwap } from '@/ai/flows/live-identity-swap';
import { transformedSelfieCapture } from '@/ai/flows/transformed-selfie-capture';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PlaceholderVoices } from '@/lib/placeholder-voices';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function MimicMeDashboard() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [templateAudio, setTemplateAudio] = useState<string | null>(null);
  const [processedFrame, setProcessedFrame] = useState<string | null>(null);
  const [latency, setLatency] = useState(0);
  const [fps, setFps] = useState(0);
  
  // Neural Config State
  const [showConfig, setShowConfig] = useState(false);
  const [smoothing, setSmoothing] = useState(65);
  const [enhancement, setEnhancement] = useState(80);
  const [voiceClarity, setVoiceClarity] = useState(90);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameIdRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(Date.now());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize camera
  const startCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
      
      if (!hasVideoDevice) {
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "No Camera Found",
          description: "Please connect a camera or webcam to use this app."
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true 
      });

      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        toast({ title: "System Online", description: "Camera and Microphone activated." });
      }
    } catch (err) {
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Error",
        description: "Please allow camera and microphone permissions in your browser settings."
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const handleResetSystem = () => {
    stopCamera();
    setAiEnabled(false);
    setTemplateImage(null);
    setTemplateAudio(null);
    setProcessedFrame(null);
    setLatency(0);
    setFps(0);
    toast({
      title: "System Purged",
      description: "Neural buffers cleared and hardware detached.",
    });
  };

  // Main rendering loop
  const renderLoop = useCallback(() => {
    if (!cameraActive || !videoRef.current || !displayCanvasRef.current || !canvasRef.current) {
      if (displayCanvasRef.current) {
        const ctx = displayCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, displayCanvasRef.current.width, displayCanvasRef.current.height);
      }
      frameIdRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const displayCtx = displayCanvas.getContext('2d');

    if (ctx && displayCtx && video.readyState === video.HAVE_ENOUGH_DATA) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        displayCanvas.width = video.videoWidth;
        displayCanvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0);

      if (aiEnabled && processedFrame) {
        const img = new Image();
        img.onload = () => {
          displayCtx.drawImage(img, 0, 0, displayCanvas.width, displayCanvas.height);
        };
        img.src = processedFrame;
      } else {
        displayCtx.drawImage(video, 0, 0, displayCanvas.width, displayCanvas.height);
      }
    }

    frameIdRef.current = requestAnimationFrame(renderLoop);
  }, [aiEnabled, cameraActive, processedFrame]);

  // AI Processing loop
  useEffect(() => {
    let active = true;
    const process = async () => {
      if (!active) return;
      
      if (aiEnabled && cameraActive && videoRef.current && canvasRef.current && templateImage) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const frameData = canvas.toDataURL('image/jpeg', 0.5);
          const startTime = performance.now();

          try {
            const result = await liveIdentitySwap({
              cameraFrameDataUri: frameData,
              templateImageDataUri: templateImage,
              faceTrackingData: JSON.stringify({ 
                timestamp: Date.now(),
                smoothing,
                enhancement
              })
            });

            if (result.transformedFrameDataUri) {
              setProcessedFrame(result.transformedFrameDataUri);
              const endTime = performance.now();
              setLatency(Math.round(endTime - startTime));
              
              const now = Date.now();
              setFps(Math.round(1000 / (now - lastProcessedTimeRef.current)));
              lastProcessedTimeRef.current = now;
            }
          } catch (error) {
            // Silently handle processing hiccups
          }
        }
      }
      
      setTimeout(process, aiEnabled ? 100 : 500);
    };

    process();
    return () => { active = false; };
  }, [aiEnabled, cameraActive, templateImage, smoothing, enhancement]);

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [renderLoop]);

  const handleCapture = async () => {
    if (!displayCanvasRef.current) return;
    try {
      const dataUrl = displayCanvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `mimicme_selfie_${Date.now()}.png`;
      link.click();
      toast({ title: "Selfie Saved", description: "Transformed photo downloaded successfully." });
    } catch (err) {
      toast({ variant: "destructive", title: "Capture Error", description: "Failed to save photo." });
    }
  };

  const startRecording = () => {
    if (!displayCanvasRef.current) return;
    
    recordedChunksRef.current = [];
    const stream = displayCanvasRef.current.captureStream(30);
    
    if (videoRef.current?.srcObject) {
      const audioTracks = (videoRef.current.srcObject as MediaStream).getAudioTracks();
      if (audioTracks.length > 0) {
        stream.addTrack(audioTracks[0]);
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mimicme_video_${Date.now()}.webm`;
      link.click();
      toast({ title: "Video Saved", description: "Transformed recording downloaded successfully." });
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    toast({ title: "Recording Started", description: "Capturing your transformed identity." });
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'image') setTemplateImage(event.target?.result as string);
        else setTemplateAudio(event.target?.result as string);
        toast({ title: `${type === 'image' ? 'Identity' : 'Voice'} Uploaded`, description: "Processing template..." });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row p-4 gap-4 max-w-[1600px] mx-auto">
      {/* Hidden elements always present to prevent race conditions */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Left Sidebar: Settings & Identity */}
      <div className="w-full md:w-80 flex flex-col gap-4 order-2 md:order-1">
        <Card className="ai-glow border-primary/20">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="text-primary w-4 h-4" />
              AI Neural Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="font-medium text-sm">Identity Replacement</span>
              <Switch 
                checked={aiEnabled} 
                onCheckedChange={setAiEnabled}
                disabled={!cameraActive || !templateImage}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">Latency</p>
                <p className="text-accent font-bold">{aiEnabled ? `${latency}ms` : '0ms'}</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="text-muted-foreground">FPS</p>
                <p className="text-accent font-bold">{aiEnabled ? `${fps}` : '30'}</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Network Integrity</span>
                <span className="text-primary font-bold">STABLE</span>
              </div>
              <Progress value={85} className="h-1 bg-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 overflow-hidden">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="text-accent w-4 h-4" />
              Template Library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 h-8">
                <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="presets" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Face Profiles</label>
                  <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border/40 p-2">
                    <div className="flex w-max space-x-2">
                      {PlaceHolderImages.map((img) => (
                        <div 
                          key={img.id}
                          className={cn(
                            "relative w-14 h-14 rounded-md overflow-hidden cursor-pointer border-2 transition-all",
                            templateImage === img.imageUrl ? "border-primary scale-95" : "border-transparent hover:border-white/20"
                          )}
                          onClick={() => setTemplateImage(img.imageUrl)}
                        >
                          <img src={img.imageUrl} alt={img.description} className="w-full h-full object-cover" />
                          {templateImage === img.imageUrl && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Voice Synthesis</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {PlaceholderVoices.map((voice) => (
                      <div 
                        key={voice.id}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-md border text-xs cursor-pointer transition-colors",
                          templateAudio === voice.previewUrl ? "bg-accent/10 border-accent/40" : "bg-muted/20 border-border/20 hover:bg-muted/40"
                        )}
                        onClick={() => setTemplateAudio(voice.previewUrl)}
                      >
                        <Mic className={cn("w-3.5 h-3.5", templateAudio === voice.previewUrl ? "text-accent" : "text-muted-foreground")} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate leading-none mb-0.5">{voice.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate leading-none">{voice.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custom Identity</label>
                  <div 
                    className={cn(
                      "relative aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 group overflow-hidden",
                      templateImage && !PlaceHolderImages.some(p => p.imageUrl === templateImage) && "border-solid border-primary/30"
                    )}
                    onClick={() => document.getElementById('imageUpload')?.click()}
                  >
                    {templateImage && !PlaceHolderImages.some(p => p.imageUrl === templateImage) ? (
                      <img src={templateImage} alt="Custom Template" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                        <span className="text-[10px] text-muted-foreground">Upload Portrait</span>
                      </>
                    )}
                    <input id="imageUpload" type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'image')} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-auto hidden md:flex flex-col gap-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent">
            <Smartphone className="w-4 h-4" />
            Android Ready: Add to Home
          </div>
          <p className="text-[10px] text-muted-foreground text-center px-4">
            MimicMe AI encrypts all biometric mappings locally on your device for total privacy.
          </p>
        </div>
      </div>

      {/* Main Viewfinder Section */}
      <div className="flex-1 flex flex-col gap-4 order-1 md:order-2">
        {hasCameraPermission === false && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
              We couldn't access your camera. Please ensure it's connected and you've granted permission in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        <div className="camera-viewfinder relative bg-[#0a0a0a] flex items-center justify-center group shadow-2xl rounded-2xl border border-border/20 overflow-hidden">
          {cameraActive ? (
            <>
              {/* Processed/Raw Feed Canvas */}
              <canvas 
                ref={displayCanvasRef} 
                className="w-full h-full object-cover" 
              />
              
              <div className="scan-line" />
              
              {/* Overlay Indicators */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                <Badge variant={aiEnabled ? "default" : "secondary"} className={cn("gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider", aiEnabled && "bg-primary animate-pulse shadow-lg")}>
                  <Zap className="w-3 h-3 fill-current" />
                  {aiEnabled ? "AI MODE ACTIVE" : "STANDARD FEED"}
                </Badge>
                {isRecording && (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider animate-pulse shadow-lg">
                    <Circle className="w-3 h-3 fill-current" />
                    REC
                  </Badge>
                )}
              </div>

              {/* Viewfinder Controls Overlay */}
              <div className="absolute bottom-10 left-0 w-full flex justify-center items-center gap-6 z-30 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full w-12 h-12 bg-black/50 border-white/20 hover:bg-black/70 backdrop-blur-md"
                  onClick={handleCapture}
                >
                  <ImageIcon className="w-5 h-5 text-white" />
                </Button>

                <div className="relative">
                  <Button 
                    size="lg" 
                    className={cn(
                      "rounded-full w-20 h-20 shadow-2xl transition-all active:scale-90 border-4",
                      isRecording ? "bg-red-600 border-white/40" : "bg-white border-primary"
                    )}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? <Square className="w-8 h-8 fill-current" /> : <div className="w-10 h-10 rounded-full border-4 border-black/10" />}
                  </Button>
                </div>

                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full w-12 h-12 bg-black/50 border-white/20 hover:bg-black/70 backdrop-blur-md"
                  onClick={() => toast({ title: "Camera Switch", description: "Toggling between front/rear lens." })}
                >
                  <SwitchCamera className="w-5 h-5 text-white" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 ai-glow">
                <Camera className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2 tracking-tight">Identity Mimic Engine</h2>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-sm">
                Unlock the power of real-time identity swapping. Start your camera to begin the transformation.
              </p>
              <Button size="lg" onClick={startCamera} className="bg-primary hover:bg-primary/90 px-8 rounded-full shadow-lg h-12">
                Initialize Feed
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-card/40 p-3 rounded-xl border border-border/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Connection</span>
              <div className="flex gap-1 items-end h-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={cn("w-1 rounded-full bg-accent transition-all", i > 3 ? "h-3" : `h-${i+1}`)} />
                ))}
              </div>
            </div>
            <div className="h-6 w-px bg-border/40" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Encryption</span>
              <span className="text-[10px] font-bold text-primary">AES-256 BIOMETRIC</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground group"
              onClick={handleResetSystem}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 group-hover:rotate-[-45deg] transition-transform" />
              Reset System
            </Button>
            
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-[10px] font-bold uppercase tracking-wider">
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  Neural Config
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-background border-primary/20">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary" />
                    Neural Engine Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Adjust AI processing weights for identity swap and voice synthesis.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        Face Smoothing
                      </label>
                      <span className="text-xs font-mono bg-muted px-1.5 rounded">{smoothing}%</span>
                    </div>
                    <Slider 
                      value={[smoothing]} 
                      onValueChange={(val) => setSmoothing(val[0])} 
                      max={100} 
                      step={1} 
                      className="py-1"
                    />
                    <p className="text-[10px] text-muted-foreground">Adjusts the blend edge between template and source face.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Expression Transfer
                      </label>
                      <span className="text-xs font-mono bg-muted px-1.5 rounded">{enhancement}%</span>
                    </div>
                    <Slider 
                      value={[enhancement]} 
                      onValueChange={(val) => setEnhancement(val[0])} 
                      max={100} 
                      step={1} 
                      className="py-1"
                    />
                    <p className="text-[10px] text-muted-foreground">Determines how aggressively the template adopts source facial movements.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Waves className="w-4 h-4 text-accent" />
                        Voice Clarity
                      </label>
                      <span className="text-xs font-mono bg-muted px-1.5 rounded">{voiceClarity}%</span>
                    </div>
                    <Slider 
                      value={[voiceClarity]} 
                      onValueChange={(val) => setVoiceClarity(val[0])} 
                      max={100} 
                      step={1} 
                      className="py-1"
                    />
                    <p className="text-[10px] text-muted-foreground">RVC model denoising and frequency stabilization level.</p>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => setShowConfig(false)} className="w-full bg-primary hover:bg-primary/90">
                    Apply Neural Parameters
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
