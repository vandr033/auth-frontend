"use client";

import React from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type BarcodeDetectionResult = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectionResult[]>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

type LiveQrScannerProps = {
  onDetected: (rawValue: string) => Promise<void> | void;
  disabled?: boolean;
  title: string;
  subtitle: string;
  startLabel: string;
  stopLabel: string;
  unsupportedLabel: string;
  unavailableLabel: string;
  idleLabel: string;
};

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  const win = window as Window & { BarcodeDetector?: BarcodeDetectorCtor };
  return win.BarcodeDetector ?? null;
}

export function LiveQrScanner({
  onDetected,
  disabled = false,
  title,
  subtitle,
  startLabel,
  stopLabel,
  unsupportedLabel,
  unavailableLabel,
  idleLabel,
}: LiveQrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const detectorRef = React.useRef<BarcodeDetectorLike | null>(null);
  const scanTimerRef = React.useRef<number | null>(null);
  const lastDetectedRef = React.useRef<string>("");
  const lastDetectedAtRef = React.useRef<number>(0);

  const [starting, setStarting] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSupported, setIsSupported] = React.useState(false);

  const clearScanTimer = React.useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    clearScanTimer();
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, [clearScanTimer]);

  const runScanLoop = React.useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector || !active) return;

    const scheduleNext = () => {
      clearScanTimer();
      scanTimerRef.current = window.setTimeout(() => {
        void runScanLoop();
      }, 350);
    };

    if (disabled || video.readyState < 2) {
      scheduleNext();
      return;
    }

    detector
      .detect(video)
      .then(async (codes) => {
        const rawValue = codes.find((code) => typeof code.rawValue === "string" && code.rawValue.trim().length > 0)?.rawValue?.trim();
        if (!rawValue) return;

        const now = Date.now();
        const duplicate = rawValue === lastDetectedRef.current && now - lastDetectedAtRef.current < 2000;
        if (duplicate) return;

        lastDetectedRef.current = rawValue;
        lastDetectedAtRef.current = now;
        await onDetected(rawValue);
      })
      .catch(() => {
        // Ignore transient detection errors and continue scanning.
      })
      .finally(scheduleNext);
  }, [active, clearScanTimer, disabled, onDetected]);

  const startCamera = React.useCallback(async () => {
    if (starting || active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(unavailableLabel);
      return;
    }

    const DetectorCtor = getBarcodeDetectorCtor();
    if (!DetectorCtor) {
      setError(unsupportedLabel);
      return;
    }

    setStarting(true);
    setError(null);

    try {
      detectorRef.current = new DetectorCtor({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Video element is not available");
      }

      video.srcObject = stream;
      await video.play();
      setActive(true);
    } catch {
      stopCamera();
      setError(unavailableLabel);
    } finally {
      setStarting(false);
    }
  }, [active, starting, stopCamera, unavailableLabel, unsupportedLabel]);

  React.useEffect(() => {
    setIsSupported(Boolean(getBarcodeDetectorCtor()));
  }, []);

  React.useEffect(() => {
    if (!active) return;
    void runScanLoop();
    return () => {
      clearScanTimer();
    };
  }, [active, clearScanTimer, runScanLoop]);

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">{subtitle}</p>
      </div>

      <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-950">
        <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
        {!active ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-xs text-slate-100">
            {isSupported ? idleLabel : unsupportedLabel}
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-lg border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
          </div>
        )}
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex gap-2">
        {!active ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void startCamera()}
            disabled={starting || disabled || !isSupported}
            className="w-full"
          >
            {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {startLabel}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={stopCamera} className="w-full">
            <CameraOff className="mr-2 h-4 w-4" />
            {stopLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
