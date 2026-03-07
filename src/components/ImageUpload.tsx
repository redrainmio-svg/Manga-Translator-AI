import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, FileUp, Scan } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  className?: string;
}

export function ImageUpload({ onImageSelect, className }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageSelect(acceptedFiles[0]);
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1
  } as any);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative group cursor-pointer flex flex-col items-center justify-center w-full h-80 rounded-xl border border-dashed transition-all duration-300 ease-out overflow-hidden",
        isDragActive 
          ? "border-indigo-500 bg-indigo-500/5" 
          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900",
        className
      )}
    >
      <input {...getInputProps()} />
      
      {/* Scanning Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="z-10 flex flex-col items-center gap-5 text-center p-6"
      >
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300 border",
          isDragActive 
            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
            : "bg-zinc-800 border-zinc-700 text-zinc-400 group-hover:text-zinc-200 group-hover:border-zinc-600"
        )}>
          {isDragActive ? <Scan className="w-8 h-8 animate-pulse" /> : <Upload className="w-8 h-8" />}
        </div>
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-zinc-200 tracking-tight">
            {isDragActive ? "INITIALIZING SCAN..." : "UPLOAD EVIDENCE"}
          </p>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
            Drag & drop • Paste (Ctrl+V) • Click
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] text-zinc-600 bg-zinc-950/50 px-3 py-1.5 rounded-full border border-zinc-800 font-mono">
          <ImageIcon className="w-3 h-3" />
          <span>PNG / JPG / WEBP SUPPORTED</span>
        </div>
      </motion.div>
    </div>
  );
}
