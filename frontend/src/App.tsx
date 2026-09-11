import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import LandingPage from '@/pages/LandingPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import {
  DashboardLayout,
  DashboardOverview,
  MyFilesPage,
} from '@/pages/DashboardPage';
import { FileFlowBackground } from '@/components/FileFlowBackground';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GuestSessionModal } from '@/components/GuestSessionModal';

// ─── Code-Split Lazy Loaded Tools & Pages ─────────────────────────────────────
const AllToolsPage = React.lazy(() => import('@/pages/AllToolsPage'));

const PDFCompressTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFCompressTool })));
const ImageCropTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.ImageCropTool })));
const ImageCompressorTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.ImageCompressorTool })));
const ImageConverterTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.ImageConverterTool })));
const ImageResizeTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.ImageResizeTool })));
const ImageRotateTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.ImageRotateTool })));
const MP3CutterTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.MP3CutterTool })));
const AudioConverterTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.AudioConverterTool })));
const AudioCompressTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.AudioCompressTool })));
const VideoCutterTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.VideoCutterTool })));
const VideoToMP3Tool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.VideoToMP3Tool })));
const VideoCompressTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.VideoCompressTool })));
const OCRTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.OCRTool })));
const PDFConvertTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFConvertTool })));
const PDFProtectTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFProtectTool })));
const PDFUnlockTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFUnlockTool })));
const PDFExtractPagesTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFExtractPagesTool })));
const PDFRemovePagesTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFRemovePagesTool })));
const PDFAddPageNumbersTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFAddPageNumbersTool })));
const PDFSplitTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFSplitTool })));
const PDFRotateTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFRotateTool })));
const PDFWatermarkTool = React.lazy(() => import('@/tools/FileToolPage').then(m => ({ default: m.PDFWatermarkTool })));

const PDFMergerTool = React.lazy(() => import('@/tools/PDFMergerTool'));
const ImagesToPDFTool = React.lazy(() => import('@/tools/ImagesToPDFTool'));

const PDFSignatureStudioPage = React.lazy(() => import('@/tools/PDFSignatureStudioPage').then(m => ({ default: m.PDFSignatureStudioPage })));
const PDFRedactStudioPage = React.lazy(() => import('@/tools/PDFRedactStudioPage').then(m => ({ default: m.PDFRedactStudioPage })));
const BatchConverterPage = React.lazy(() => import('@/tools/BatchConverterPage').then(m => ({ default: m.BatchConverterPage })));

const InvoiceAIPage = React.lazy(() => import('@/pages/AIToolsPages').then(m => ({ default: m.InvoiceAIPage })));
const ResumeAIPage = React.lazy(() => import('@/pages/AIToolsPages').then(m => ({ default: m.ResumeAIPage })));
const AITranslatorPage = React.lazy(() => import('@/pages/AIToolsPages').then(m => ({ default: m.AITranslatorPage })));
const AIDocumentAnalyzerPage = React.lazy(() => import('@/pages/AIDocumentAnalyzerPage').then(m => ({ default: m.AIDocumentAnalyzerPage })));

const SocialMediaToolPage = React.lazy(() => import('@/tools/SocialMediaToolPage'));
const AdminPage = React.lazy(() => import('@/pages/AdminPage'));
const SubscriptionPage = React.lazy(() => import('@/pages/SubscriptionPage'));

const AboutPage = React.lazy(() => import('@/pages/CompanyPages').then(m => ({ default: m.AboutPage })));
const BlogPage = React.lazy(() => import('@/pages/CompanyPages').then(m => ({ default: m.BlogPage })));
const PricingPage = React.lazy(() => import('@/pages/CompanyPages').then(m => ({ default: m.PricingPage })));
const ContactPage = React.lazy(() => import('@/pages/CompanyPages').then(m => ({ default: m.ContactPage })));
const ApiDocsPage = React.lazy(() => import('@/pages/CompanyPages').then(m => ({ default: m.ApiDocsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Auth Guard (Only for Dashboard) ──────────────────────────────────────────

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ─── PDF Convert Wrapper ──────────────────────────────────────────────────────

const PDFConvertWrapper: React.FC = () => {
  const [searchParams] = useSearchParams();
  const op = searchParams.get('op') || 'to_docx';
  return <PDFConvertTool operation={op} />;
};

// ─── Loading Spinner ──────────────────────────────────────────────────────────

const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
  </div>
);

// The public marketing chrome must not wrap authenticated workspaces.
// Dashboard and admin have their own navigation and full-height layouts.
const SiteChrome: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) return null;
  return <>
    <FileFlowBackground />
    <Navbar />
    <GuestSessionModal />
  </>;
};

const SiteFooter: React.FC = () => {
  const { pathname } = useLocation();
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin') ? null : <Footer />;
};

// ─── Scroll to top on route change ───────────────────────────────────────────
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
};

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <SiteChrome />
        <main className="relative z-10 min-h-screen">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Home & Public Auth Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />

              {/* Tools Catalog */}
              <Route path="/tools" element={<Suspense fallback={<PageLoader />}><AllToolsPage /></Suspense>} />
              
              {/* PDF Tools */}
              <Route path="/tools/pdf/sign" element={<PDFSignatureStudioPage />} />
              <Route path="/tools/pdf/redact" element={<PDFRedactStudioPage />} />
              <Route path="/tools/batch-converter" element={<BatchConverterPage />} />
              <Route path="/batch-converter" element={<BatchConverterPage />} />
              <Route path="/tools/pdf/convert" element={<PDFConvertWrapper />} />
              <Route path="/tools/pdf/compress" element={<PDFCompressTool />} />
              <Route path="/tools/pdf/merge" element={<PDFMergerTool />} />
              <Route path="/tools/pdf/split" element={<PDFSplitTool />} />
              <Route path="/tools/pdf/rotate" element={<PDFRotateTool />} />
              <Route path="/tools/pdf/watermark" element={<PDFWatermarkTool />} />
              <Route path="/tools/pdf/protect" element={<PDFProtectTool />} />
              <Route path="/tools/pdf/unlock" element={<PDFUnlockTool />} />
              <Route path="/tools/pdf/extract-pages" element={<PDFExtractPagesTool />} />
              <Route path="/tools/pdf/remove-pages" element={<PDFRemovePagesTool />} />
              <Route path="/tools/pdf/add-page-numbers" element={<PDFAddPageNumbersTool />} />
              <Route path="/tools/pdf/images-to-pdf" element={<ImagesToPDFTool />} />
              
              {/* Image Tools */}
              <Route path="/tools/image/convert" element={<ImageConverterTool />} />
              <Route path="/tools/image/crop" element={<ImageCropTool />} />
              <Route path="/tools/image/resize" element={<ImageResizeTool />} />
              <Route path="/tools/image/rotate" element={<ImageRotateTool />} />
              <Route path="/tools/image/compress" element={<ImageCompressorTool />} />

              {/* Audio & Video Tools */}
              <Route path="/tools/audio/cut" element={<MP3CutterTool />} />
              <Route path="/tools/audio/convert" element={<AudioConverterTool />} />
              <Route path="/tools/audio/compress" element={<AudioCompressTool />} />
              <Route path="/tools/video/cut" element={<VideoCutterTool />} />
              <Route path="/tools/video/extract-audio" element={<VideoToMP3Tool />} />
              <Route path="/tools/video/compress" element={<VideoCompressTool />} />

              {/* OCR & AI Tools */}
              <Route path="/tools/ocr" element={<OCRTool />} />
              <Route path="/tools/ai/analyzer" element={<AIDocumentAnalyzerPage />} />
              <Route path="/ai-analyser" element={<AIDocumentAnalyzerPage />} />
              <Route path="/ai-analyzer" element={<AIDocumentAnalyzerPage />} />
              <Route path="/tools/ai/summarize" element={<AIDocumentAnalyzerPage initialMode="summarize" />} />
              <Route path="/tools/ai/ask-document" element={<AIDocumentAnalyzerPage initialMode="chat" />} />
              <Route path="/tools/ai/invoice" element={<InvoiceAIPage />} />
              <Route path="/tools/ai/resume" element={<ResumeAIPage />} />
              <Route path="/tools/ai/translate" element={<AITranslatorPage />} />
              <Route path="/tools/ai" element={<AIDocumentAnalyzerPage />} />

              {/* Company Pages */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/docs" element={<ApiDocsPage />} />
              <Route path="/api-docs" element={<ApiDocsPage />} />

              {/* Social Media Tools */}
              <Route path="/tools/social/instagram" element={<SocialMediaToolPage presetPlatform="instagram" presetToolName="Instagram Media Downloader" />} />
              <Route path="/tools/social/video" element={<SocialMediaToolPage presetPlatform="video_url" presetToolName="Video URL Tools" />} />
              <Route path="/tools/social/downloader" element={<SocialMediaToolPage presetPlatform="public_media" presetToolName="Public Media Downloader" />} />
              <Route path="/tools/social" element={<SocialMediaToolPage presetPlatform="instagram" presetToolName="Social Media Downloader" />} />

              {/* Protected Dashboard */}
              <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
                <Route index element={<DashboardOverview />} />
                <Route path="files" element={<MyFilesPage />} />
                <Route path="history" element={<MyFilesPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="*" element={<DashboardOverview />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <SiteFooter />

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(59, 91, 252, 0.2)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#022c22' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#2d0a0a' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
