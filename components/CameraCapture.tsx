import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileUp, Camera, X, Check, Repeat } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imagesData: string[]) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup stream on unmount
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (files && files.length > 0) {
      const promises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(promises);
      onCapture(results);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const startCamera = async () => {
    try {
      setMode('camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error", err);
      alert("Could not access camera. Please ensure permissions are granted or use file upload.");
      setMode('upload');
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const data = canvas.toDataURL('image/jpeg');
            setCapturedImages(prev => [...prev, data]);
        }
    }
  };

  const finishSession = () => {
      stopCameraStream();
      if (capturedImages.length > 0) {
          onCapture(capturedImages);
      } else {
          setMode('upload');
      }
  };

  const cancelCamera = () => {
      stopCameraStream();
      setCapturedImages([]);
      setMode('upload');
  };

  if (mode === 'camera') {
      return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
              <div className="relative flex-1 bg-black overflow-hidden">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Overlay Controls */}
                  <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
                      <button onClick={cancelCamera} className="text-white p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm">
                          <X className="w-6 h-6" />
                      </button>
                      <div className="bg-black/40 backdrop-blur-sm px-4 py-1 rounded-full text-white text-sm font-medium">
                          {capturedImages.length} Captured
                      </div>
                  </div>
              </div>

              {/* Bottom Controls */}
              <div className="bg-black p-6 pb-12 flex flex-col gap-6">
                  {/* Thumbnails */}
                  {capturedImages.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {capturedImages.map((img, idx) => (
                              <img 
                                key={idx} 
                                src={img} 
                                alt={`Capture ${idx}`} 
                                className="w-16 h-16 object-cover rounded-lg border-2 border-white/20"
                              />
                          ))}
                      </div>
                  )}
                  
                  <div className="flex items-center justify-between px-8">
                      {/* Placeholder for spacing */}
                      <div className="w-12"></div> 

                      {/* Shutter Button */}
                      <button 
                        onClick={takePhoto}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                      >
                          <div className="w-16 h-16 bg-white rounded-full"></div>
                      </button>

                      {/* Finish Button */}
                      <div className="w-12">
                        {capturedImages.length > 0 && (
                            <button 
                                onClick={finishSession}
                                className="w-12 h-12 bg-sage-500 text-white rounded-full flex items-center justify-center hover:bg-sage-400 transition"
                            >
                                <Check className="w-6 h-6" />
                            </button>
                        )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div
      className={`
        flex flex-col items-center justify-center p-12 min-h-[400px]
        border-2 border-dashed rounded-xl transition-all duration-200
        ${isDragging
          ? 'border-sage-500 bg-sage-50 scale-[1.01]'
          : 'border-stone-300 bg-stone-50 hover:bg-stone-100'
        }
      `}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm text-sage-600">
         <Upload className="w-10 h-10" />
      </div>

      <h3 className="text-xl font-serif font-bold text-stone-700 mb-2">
        Upload or Scan Recipes
      </h3>
      <p className="text-stone-500 text-center max-w-sm mb-8">
        Drag and drop files, or use your camera to scan multiple pages quickly.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-md justify-center">
        <label className="
            flex-1 flex items-center justify-center gap-2 bg-white text-stone-700 border border-stone-300 hover:bg-stone-50
            px-6 py-3 rounded-lg cursor-pointer transition-colors font-medium shadow-sm
        ">
            <FileUp className="w-5 h-5" />
            Upload Files
            <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onChange}
            />
        </label>

        <button 
            onClick={startCamera}
            className="
                flex-1 flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-700 text-white
                px-6 py-3 rounded-lg cursor-pointer transition-colors font-medium shadow-sm
            "
        >
            <Camera className="w-5 h-5" />
            Use Camera
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;