import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Cấu hình worker — bắt buộc phải có, đặt ngoài component
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface OutlineItem {
  title: string;
  pageNumber: number | null;
  items?: OutlineItem[];
}

interface PdfViewerProps {
  fileUrl: string;
  fileName?: string;
  /** Chiều cao vùng xem PDF, mặc định 720px */
  height?: number;
}

function OutlineList({
  items,
  activePage,
  onNavigate,
  depth = 0,
}: {
  items: OutlineItem[];
  activePage: number;
  onNavigate: (page: number) => void;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? 'ml-3 border-l border-gray-100 pl-2' : ''}>
      {items.map((item, idx) => (
        <li key={`${depth}-${idx}-${item.title}`}>
          <button
            type="button"
            disabled={!item.pageNumber}
            onClick={() => item.pageNumber && onNavigate(item.pageNumber)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors truncate ${
              item.pageNumber && activePage === item.pageNumber
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            } ${!item.pageNumber ? 'opacity-40 cursor-default' : ''}`}
            title={item.title}
          >
            {item.title}
          </button>
          {item.items && item.items.length > 0 && (
            <OutlineList items={item.items} activePage={activePage} onNavigate={onNavigate} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PdfViewer({ fileUrl, fileName, height = 720 }: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.1);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineItem[] | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'outline' | 'pages'>('outline');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  // Reset toàn bộ state khi đổi file
  useEffect(() => {
    setPdfDoc(null);
    setNumPages(0);
    setPageNumber(1);
    setError(null);
    setOutline(null);
  }, [fileUrl]);

  async function onDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    setPdfDoc(pdf);
    setNumPages(pdf.numPages);
    setError(null);

    // Lấy mục lục (outline/bookmark) nếu file PDF có khai báo
    try {
      const rawOutline = await pdf.getOutline();
      if (rawOutline && rawOutline.length > 0) {
        const resolved = await resolveOutline(pdf, rawOutline);
        setOutline(resolved);
        setSidebarTab('outline');
      } else {
        setOutline(null);
        setSidebarTab('pages');
      }
    } catch {
      setOutline(null);
      setSidebarTab('pages');
    }
  }

  // Đệ quy chuyển "dest" của từng mục lục thành số trang thật
  async function resolveOutline(pdf: PDFDocumentProxy, items: any[]): Promise<OutlineItem[]> {
    const result: OutlineItem[] = [];
    for (const item of items) {
      let pageNum: number | null = null;
      try {
        let dest = item.dest;
        if (typeof dest === 'string') {
          dest = await pdf.getDestination(dest);
        }
        if (dest && dest[0]) {
          const pageIndex = await pdf.getPageIndex(dest[0]);
          pageNum = pageIndex + 1;
        }
      } catch {
        pageNum = null;
      }
      result.push({
        title: item.title,
        pageNumber: pageNum,
        items: item.items?.length ? await resolveOutline(pdf, item.items) : undefined,
      });
    }
    return result;
  }

  function onDocumentLoadError(err: Error) {
    setError('Không tải được file PDF. Vui lòng thử lại hoặc kiểm tra kết nối.');
  }

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(page, 1), numPages || 1);
      setPageNumber(clamped);
    },
    [numPages]
  );

  function handlePageInputSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) goToPage(parsed);
    else setPageInput(String(pageNumber));
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* ===== TOOLBAR ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title={sidebarOpen ? 'Ẩn mục lục' : 'Hiện mục lục'}
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <div className="h-5 w-px bg-gray-200 mx-1"></div>
          <button
            type="button"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Trang trước"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-10 text-center rounded-md border border-gray-200 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <span className="text-gray-400">/ {numPages || '—'}</span>
          </form>
          <button
            type="button"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber >= numPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Trang sau"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Thu nhỏ"
          >
            <i className="fa-solid fa-magnifying-glass-minus text-xs"></i>
          </button>
          <span className="text-xs text-gray-500 w-11 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s + 0.15, 3))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Phóng to"
          >
            <i className="fa-solid fa-magnifying-glass-plus text-xs"></i>
          </button>
          <div className="h-5 w-px bg-gray-200 mx-1"></div>
          <a
            href={fileUrl}
            download={fileName || true}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Tải xuống"
          >
            <i className="fa-solid fa-download text-xs"></i>
          </a>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
          </button>
        </div>
      </div>

      {/* ===== NỘI DUNG: SIDEBAR + PAGE ===== */}
      <div className="flex" style={{ height: isFullscreen ? 'calc(100vh - 49px)' : height }}>
        {/* SIDEBAR */}
        {sidebarOpen && (
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/40">
            <div className="flex border-b border-gray-100 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSidebarTab('outline')}
                className={`flex-1 py-2.5 transition-colors ${
                  sidebarTab === 'outline' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <i className="fa-solid fa-list mr-1.5"></i>
                Mục lục
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('pages')}
                className={`flex-1 py-2.5 transition-colors ${
                  sidebarTab === 'pages' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <i className="fa-regular fa-images mr-1.5"></i>
                Trang
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {sidebarTab === 'outline' && (
                outline && outline.length > 0 ? (
                  <OutlineList items={outline} activePage={pageNumber} onNavigate={goToPage} />
                ) : (
                  <p className="text-xs text-gray-400 text-center py-6 px-2">
                    File PDF này không có mục lục được khai báo sẵn.
                  </p>
                )
              )}

              {sidebarTab === 'pages' && pdfDoc && (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => goToPage(num)}
                      className={`rounded-lg border overflow-hidden transition-all ${
                        pageNumber === num ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Document file={fileUrl} loading={null} error={null}>
                        <Page pageNumber={num} width={100} renderTextLayer={false} renderAnnotationLayer={false} />
                      </Document>
                      <div
                        className={`text-[11px] text-center py-0.5 ${
                          pageNumber === num ? 'bg-primary/10 text-primary font-medium' : 'text-gray-500'
                        }`}
                      >
                        {num}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto flex items-start justify-center bg-gray-100/60 p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <i className="fa-solid fa-triangle-exclamation text-3xl mb-3 text-red-400"></i>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <i className="fa-solid fa-circle-notch animate-spin text-2xl text-primary mb-3"></i>
                  <p className="text-sm">Đang tải PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer
                className="shadow-md rounded-sm overflow-hidden bg-white"
              />
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}