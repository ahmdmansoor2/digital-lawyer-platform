/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PromoVideoPlayer — مشغل الفيديو التعريفي الشامل لمنصة المحامي الرقمية
 * يقدم شرحاً شاملاً للمنصة يقدمه مستشار قانوني أنيق بالصوت والصورة
 */

import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Sparkles, 
  ArrowRight,
  RotateCcw,
  Film
} from 'lucide-react';

export default function PromoVideoPlayer({ onEnterApp }: { onEnterApp?: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const seekTime = (clickX / width) * videoRef.current.duration;
      videoRef.current.currentTime = seekTime;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-8 relative" id="promo-video-theater">
      
      {/* Background ambient lighting */}
      <div className="absolute inset-0 -top-10 -bottom-10 rounded-3xl blur-3xl bg-indigo-600/25 pointer-events-none" />

      {/* Main Cinema Frame */}
      <div className="relative rounded-3xl border border-white/20 bg-slate-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Top Browser Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/90 border border-rose-400/40" />
            <span className="w-3 h-3 rounded-full bg-amber-500/90 border border-amber-400/40" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/90 border border-emerald-400/40" />
            <div className="flex items-center gap-1.5 ms-3 text-xs font-bold text-slate-300">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>فيديو تعريفي بالمنصة: من الفوضى... إلى السيطرة (100 ثانية)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEnterApp && (
              <button
                onClick={onEnterApp}
                className="btn-shimmer-cta text-xs px-3.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <span>دخول المنصة</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center group">
          
          <video
            ref={videoRef}
            src="/media/promo_video.mp4"
            poster="/images/promo/presenter_talk.jpg"
            preload="metadata"
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-cover"
          />

          {/* Big Center Play Button Overlay (when paused) */}
          {!isPlaying && (
            <div 
              onClick={togglePlay}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 cursor-pointer z-10 transition-all hover:bg-slate-950/30"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/50 transform hover:scale-110 transition-all ring-4 ring-white/20">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-1" />
              </div>
              <div className="text-center px-4">
                <span className="text-sm sm:text-base font-black text-white block drop-shadow-md">
                  مشاهدة الفيديو التعريفي مع الشرح الصوتي 🎙️
                </span>
                <span className="text-xs text-indigo-200 block mt-0.5 font-medium">
                  شرح تفصيلي يقدمه مستشار قانوني لرحلة التحول الرقمي
                </span>
              </div>
            </div>
          )}

          {/* Bottom Video Controls Overlay */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent transition-opacity duration-300 z-20 ${
            isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}>
            
            {/* Progress Bar (Clickable Seek) */}
            <div 
              onClick={handleSeek}
              className="w-full bg-white/20 hover:bg-white/30 rounded-full h-1.5 cursor-pointer mb-3 transition-all"
            >
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-white shadow-md" />
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between text-white text-xs font-bold">
              <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlay} 
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                <button 
                  onClick={handleRestart} 
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
                  title="إعادة من البداية"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button 
                  onClick={toggleMute} 
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  {!isMuted ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
                  <span className="text-[10px] hidden sm:inline">{!isMuted ? 'الصوت مفعّل' : 'صامت'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-300 font-mono hidden sm:inline">
                  جودة 1080p HD
                </span>
                <button 
                  onClick={toggleFullscreen} 
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
                  title="ملء الشاشة"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Footer info pill */}
        <div className="bg-slate-950 p-3 text-center border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-around gap-2">
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>شرح متكامل لبيئة العمل وإدارة ملفات ومكاتب المحاماة في مصر</span>
          </span>
          <a
            href="/media/promo_video.mp4"
            download="Digital_Lawyer_Guide.mp4"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
          >
            📥 تحميل الفيديو (MP4)
          </a>
        </div>

      </div>

    </div>
  );
}
