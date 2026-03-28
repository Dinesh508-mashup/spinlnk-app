import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScannerModal({ onScan, onClose }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scanner.stop().catch(() => {});
        onScan(decodedText);
      },
      () => {} // ignore scan failures
    ).catch((err) => {
      setError('Could not access camera. Please allow camera permissions.');
      console.error('QR scanner error:', err);
    });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="qr-scanner-overlay" onClick={onClose}>
      <div className="qr-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-scanner-header">
          <h3>Scan Machine QR Code</h3>
          <button className="qr-close-btn" onClick={onClose}>&times;</button>
        </div>
        {error ? (
          <p className="qr-scanner-error">{error}</p>
        ) : (
          <div id="qr-reader" ref={containerRef} className="qr-reader-container" />
        )}
        <p className="qr-scanner-hint">Point your camera at the QR code on the machine</p>
      </div>
    </div>
  );
}
