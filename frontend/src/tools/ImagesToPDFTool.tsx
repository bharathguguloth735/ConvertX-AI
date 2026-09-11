import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileImage, Loader2, Download, ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getDownloadUrlWithToken } from '../utils/downloadHelper';

export const ImagesToPDFTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ download_url: string; size: number; filename?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 20,
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles].slice(0, 20));
      setError(null);
      setResult(null);
    },
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await api.post('/pdf/images-to-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to convert images to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative z-10">
      <div className="max-w-3xl mx-auto">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Image Studio • Lossless PDF</span>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 flex items-center justify-center gap-3 tracking-tight">
            <span className="text-4xl">🖼️</span> Images to <span className="gradient-text">PDF</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">Convert and combine multiple JPG, PNG, or WEBP photos into a high-quality PDF document.</p>
        </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-8">
          {!result ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 hover:border-brand-500'
              }`}
            >
              <input {...getInputProps()} />
              <div className="bg-surface-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-brand-400" />
              </div>
              <p className="text-white font-medium text-lg mb-2">
                {isDragActive ? 'Drop images here' : 'Click or drag images here'}
              </p>
              <p className="text-slate-400 text-sm">JPG, PNG, WEBP up to 20 files</p>
            </div>
          ) : (
            <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileImage className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PDF Ready!</h3>
              <p className="text-slate-400 mb-6">Your images have been combined into a PDF ({(result.size / 1024 / 1024).toFixed(2)} MB).</p>
              <div className="flex justify-center gap-4">
                <a
                  href={getDownloadUrlWithToken(result.download_url, result.filename || 'converted.pdf')}
                  download={result.filename || 'converted.pdf'}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="w-5 h-5" /> Download {result.filename || 'PDF'}
                </a>
                <button
                  onClick={() => {
                    setResult(null);
                    setFiles([]);
                  }}
                  className="btn-secondary"
                >
                  Convert More
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {files.length > 0 && !result && (
            <div className="mt-8">
              <h3 className="text-white font-medium mb-4 flex items-center justify-between">
                Selected Images ({files.length}/20)
                <button onClick={() => setFiles([])} className="text-sm text-red-400 hover:text-red-300">
                  Clear All
                </button>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative group bg-surface-800 rounded-lg p-3 border border-surface-700">
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="w-full h-24 bg-surface-900 rounded-md flex items-center justify-center mb-2 overflow-hidden">
                      <img src={URL.createObjectURL(file)} alt="preview" className="object-cover w-full h-full" />
                    </div>
                    <p className="text-xs text-slate-300 truncate" title={file.name}>
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="btn-primary flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Converting...
                    </>
                  ) : (
                    'Convert to PDF'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

export default ImagesToPDFTool;
