// DocuFlow AI — Modern Social Media & Instagram Downloader Page
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Share2, Shield, Lock, Info, ArrowLeft, Download, CheckCircle2,
  AlertCircle, RefreshCw, Film, Image as ImageIcon,
  Music, Clock, Clipboard, X, Play, Copy, ExternalLink,
  Check, Eye, Instagram, Video, Globe, Link2
} from 'lucide-react';
import { socialApi } from '@/api/socialApi';
import { downloadFile } from '@/utils/downloadHelper';
import {
  SocialMediaMetadata,
  SocialMediaDownloadRecord,
  SocialMediaOption,
} from '@/types';

interface SocialMediaToolPageProps {
  presetPlatform?: string;
  presetToolName?: string;
}

export const SocialMediaToolPage: React.FC<SocialMediaToolPageProps> = ({
  presetPlatform = 'instagram',
  presetToolName = 'Instagram Media Downloader',
}) => {
  const [searchParams] = useSearchParams();
  const initialUrl = searchParams.get('url') || '';

  const [platform, setPlatform] = useState<string>(presetPlatform);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeDownloadingId, setActiveDownloadingId] = useState<string | null>(null);

  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null);

  const [metadata, setMetadata] = useState<SocialMediaMetadata | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const [downloadResult, setDownloadResult] = useState<{
    download_url: string;
    filename: string;
    file_size: number;
    expires_at?: string;
  } | null>(null);

  const [history, setHistory] = useState<SocialMediaDownloadRecord[]>([]);

  useEffect(() => {
    fetchHistory();
    if (initialUrl) {
      handleAnalyze(initialUrl);
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const items = await socialApi.getHistory();
      setHistory(items);
    } catch {
      // Guest or silent fail
    }
  };

  const autoDetectPlatform = (url: string) => {
    const clean = url.trim().toLowerCase();
    if (clean.includes('instagram.com') || clean.includes('instagr.am')) {
      setPlatform('instagram');
    } else if (
      clean.includes('youtube.com') ||
      clean.includes('youtu.be') ||
      clean.includes('tiktok.com') ||
      clean.includes('twitter.com') ||
      clean.includes('x.com') ||
      clean.includes('facebook.com') ||
      clean.includes('fb.watch')
    ) {
      setPlatform('video_url');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputUrl(val);
    setMetadata(null);
    setDownloadResult(null);
    setValidationMsg(null);
    setIsValidUrl(null);
    setIsPlayingVideo(false);
    setImageError(false);
    autoDetectPlatform(val);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          setMetadata(null);
          setDownloadResult(null);
          setValidationMsg(null);
          setIsValidUrl(null);
          setIsPlayingVideo(false);
          setImageError(false);
          autoDetectPlatform(text);
          toast.success('Pasted from clipboard!');
          handleAnalyze(text);
        }
      } else {
        toast.error('Clipboard access not permitted in this browser.');
      }
    } catch {
      toast.error('Could not paste from clipboard. Please paste manually.');
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setMetadata(null);
    setDownloadResult(null);
    setValidationMsg(null);
    setIsValidUrl(null);
    setIsPlayingVideo(false);
    setImageError(false);
  };

  const handleAnalyze = async (urlToAnalyze?: string) => {
    const targetUrl = (urlToAnalyze || inputUrl).trim();
    if (!targetUrl) {
      toast.error('Please paste a public Instagram or video link.');
      return;
    }

    setIsAnalyzing(true);
    setValidationMsg(null);
    setMetadata(null);
    setDownloadResult(null);
    setIsPlayingVideo(false);
    setImageError(false);

    try {
      // 1. Validate syntax & platform
      const valRes = await socialApi.validateUrl(targetUrl);
      setIsValidUrl(valRes.valid);
      setValidationMsg(valRes.message);

      if (!valRes.valid) {
        toast.error(valRes.message || 'This URL is not supported.');
        setIsAnalyzing(false);
        return;
      }

      // 2. Fetch authentic metadata & real media streams
      const meta = await socialApi.analyzeUrl(targetUrl, platform);
      setMetadata(meta);
      toast.success('Media loaded successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "We couldn't process this URL. Please verify the link and try again.";
      setValidationMsg(msg);
      setIsValidUrl(false);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDirectDownload = async (option: SocialMediaOption) => {
    if (!metadata) return;

    setActiveDownloadingId(option.id);
    try {
      const res = await socialApi.downloadMedia(metadata.id, option.id);
      setDownloadResult({
        download_url: res.download_url,
        filename: res.filename,
        file_size: res.file_size,
        expires_at: res.expires_at,
      });

      toast.success(`Download ready: ${res.filename}`);
      fetchHistory();

      // Trigger reliable browser download
      await downloadFile(res.download_url, res.filename);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Download failed. Please try again.';
      toast.error(msg);
    } finally {
      setActiveDownloadingId(null);
    }
  };

  const handleCopyCaption = () => {
    if (!metadata?.title) return;
    navigator.clipboard.writeText(metadata.title);
    setCopiedCaption(true);
    toast.success('Caption copied to clipboard!');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Safe thumbnail URL that uses proxy if direct CDN failed
  const getThumbnailSrc = () => {
    if (!metadata?.thumbnail_url) return null;
    if (imageError) {
      return `/api/social/proxy-preview?url=${encodeURIComponent(metadata.thumbnail_url)}`;
    }
    return metadata.thumbnail_url;
  };

  return (
    <div className="min-h-screen text-slate-100 pt-24 pb-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation back */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            100% Free • Safe & Fast
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 mb-4">
            <Share2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 text-white">
            {presetToolName}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Download public Instagram Reels, Videos, Photos & Audio in full HD. Fast, authentic, and high quality.
          </p>
        </div>

        {/* Downloader Main Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl mb-10">
          {/* Step 1: Platform Selection Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8 p-1.5 bg-slate-950/80 rounded-2xl border border-white/10 max-w-xl mx-auto shadow-inner">
            {[
              { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-4 h-4" /> },
              { id: 'video_url', name: 'Public Video URL', icon: <Video className="w-4 h-4" /> },
              { id: 'public_media', name: 'All Downloader', icon: <Globe className="w-4 h-4" /> },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  platform === p.id
                    ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="flex-shrink-0">{p.icon}</span>
                <span className="whitespace-nowrap">{p.name}</span>
              </button>
            ))}
          </div>

          {/* Step 2: URL Input Bar with Paste & Download Buttons */}
          <div className="relative mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-slate-950/90 rounded-2xl border-2 border-slate-800/90 focus-within:border-purple-500/80 focus-within:ring-4 focus-within:ring-purple-500/15 transition-all p-1.5 sm:p-2 shadow-2xl">
              {/* Input field with icon */}
              <div className="flex items-center flex-1 min-w-0 px-3 py-2 sm:py-1">
                <Link2 className="w-5 h-5 text-purple-400/80 mr-3 flex-shrink-0" />
                <input
                  type="url"
                  value={inputUrl}
                  onChange={handleUrlChange}
                  placeholder={
                    platform === 'instagram'
                      ? "Paste Instagram Reel or Post link here..."
                      : "Paste video or public media link here..."
                  }
                  className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none min-w-0"
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
                {inputUrl && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Clear input"
                    className="p-1.5 ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2 sm:mt-0 px-2 sm:px-0 flex-shrink-0">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  title="Paste from clipboard"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold border border-white/10 hover:border-white/20 transition-all flex-shrink-0 shadow-sm"
                >
                  <Clipboard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Paste</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || !inputUrl.trim()}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Validation Feedback */}
            {validationMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 text-xs sm:text-sm flex items-center gap-2 font-medium px-2 ${
                  isValidUrl ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isValidUrl ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {validationMsg}
              </motion.div>
            )}
          </div>

          {/* Quick Features Row */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs text-slate-300 pt-1 pb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/60 border border-white/5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Full HD 1080p MP4
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/60 border border-white/5">
              <Check className="w-3.5 h-3.5 text-purple-400" /> Audio MP3 Extraction
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/60 border border-white/5">
              <Check className="w-3.5 h-3.5 text-cyan-400" /> No Watermark / Original
            </span>
          </div>

          {/* Step 3: Analyzed Media Card & Direct Download Buttons (Like SnapInsta) */}
          <AnimatePresence>
            {metadata && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="mt-8 pt-8 border-t border-white/10"
              >
                <div className="bg-slate-950/80 rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col md:flex-row gap-6 items-start">
                  {/* Left Column: Media Player / Authentic Thumbnail Preview */}
                  <div className="w-full md:w-72 flex-shrink-0">
                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 aspect-[9/14] sm:aspect-square md:aspect-[9/13] flex items-center justify-center shadow-lg group">
                      {/* Video Player or Poster Image */}
                      {isPlayingVideo && metadata.video_preview_url ? (
                        <video
                          controls
                          autoPlay
                          playsInline
                          src={metadata.video_preview_url}
                          className="w-full h-full object-contain bg-black"
                        />
                      ) : (
                        <>
                          {getThumbnailSrc() ? (
                            <img
                              src={getThumbnailSrc()!}
                              alt="Media Preview"
                              referrerPolicy="no-referrer"
                              onError={() => setImageError(true)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-slate-500">
                              <Film className="w-12 h-12 mb-2 text-slate-600" />
                              <span className="text-xs">Public Reel Preview</span>
                            </div>
                          )}

                          {/* Play Overlay if video stream available */}
                          {metadata.video_preview_url && (
                            <button
                              type="button"
                              onClick={() => setIsPlayingVideo(true)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-all group-hover:scale-105"
                            >
                              <div className="w-14 h-14 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                                <Play className="w-6 h-6 fill-slate-900 ml-1" />
                              </div>
                            </button>
                          )}
                        </>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-lg bg-pink-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md">
                          {metadata.media_type === 'reel' ? '🎬 REEL' : metadata.media_type.toUpperCase()}
                        </span>
                        {metadata.duration && (
                          <span className="px-2 py-1 rounded-lg bg-black/70 text-white text-[10px] font-mono backdrop-blur-md">
                            {formatDuration(metadata.duration)}
                          </span>
                        )}
                      </div>

                      {/* Watch Preview Toggle Button */}
                      {metadata.video_preview_url && (
                        <button
                          type="button"
                          onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                          className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-[11px] font-medium backdrop-blur-md flex items-center gap-1 border border-white/10"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isPlayingVideo ? 'Show Poster' : 'Watch Preview'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Information & Download Action Buttons */}
                  <div className="flex-1 min-w-0 w-full">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {metadata.platform}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Public Access Verified
                      </span>
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                        {metadata.author ? metadata.author[0].toUpperCase() : 'U'}
                      </div>
                      <span className="text-sm font-semibold text-slate-200 truncate">
                        {metadata.author || 'Instagram Creator'}
                      </span>
                    </div>

                    {/* Title / Caption */}
                    <div className="bg-slate-900/90 rounded-xl p-3.5 border border-white/5 mb-5 relative group">
                      <p className="text-slate-300 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                        {metadata.title || 'Instagram Public Reel Media'}
                      </p>
                      {metadata.title && (
                        <button
                          type="button"
                          onClick={handleCopyCaption}
                          className="mt-2 text-[11px] text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1"
                        >
                          {copiedCaption ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Caption
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Download Buttons Section (SnapInsta Style) */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Download className="w-4 h-4 text-purple-400" /> Choose Download Format
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {metadata.options.length} Options Available
                        </span>
                      </div>

                      {/* Download Buttons Grid */}
                      <div className="space-y-2.5">
                        {metadata.options.map((opt) => {
                          const isDownloading = activeDownloadingId === opt.id;
                          const isVideo = opt.media_type === 'video';
                          const isAudio = opt.media_type === 'audio';

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleDirectDownload(opt)}
                              disabled={Boolean(activeDownloadingId)}
                              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all transform active:scale-[0.99] ${
                                isVideo
                                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-600/20 border border-blue-400/30'
                                  : isAudio
                                  ? 'bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white shadow-md border border-purple-400/30'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10'
                              } disabled:opacity-60`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-black/25 flex items-center justify-center">
                                  {isVideo ? (
                                    <Film className="w-4 h-4 text-cyan-300" />
                                  ) : isAudio ? (
                                    <Music className="w-4 h-4 text-pink-300" />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-emerald-300" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="font-bold flex items-center gap-2">
                                    {opt.label}
                                    {isVideo && (
                                      <span className="bg-cyan-400/20 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                                        HD
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] opacity-80 uppercase font-mono">
                                    {opt.format} • {opt.quality}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {opt.file_size_approx && (
                                  <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded">
                                    ~{formatBytes(opt.file_size_approx)}
                                  </span>
                                )}
                                <div className="p-2 rounded-lg bg-white/10">
                                  {isDownloading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Download Another Video Quick Reset */}
                      <div className="mt-4 flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={handleClear}
                          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 py-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Download Another Video
                        </button>

                        <a
                          href={metadata.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                        >
                          View on Instagram <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Download Ready Banner */}
                      {downloadResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xl"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-white truncate">{downloadResult.filename}</p>
                              <p className="text-xs text-emerald-300 font-mono">
                                Downloaded ({formatBytes(downloadResult.file_size)})
                              </p>
                            </div>
                          </div>

                          <a
                            href={downloadResult.download_url}
                            download={downloadResult.filename}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex-shrink-0 flex items-center gap-1.5 shadow-md"
                          >
                            <Download className="w-3.5 h-3.5" /> Save Again
                          </a>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Download History Section */}
        {history.length > 0 && (
          <div className="bg-slate-900/60 rounded-3xl p-6 border border-white/10 mb-10">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" /> Recent Downloads
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Media Title</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 uppercase font-mono text-xs text-purple-400 font-bold">
                        {h.platform}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-200">
                        {h.title || h.source_url}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-xs">
                        {formatBytes(h.file_size)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {h.download_url ? (
                          <a
                            href={h.download_url}
                            download
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs">Expired</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3-Step How It Works Guide (SnapInsta Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 font-black text-sm flex items-center justify-center mx-auto mb-3 border border-pink-500/20">
              1
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Copy Link</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Open Instagram, find the public Reel or video, and copy the link from the share menu.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 font-black text-sm flex items-center justify-center mx-auto mb-3 border border-purple-500/20">
              2
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Paste & Analyze</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Paste the link into the box above and click Download to retrieve HD media options.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
              3
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Save in HD</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Click Download Video (MP4) or Audio (MP3) to save the file directly to your device.
            </p>
          </div>
        </div>

        {/* Safety & Compliance Notice Box */}
        <div className="rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 text-amber-200/90 text-xs leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Important Notice:</span> This tool strictly accesses publicly available content. Private accounts and DRM-protected media are not accessed. Always respect content creators' rights when downloading and sharing media.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaToolPage;
