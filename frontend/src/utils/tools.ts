// DocuFlow AI — Tool Definitions (all 50+ tools in one catalog)
import { ToolCard } from '@/types';

export const ALL_TOOLS: ToolCard[] = [
  // Flagship Enterprise Tools
  { id: 'pdf-sign', title: 'Sign & Fill PDF', description: 'Draw, type, or upload signatures and fill interactive PDF forms with cryptographic security', icon: '✍️', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/sign', isNew: true },
  { id: 'pdf-redact', title: 'Redact & Mask PII', description: 'Detect and permanently burn out credit cards, SSN, PAN, Aadhaar, and sensitive data', icon: '🛡️', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/redact', isNew: true },
  { id: 'batch-converter', title: 'Batch File Converter', description: 'Convert up to 50 files simultaneously in parallel and download as a ZIP bundle', icon: '📦', category: 'pdf', acceptedFormats: ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'webp'], route: '/tools/batch-converter', isNew: true },

  // PDF Tools
  { id: 'pdf-to-docx', title: 'PDF to DOCX', description: 'Convert PDF files to editable Word documents', icon: '📄', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/convert?op=to_docx' },
  { id: 'pdf-to-jpg', title: 'PDF to JPG', description: 'Convert PDF pages to high-quality JPG images', icon: '🖼️', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/convert?op=to_jpg' },
  { id: 'pdf-to-txt', title: 'PDF to TXT', description: 'Extract plain text from PDF files', icon: '📝', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/convert?op=to_txt' },
  { id: 'pdf-merge', title: 'PDF Merger', description: 'Combine multiple PDFs into one document', icon: '🔗', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/merge' },
  { id: 'pdf-split', title: 'PDF Splitter', description: 'Split a PDF into separate pages or chunks', icon: '✂️', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/split' },
  { id: 'pdf-compress', title: 'PDF Compressor', description: 'Reduce PDF file size without losing quality', icon: '🗜️', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/compress' },
  { id: 'pdf-rotate', title: 'PDF Rotator', description: 'Rotate pages in your PDF document', icon: '🔄', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/rotate' },
  { id: 'pdf-watermark', title: 'PDF Watermark', description: 'Add text watermarks to PDF pages', icon: '💧', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/watermark' },
  { id: 'docx-to-pdf', title: 'DOCX to PDF', description: 'Convert Word documents to PDF', icon: '📑', category: 'document', acceptedFormats: ['docx', 'doc'], route: '/tools/pdf/convert?op=docx_to_pdf' },
  { id: 'images-to-pdf', title: 'Images to PDF', description: 'Combine images into a single PDF file', icon: '🖼️', category: 'pdf', acceptedFormats: ['jpg', 'jpeg', 'png', 'webp'], route: '/tools/pdf/images-to-pdf' },
  { id: 'pdf-protect', title: 'Protect PDF', description: 'Add a password to encrypt your PDF', icon: '🔒', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/protect' },
  { id: 'pdf-unlock', title: 'Unlock PDF', description: 'Remove password encryption from a PDF', icon: '🔓', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/unlock' },
  { id: 'pdf-extract', title: 'Extract Pages', description: 'Extract specific pages into a new PDF', icon: '📑', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/extract-pages' },
  { id: 'pdf-remove', title: 'Remove Pages', description: 'Delete unwanted pages from a PDF', icon: '🗑️', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/remove-pages' },
  { id: 'pdf-to-md', title: 'PDF to Markdown', description: 'Convert PDF to clean Markdown text', icon: '📝', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/convert?op=to_md' },
  { id: 'pdf-add-page-numbers', title: 'Add Page Numbers', description: 'Add page numbers to your PDF', icon: '🔢', category: 'pdf', acceptedFormats: ['pdf'], route: '/tools/pdf/add-page-numbers' },

  // Image Tools
  { id: 'image-crop', title: 'Image Cropper', description: 'Crop images with custom aspect ratios', icon: '✂️', category: 'image', acceptedFormats: ['jpg', 'jpeg', 'png', 'webp', 'bmp'], route: '/tools/image/crop' },
  { id: 'image-resize', title: 'Image Resizer', description: 'Resize images to any dimension', icon: '📐', category: 'image', acceptedFormats: ['jpg', 'jpeg', 'png', 'webp'], route: '/tools/image/resize' },
  { id: 'image-compress', title: 'Image Compressor', description: 'Compress images to reduce file size', icon: '🗜️', category: 'image', acceptedFormats: ['jpg', 'jpeg', 'png', 'webp'], route: '/tools/image/compress' },
  { id: 'image-convert', title: 'Image Converter', description: 'Convert images between JPG, PNG, WEBP formats', icon: '🔄', category: 'image', acceptedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'], route: '/tools/image/convert' },
  { id: 'image-rotate', title: 'Image Rotator', description: 'Rotate images to any angle', icon: '↩️', category: 'image', acceptedFormats: ['jpg', 'jpeg', 'png', 'webp'], route: '/tools/image/rotate' },

  // Audio Tools
  { id: 'mp3-cutter', title: 'MP3 Cutter', description: 'Cut and trim audio files with precision', icon: '🎵', category: 'audio', acceptedFormats: ['mp3', 'wav', 'aac', 'ogg'], route: '/tools/audio/cut' },
  { id: 'audio-convert', title: 'Audio Converter', description: 'Convert audio between MP3, WAV, AAC formats', icon: '🔊', category: 'audio', acceptedFormats: ['mp3', 'wav', 'aac', 'ogg', 'flac'], route: '/tools/audio/convert' },
  { id: 'audio-compress', title: 'Audio Compressor', description: 'Reduce audio file size', icon: '🗜️', category: 'audio', acceptedFormats: ['mp3', 'wav', 'aac'], route: '/tools/audio/compress' },
  { id: 'extract-audio', title: 'Extract Audio', description: 'Extract audio track from any video file', icon: '🎙️', category: 'audio', acceptedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm'], route: '/tools/audio/extract' },

  // Video Tools
  { id: 'video-cutter', title: 'Video Cutter', description: 'Cut and trim video clips with ease', icon: '🎬', category: 'video', acceptedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm'], route: '/tools/video/cut' },
  { id: 'video-compress', title: 'Video Compressor', description: 'Compress videos to smaller file sizes', icon: '🗜️', category: 'video', acceptedFormats: ['mp4', 'mov', 'avi', 'mkv'], route: '/tools/video/compress' },
  { id: 'video-to-mp3', title: 'Video to MP3', description: 'Extract MP3 audio from video files', icon: '🎵', category: 'video', acceptedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm'], route: '/tools/video/extract-audio' },
  { id: 'video-to-gif', title: 'Video to GIF', description: 'Convert video clips to animated GIFs', icon: '🎆', category: 'video', acceptedFormats: ['mp4', 'mov', 'webm'], route: '/tools/video/to-gif' },

  // OCR & Transcription
  { id: 'ocr', title: 'OCR Text Extractor', description: 'Extract text from scanned PDFs and images', icon: '👁️', category: 'ocr', acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'], route: '/tools/ocr' },
  { id: 'transcribe', title: 'Audio Transcription', description: 'Convert speech to text using Whisper AI', icon: '🎙️', category: 'ai', acceptedFormats: ['mp3', 'wav', 'mp4', 'mov'], route: '/tools/transcribe', isPremium: true },

  // AI Tools
  { id: 'ai-analyzer', title: 'AI Document Analyser', description: 'Split-view document reader, automatic summarizer and Q&A assistant', icon: '✨', category: 'ai', acceptedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'docx', 'txt'], route: '/tools/ai/analyzer', isNew: true },
  { id: 'ai-summarize', title: 'AI Summarizer', description: 'Generate intelligent summaries of any document', icon: '🤖', category: 'ai', acceptedFormats: ['pdf', 'docx', 'txt', 'png', 'jpg'], route: '/tools/ai/summarize' },
  { id: 'ask-document', title: 'Ask Your Document', description: 'Chat with your documents using AI (RAG)', icon: '💬', category: 'ai', acceptedFormats: ['pdf', 'docx', 'txt'], route: '/tools/ai/ask-document', isPremium: true, isNew: true },
  { id: 'invoice-ai', title: 'Invoice AI', description: 'Extract structured data from invoices automatically', icon: '🧾', category: 'ai', acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'], route: '/tools/ai/invoice', isPremium: true, isNew: true },
  { id: 'resume-ai', title: 'Resume AI', description: 'Analyze resumes and match with job descriptions', icon: '📋', category: 'ai', acceptedFormats: ['pdf', 'docx'], route: '/tools/ai/resume', isPremium: true, isNew: true },
  { id: 'ai-translate', title: 'AI Translator', description: 'Translate documents into 10+ languages', icon: '🌐', category: 'ai', acceptedFormats: ['pdf', 'docx', 'txt'], route: '/tools/ai/translate', isPremium: true },
  { id: 'ai-classify', title: 'Document Classifier', description: 'Automatically classify document types with AI', icon: '🏷️', category: 'ai', acceptedFormats: ['pdf', 'docx', 'txt', 'jpg'], route: '/tools/ai/classify', isNew: true },

  // Social Media Tools
  { id: 'instagram-media', title: 'Instagram Media', description: 'Download public Instagram photos, reels, and media legally', icon: '📸', category: 'social', acceptedFormats: ['url'], route: '/tools/social/instagram', isNew: true },
  { id: 'video-url-tools', title: 'Video URL Tools', description: 'Extract and download public social video streams', icon: '📹', category: 'social', acceptedFormats: ['url'], route: '/tools/social/video', isNew: true },
  { id: 'public-media-downloader', title: 'Public Media Downloader', description: 'Analyze and download permitted public social media content', icon: '🌐', category: 'social', acceptedFormats: ['url'], route: '/tools/social/downloader', isNew: true },
];

export const TOOL_CATEGORIES = [
  { id: 'all', label: 'All Tools', icon: '⚡' },
  { id: 'pdf', label: 'PDF', icon: '📄' },
  { id: 'document', label: 'Document', icon: '📝' },
  { id: 'image', label: 'Images', icon: '🖼️' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'social', label: 'Social Media', icon: '📱' },
  { id: 'ai', label: 'AI Tools', icon: '🤖' },
  { id: 'ocr', label: 'OCR', icon: '👁️' },
];

export const searchTools = (query: string): ToolCard[] => {
  if (!query.trim()) return ALL_TOOLS;
  const q = query.toLowerCase();
  return ALL_TOOLS.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.includes(q) ||
      t.acceptedFormats.some((f) => f.includes(q))
  );
};

export const getToolsByCategory = (category: string): ToolCard[] => {
  if (category === 'all') return ALL_TOOLS;
  return ALL_TOOLS.filter((t) => t.category === category);
};

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    period: 'monthly' as const,
    features: [
      { label: '10 conversions / month', included: true },
      { label: '500MB storage', included: true },
      { label: 'PDF tools', included: true },
      { label: 'Image tools', included: true },
      { label: 'AI tools', included: false },
      { label: 'Batch processing', included: false },
      { label: 'Priority support', included: false },
    ],
    limits: { conversions_per_month: 10, storage_gb: 0.5, ai_requests_per_month: 0, max_file_size_mb: 10, batch_processing: false, api_access: false },
  },
  {
    id: 'student',
    name: 'Student',
    price: 99,
    currency: 'INR',
    period: 'monthly' as const,
    features: [
      { label: '100 conversions / month', included: true },
      { label: '5GB storage', included: true },
      { label: 'All file tools', included: true },
      { label: '50 AI requests / month', included: true },
      { label: 'Batch processing', included: false },
      { label: 'Priority support', included: false },
      { label: 'API access', included: false },
    ],
    limits: { conversions_per_month: 100, storage_gb: 5, ai_requests_per_month: 50, max_file_size_mb: 50, batch_processing: false, api_access: false },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    currency: 'INR',
    period: 'monthly' as const,
    features: [
      { label: '1000 conversions / month', included: true },
      { label: '25GB storage', included: true },
      { label: 'All file tools', included: true },
      { label: '500 AI requests / month', included: true },
      { label: 'Batch processing', included: true },
      { label: 'Priority support', included: true },
      { label: 'API access', included: false },
    ],
    limits: { conversions_per_month: 1000, storage_gb: 25, ai_requests_per_month: 500, max_file_size_mb: 200, batch_processing: true, api_access: false },
  },
  {
    id: 'business',
    name: 'Business',
    price: 1999,
    currency: 'INR',
    period: 'monthly' as const,
    features: [
      { label: 'Unlimited conversions', included: true },
      { label: '100GB storage', included: true },
      { label: 'All tools + AI', included: true },
      { label: 'Unlimited AI requests', included: true },
      { label: 'Batch processing', included: true },
      { label: 'Priority support', included: true },
      { label: 'API access', included: true },
    ],
    limits: { conversions_per_month: -1, storage_gb: 100, ai_requests_per_month: -1, max_file_size_mb: 500, batch_processing: true, api_access: true },
  },
];
