import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="nf-root">
      <div className="nf-radar" aria-hidden="true">
        <div className="nf-ring nf-ring--1" />
        <div className="nf-ring nf-ring--2" />
        <div className="nf-ring nf-ring--3" />
        <div className="nf-sweep" />
        <div className="nf-blip" />
      </div>

      <div className="nf-content">
        <span className="nf-eyebrow">Không có tín hiệu</span>
        <h1 className="nf-code">404</h1>
        <p className="nf-title">Không tìm thấy đường dẫn này</p>
        <p className="nf-desc">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>

        <div className="nf-path">
          <span className="nf-path-label">Đường dẫn</span>
          <code className="nf-path-value">{location.pathname}</code>
        </div>

        <Link to="/" className="nf-button">
          Về trang chủ
        </Link>
      </div>

      <style>{`
        .nf-root {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 40px;
          background: radial-gradient(circle at 50% 35%, #16212c 0%, #0e1620 55%, #0a0f16 100%);
          color: #e7edf3;
          font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
          padding: 32px;
          overflow: hidden;
          box-sizing: border-box;
        }

        .nf-radar {
          position: relative;
          width: 220px;
          height: 220px;
          flex-shrink: 0;
        }

        .nf-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(59, 130, 246, 0.18);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .nf-ring--1 { width: 220px; height: 220px; }
        .nf-ring--2 { width: 148px; height: 148px; }
        .nf-ring--3 { width: 76px; height: 76px; border-color: rgba(59, 130, 246, 0.28); }

        .nf-sweep {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 110px;
          height: 110px;
          transform-origin: 0% 0%;
          background: conic-gradient(from 0deg, rgba(59, 130, 246, 0.55), rgba(59, 130, 246, 0) 28%);
          border-radius: 0 100% 0 0;
          animation: nf-spin 3.2s linear infinite;
          mix-blend-mode: screen;
        }

        .nf-blip {
          position: absolute;
          top: 32%;
          left: 62%;
          width: 8px;
          height: 8px;
          margin: -4px 0 0 -4px;
          border-radius: 50%;
          background: #3B82F6;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6);
          animation: nf-blip 2.4s ease-out infinite;
        }

        @keyframes nf-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes nf-blip {
          0%   { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.55); opacity: 1; }
          70%  { box-shadow: 0 0 0 22px rgba(59, 130, 246, 0); opacity: 0.6; }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); opacity: 1; }
        }

        .nf-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 440px;
        }

        .nf-eyebrow {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #3B82F6;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .nf-code {
          font-size: 84px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
          background: linear-gradient(180deg, #f4f6f8 0%, #9aa7b3 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .nf-title {
          font-size: 19px;
          font-weight: 600;
          margin: 0 0 8px;
          color: #f1f5f8;
        }

        .nf-desc {
          font-size: 14px;
          line-height: 1.6;
          color: #8996a3;
          margin: 0 0 28px;
        }

        .nf-path {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px 16px;
          margin-bottom: 28px;
          max-width: 100%;
        }

        .nf-path-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #647080;
          flex-shrink: 0;
        }

        .nf-path-value {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 13px;
          color: #3B82F6;
          overflow-wrap: anywhere;
        }

        .nf-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 28px;
          border-radius: 8px;
          background: #3B82F6;
          color: #ffffff;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
        }

        .nf-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
        }

        .nf-button:focus-visible {
          outline: 2px solid #3B82F6;
          outline-offset: 3px;
        }

        @media (max-width: 480px) {
          .nf-radar { width: 160px; height: 160px; }
          .nf-ring--1 { width: 160px; height: 160px; }
          .nf-ring--2 { width: 108px; height: 108px; }
          .nf-ring--3 { width: 56px; height: 56px; }
          .nf-code { font-size: 64px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .nf-sweep { animation: none; }
          .nf-blip { animation: none; }
        }
      `}</style>
    </div>
  );
}