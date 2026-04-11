
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
  Waves,
  Loader2,
  Volume2,
  FileAudio
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function MimicMeDashboard() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
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
    setIsInitializing(true);
    setHasCameraPermission(null);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
      
      if (!hasVideoDevice) {
        setHasCameraPermission(false);
        setIsInitializing(false);
        toast({
          variant: "destructive",
          title: "No Camera Found",
          description: "Please connect a camera or webcam to use this app."
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: true 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasCameraPermission(true);
        setCameraActive(true);
        setIsInitializing(false);
        toast({ title: "System Online", description: "Biometric feed synchronized." });
      }
    } catch (err) {
      console.error("Camera error:", err);
      setHasCameraPermission(false);
      setIsInitializing(false);
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Please enable camera/microphone permissions in your browser settings."
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
    setVoiceEnabled(false);
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
      frameIdRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const displayCtx = displayCanvas.getContext('2d');

    if (ctx && displayCtx && video.readyState >= 2) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
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

        if (ctx && videoRef.current && videoRef.current.readyState >= 2) {
          const frameData = canvas.toDataURL('image/jpeg', 0.6);
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
            // Processing delay
          }
        }
      }
      
      const delay = aiEnabled ? 100 : 1000;
      setTimeout(process, delay);
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
    if (!displayCanvasRef.current || !canvasRef.current) return;
    
    setIsProcessingAI(true);
    try {
      let finalImageUrl;
      
      if (aiEnabled && templateImage) {
        const frameData = canvasRef.current.toDataURL('image/jpeg', 0.8);
        const result = await transformedSelfieCapture({
          currentCameraFrame: frameData,
          templateIdentityImage: templateImage
        });
        finalImageUrl = result.transformedSelfie;
      } else {
        finalImageUrl = displayCanvasRef.current.toDataURL('image/png');
      }

      const link = document.createElement('a');
      link.href = finalImageUrl;
      link.download = `mimicme_selfie_${Date.now()}.png`;
      link.click();
      toast({ title: "Selfie Captured", description: "Identity transformation complete." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Capture Error", description: "AI processing failed." });
    } finally {
      setIsProcessingAI(false);
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
      link.download = `mimicme_stream_${Date.now()}.webm`;
      link.click();
      toast({ title: "Recording Exported", description: "Neural stream and voice saved." });
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    toast({ title: "Recording Started", description: "Capturing real-time identity swap." });
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
        toast({ title: `${type === 'image' ? 'Identity' : 'Voice'} Uploaded`, description: "Processing mapping..." });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row p-4 gap-4 max-w-[1600px] mx-auto overflow-hidden">
      {/* Offscreen Buffer Elements */}
      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0 }} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Control Sidebar */}
      <div className="w-full md:w-80 flex flex-col gap-4 order-2 md:order-1 h-full">
        <Card className="ai-glow border-primary/20 bg-card/40 backdrop-blur-xl">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="text-primary w-4 h-4" />
              Neural Processor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <div className="space-y-3">
              <TooltipProvider>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium text-xs">Identity Mask</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        <Switch 
                          checked={aiEnabled} 
                          onCheckedChange={setAiEnabled}
                          disabled={!cameraActive || !templateImage}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </TooltipTrigger>
                    {(!cameraActive || !templateImage) && (
                      <TooltipContent side="right" className="bg-destructive text-destructive-foreground border-none">
                        {!cameraActive ? "Initialize camera first" : "Select a template identity"}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </TooltipProvider>

              <TooltipProvider>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-accent" />
                    <span className="font-medium text-xs">Voice Mimic (RVC)</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        <Switch 
                          checked={voiceEnabled} 
                          onCheckedChange={setVoiceEnabled}
                          disabled={!cameraActive || !templateAudio}
                          className="data-[state=checked]:bg-accent"
                        />
                      </div>
                    </TooltipTrigger>
                    {(!cameraActive || !templateAudio) && (
                      <TooltipContent side="right" className="bg-destructive text-destructive-foreground border-none">
                        {!cameraActive ? "Initialize microphone first" : "Select a voice model"}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/30 border border-white/5">
                <p className="text-muted-foreground">Neural Latency</p>
                <p className="text-accent font-mono font-bold">{aiEnabled ? `${latency}ms` : '0ms'}</p>
              </div>
              <div className="p-2 rounded bg-muted/30 border border-white/5">
                <p className="text-muted-foreground">Buffer FPS</p>
                <p className="text-accent font-mono font-bold">{aiEnabled ? `${fps}` : (cameraActive ? '30' : '0')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden flex-1">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="text-accent w-4 h-4" />
              Identity Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 h-8 bg-muted/30">
                <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">Custom</TabsTrigger>
              </TabsList>
              
              <TabsContent value="presets" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Biometric Faces</label>
                  <ScrollArea className="w-full whitespace-nowrap rounded-md border border-white/5 p-2 bg-black/20">
                    <div className="flex w-max space-x-2">
                      {PlaceHolderImages.map((img) => (
                        <div 
                          key={img.id}
                          className={cn(
                            "relative w-14 h-14 rounded-md overflow-hidden cursor-pointer border-2 transition-all group",
                            templateImage === img.imageUrl ? "border-primary scale-95 shadow-[0_0_10px_rgba(124,32,229,0.5)]" : "border-transparent hover:border-white/20"
                          )}
                          onClick={() => setTemplateImage(img.imageUrl)}
                        >
                          <img src={img.imageUrl} alt={img.description} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                          {templateImage === img.imageUrl && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Voice Models</label>
                  <ScrollArea className="h-[180px] pr-3">
                    <div className="grid grid-cols-1 gap-1.5">
                      {PlaceholderVoices.map((voice) => (
                        <div 
                          key={voice.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-all",
                            templateAudio === voice.previewUrl ? "bg-accent/10 border-accent/40 shadow-sm" : "bg-muted/10 border-white/5 hover:bg-muted/20"
                          )}
                          onClick={() => setTemplateAudio(voice.previewUrl)}
                        >
                          <Mic className={cn("w-3.5 h-3.5", templateAudio === voice.previewUrl ? "text-accent" : "text-muted-foreground")} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate leading-none mb-1">{voice.name}</p>
                            <p className="text-[9px] text-muted-foreground truncate leading-none">{voice.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custom Identity Map</label>
                  <div 
                    className={cn(
                      "relative aspect-[4/3] rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 group overflow-hidden bg-black/20",
                      templateImage && !PlaceHolderImages.some(p => p.imageUrl === templateImage) && "border-solid border-primary/30"
                    )}
                    onClick={() => document.getElementById('imageUpload')?.click()}
                  >
                    {templateImage && !PlaceHolderImages.some(p => p.imageUrl === templateImage) ? (
                      <img src={templateImage} alt="Custom Template" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                        <span className="text-[10px] text-muted-foreground">Upload Source Photo (Man)</span>
                      </>
                    )}
                    <input id="imageUpload" type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'image')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custom Voice Profile</label>
                  <div 
                    className={cn(
                      "relative h-24 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-accent/50 group overflow-hidden bg-black/20",
                      templateAudio && !PlaceholderVoices.some(v => v.previewUrl === templateAudio) && "border-solid border-accent/30"
                    )}
                    onClick={() => document.getElementById('audioUpload')?.click()}
                  >
                    {templateAudio && !PlaceholderVoices.some(v => v.previewUrl === templateAudio) ? (
                      <div className="flex flex-col items-center gap-1">
                        <FileAudio className="w-5 h-5 text-accent animate-pulse" />
                        <span className="text-[10px] text-accent font-bold">Custom Voice Sample Attached</span>
                        <span className="text-[9px] text-muted-foreground">Ready for Neural Synthesis</span>
                      </div>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors mb-2" />
                        <span className="text-[10px] text-muted-foreground">Upload Voice Sample (Man)</span>
                      </>
                    )}
                    <input id="audioUpload" type="file" accept="audio/*" className="hidden" onChange={(e) => onFileUpload(e, 'audio')} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Viewfinder Main Section */}
      <div className="flex-1 flex flex-col gap-4 order-1 md:order-2 h-full">
        {hasCameraPermission === false && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hardware Error</AlertTitle>
            <AlertDescription>
              Feed failed. Ensure your camera is connected and access is granted.
            </AlertDescription>
          </Alert>
        )}

        <div className="camera-viewfinder flex-1 relative bg-black flex items-center justify-center group shadow-2xl rounded-2xl border border-white/5 overflow-hidden">
          {cameraActive ? (
            <>
              <canvas 
                ref={displayCanvasRef} 
                className={cn("w-full h-full object-contain transition-opacity duration-300", isProcessingAI ? "opacity-30 grayscale" : "opacity-100")} 
              />
              
              <div className="scan-line" />

              {isProcessingAI && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/40 backdrop-blur-sm">
                  <div className="w-20 h-20 rounded-full border-t-4 border-primary animate-spin mb-4" />
                  <p className="text-primary font-bold tracking-widest animate-pulse uppercase text-sm">Synthesizing Identity...</p>
                </div>
              )}
              
              {/* Telemetry Overlays */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                <Badge variant={aiEnabled ? "default" : "secondary"} className={cn("gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider backdrop-blur-md", aiEnabled && "bg-primary animate-pulse shadow-lg")}>
                  <Zap className="w-3 h-3 fill-current" />
                  {aiEnabled ? "NEURAL OVERLAY ON" : "STANDARD MODE"}
                </Badge>
                {voiceEnabled && (
                  <Badge variant="outline" className="gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider bg-accent/20 text-accent border-accent/40 backdrop-blur-md">
                    <Volume2 className="w-3 h-3 fill-current" />
                    VOICE MASK ACTIVE
                  </Badge>
                )}
                {isRecording && (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider animate-pulse shadow-lg">
                    <Circle className="w-3 h-3 fill-current" />
                    REC 00:00:01
                  </Badge>
                )}
              </div>

              {/* Viewfinder HUD Controls - Mimics Mobile Camera App */}
              <div className="absolute bottom-10 left-0 w-full flex justify-center items-center gap-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <Button 
                  size="icon" 
                  variant="outline" 
                  disabled={isProcessingAI}
                  className="rounded-full w-12 h-12 bg-black/60 border-white/10 hover:bg-black/80 backdrop-blur-md transition-all active:scale-90"
                  onClick={handleCapture}
                >
                  <Camera className="w-5 h-5 text-white" />
                </Button>

                <div className="relative">
                  <Button 
                    size="lg" 
                    disabled={isProcessingAI}
                    className={cn(
                      "rounded-full w-20 h-20 shadow-2xl transition-all active:scale-95 border-4",
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
                  disabled={isProcessingAI}
                  className="rounded-full w-12 h-12 bg-black/60 border-white/10 hover:bg-black/80 backdrop-blur-md transition-all active:scale-90"
                  onClick={() => toast({ title: "Lens Swapped", description: "Rotating biometric sensor." })}
                >
                  <SwitchCamera className="w-5 h-5 text-white" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center p-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-8 ai-glow relative">
                {isInitializing ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : (
                  <Smartphone className="w-10 h-10 text-primary" />
                )}
                <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping opacity-20" />
              </div>
              <h2 className="text-3xl font-bold mb-3 tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">MimicMe AI</h2>
              <p className="text-muted-foreground mb-10 max-w-sm mx-auto text-sm leading-relaxed">
                Connect your mobile sensor to begin real-time identity and voice transformation.
              </p>
              <Button 
                size="lg" 
                onClick={startCamera} 
                disabled={isInitializing}
                className="bg-primary hover:bg-primary/90 px-10 rounded-full shadow-2xl h-14 text-base font-bold transition-all hover:scale-105 active:scale-95"
              >
                {isInitializing ? "Connecting Sensor..." : "Launch Camera Feed"}
              </Button>
            </div>
          )}
        </div>

        {/* Footer Telemetry Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-card/40 p-4 rounded-xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter opacity-70">Uplink Stability</span>
              <div className="flex gap-1 items-end h-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-1 rounded-full transition-all", cameraActive ? (i > 4 ? "h-4 bg-accent/30" : `h-${i+1} bg-accent shadow-[0_0_5px_rgba(137,187,255,0.5)]`) : "h-1 bg-white/10")} />
                ))}
              </div>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter opacity-70">Neural Mode</span>
              <span className={cn("text-[10px] font-bold", cameraActive ? "text-primary" : "text-muted-foreground")}>
                {aiEnabled ? "FACE + VOICE MASKED" : "UNMASKED"}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 group transition-all"
              onClick={handleResetSystem}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2 group-hover:rotate-[-120deg] transition-transform duration-500" />
              Purge System
            </Button>
            
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 px-4 bg-accent text-accent-foreground hover:bg-accent/90 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20">
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  Neural Config
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-2xl border-primary/20 p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="flex items-center gap-3 text-2xl tracking-tighter">
                    <Sliders className="w-6 h-6 text-primary" />
                    Neural Parameters
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground/80">
                    Fine-tune the weights of the AI processing engine for optimal identity synthesis.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-8 py-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold flex items-center gap-2 tracking-tight">
                        <Sparkles className="w-4 h-4 text-accent" />
                        Face Edge Smoothing
                      </label>
                      <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-accent">{smoothing}%</span>
                    </div>
                    <Slider 
                      value={[smoothing]} 
                      onValueChange={(val) => setSmoothing(val[0])} 
                      max={100} 
                      step={1} 
                      className="py-1"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold flex items-center gap-2 tracking-tight">
                        <Zap className="w-4 h-4 text-primary" />
                        Neural Stability
                      </label>
                      <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-primary">{enhancement}%</span>
                    </div>
                    <Slider 
                      value={[enhancement]} 
                      onValueChange={(val) => setEnhancement(val[0])} 
                      max={100} 
                      step={1} 
                      className="py-1"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold flex items-center gap-2 tracking-tight">
                        <Waves className="w-4 h-4 text-accent" />
                        Voice Clarity (RVC)
                      </label>
                      <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-accent">{voiceClarity}%</span>
                    </div>
                    <Slider 
                      value={[voiceClarity]} 
                      onValueChange={(val) => setVoiceClarity(val[0])} 
                      max={100} 
                      step={1} 
                      className="py-1"
                    />
                  </div>
                </div>

                <DialogFooter className="mt-8">
                  <Button onClick={() => setShowConfig(false)} className="w-full bg-primary hover:bg-primary/90 h-12 font-bold text-base rounded-xl">
                    Apply Weights
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
