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
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { liveIdentitySwap } from '@/ai/flows/live-identity-swap';
import { transformedSelfieCapture } from '@/ai/flows/transformed-selfie-capture';
import { realtimeVoiceConversion } from '@/ai/flows/realtime-voice-conversion';
import { recordTransformedVideo } from '@/ai/flows/transformed-video-recording';

export default function MimicMeDashboard() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [templateAudio, setTemplateAudio] = useState<string | null>(null);
  const [processedFrame, setProcessedFrame] = useState<string | null>(null);
  const [latency, setLatency] = useState(0);
  const [fps, setFps] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(Date.now());

  // Initialize camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 720, height: 1280 },
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Camera Access Error",
        description: "Please allow camera and microphone permissions."
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

  // Process live identity swap frames
  const processFrames = useCallback(async () => {
    if (!aiEnabled || !cameraActive || !videoRef.current || !canvasRef.current || !templateImage) {
      frameIdRef.current = requestAnimationFrame(processFrames);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const frameData = canvas.toDataURL('image/jpeg', 0.6);
      const startTime = performance.now();

      try {
        const result = await liveIdentitySwap({
          cameraFrameDataUri: frameData,
          templateImageDataUri: templateImage,
          faceTrackingData: JSON.stringify({ landmarks: [], headPose: { yaw: 0, pitch: 0, roll: 0 } })
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
        console.error("Frame processing failed", error);
      }
    }

    frameIdRef.current = requestAnimationFrame(processFrames);
  }, [aiEnabled, cameraActive, templateImage]);

  useEffect(() => {
    if (cameraActive) {
      frameIdRef.current = requestAnimationFrame(processFrames);
    } else {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    }
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [cameraActive, processFrames]);

  const handleCapture = async () => {
    if (!templateImage || !cameraActive) return;
    
    try {
      const canvas = canvasRef.current;
      if (!canvas || !videoRef.current) return;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const currentFrame = canvas.toDataURL('image/jpeg');

      toast({ title: "Capturing...", description: "AI is processing your identity." });
      
      const result = await transformedSelfieCapture({
        currentCameraFrame: currentFrame,
        templateIdentityImage: templateImage
      });

      // Simulation of saving photo
      const link = document.createElement('a');
      link.href = result.transformedSelfie;
      link.download = `mimicme_capture_${Date.now()}.png`;
      link.click();

      toast({ title: "Photo Captured!", description: "Saved to your device gallery." });
    } catch (err) {
      toast({ variant: "destructive", title: "Capture Failed", description: "AI processing error." });
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      toast({ title: "Recording Saved", description: "Your transformed video is ready." });
    } else {
      if (!templateImage) {
        toast({ variant: "destructive", title: "Ready Check", description: "Upload a template identity first." });
        return;
      }
      setIsRecording(true);
      toast({ title: "Recording Started", description: "Identity replacement is active." });
      
      // Simulating backend-side recording trigger
      await recordTransformedVideo({
        templateImageId: "user_template_01",
        referenceAudioId: "user_audio_01",
        recordingDurationSeconds: 10
      });
    }
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
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row p-4 gap-4">
      {/* Left Sidebar: Settings & Identity */}
      <div className="w-full md:w-80 flex flex-col gap-4 order-2 md:order-1">
        <Card className="ai-glow border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="text-primary w-5 h-5" />
              AI Mode Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="font-medium text-sm">Identity Replacement</span>
              <Switch 
                checked={aiEnabled} 
                onCheckedChange={setAiEnabled}
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
              <div className="flex justify-between text-xs mb-1">
                <span>Thermal Load</span>
                <span className="text-primary">Low</span>
              </div>
              <Progress value={24} className="h-1 bg-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="text-accent w-5 h-5" />
              Template Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Face Identity</label>
              <div 
                className={cn(
                  "relative aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 group overflow-hidden",
                  templateImage && "border-solid border-primary/30"
                )}
                onClick={() => document.getElementById('imageUpload')?.click()}
              >
                {templateImage ? (
                  <img src={templateImage} alt="Template" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <span className="text-xs text-muted-foreground">Upload Portrait</span>
                  </>
                )}
                <input id="imageUpload" type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'image')} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Voice Identity</label>
              <div 
                className={cn(
                  "p-3 rounded-lg border border-border flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors",
                  templateAudio && "border-accent/40 bg-accent/5"
                )}
                onClick={() => document.getElementById('audioUpload')?.click()}
              >
                <Mic className={cn("w-5 h-5", templateAudio ? "text-accent" : "text-muted-foreground")} />
                <span className="text-xs">{templateAudio ? 'Voice Sample Loaded' : 'Upload Voice Sample'}</span>
                <input id="audioUpload" type="file" accept="audio/*" className="hidden" onChange={(e) => onFileUpload(e, 'audio')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary-foreground/90">
            <ShieldCheck className="w-4 h-4" />
            Identity Masking Active
          </div>
          <p className="text-[10px] text-muted-foreground text-center px-4">
            MimicMe AI generates transformations in real-time. Original data is never stored without consent.
          </p>
        </div>
      </div>

      {/* Main Viewfinder Section */}
      <div className="flex-1 flex flex-col gap-4 order-1 md:order-2">
        <div className="camera-viewfinder relative bg-[#0a0a0a] flex items-center justify-center group shadow-2xl">
          {cameraActive ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={cn("w-full h-full object-cover", aiEnabled ? "opacity-0 absolute" : "opacity-100")} 
              />
              {aiEnabled && processedFrame && (
                <img src={processedFrame} alt="AI Feed" className="w-full h-full object-cover z-10" />
              )}
              {aiEnabled && !processedFrame && (
                <div className="text-center z-10">
                  <Zap className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
                  <p className="text-primary font-bold tracking-widest text-sm uppercase">Initializing Neural Mesh</p>
                </div>
              )}
              <div className="scan-line" />
              
              {/* Overlay Indicators */}
              <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
                <Badge variant={aiEnabled ? "default" : "secondary"} className={cn("gap-1.5 px-3 py-1", aiEnabled && "bg-primary animate-pulse")}>
                  <Zap className="w-3 h-3 fill-current" />
                  {aiEnabled ? "AI MODE ACTIVE" : "REAL-TIME CAMERA"}
                </Badge>
                {isRecording && (
                  <Badge variant="destructive" className="gap-1.5 px-3 py-1 animate-pulse">
                    <Circle className="w-3 h-3 fill-current" />
                    REC
                  </Badge>
                )}
              </div>

              {/* Viewfinder Controls Overlay */}
              <div className="absolute bottom-10 left-0 w-full flex justify-center items-center gap-8 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full w-12 h-12 bg-black/40 border-white/20 hover:bg-black/60"
                  onClick={handleCapture}
                >
                  <ImageIcon className="w-5 h-5 text-white" />
                </Button>

                <div className="relative">
                  <Button 
                    size="lg" 
                    className={cn(
                      "rounded-full w-20 h-20 shadow-2xl transition-transform active:scale-95 border-4",
                      isRecording ? "bg-red-600 border-white/30" : "bg-white border-primary"
                    )}
                    onClick={handleToggleRecording}
                  >
                    {isRecording ? <Square className="w-8 h-8 fill-current" /> : <div className="w-12 h-12 rounded-full border-4 border-black/20" />}
                  </Button>
                </div>

                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full w-12 h-12 bg-black/40 border-white/20 hover:bg-black/60"
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
              <h2 className="text-2xl font-bold mb-2">MimicMe AI</h2>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                Ready to transform your live identity? Enable camera to begin real-time replacement.
              </p>
              <Button size="lg" onClick={startCamera} className="bg-primary hover:bg-primary/90 px-8 rounded-full">
                Activate Camera
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Status & Quick Actions */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-card/40 p-4 rounded-xl border border-border/40">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Network Strength</span>
              <div className="flex gap-1 items-end h-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={cn("w-1 rounded-full bg-accent", i > 3 ? "h-4" : `h-${i+1}`)} />
                ))}
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Privacy Protocol</span>
              <span className="text-xs font-semibold text-primary">On-Device Track</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={stopCamera}>
              <AlertCircle className="w-4 h-4" />
              Stop Feed
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-border/40">
              <Share2 className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              <Settings className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for frame processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}