"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

export function SignaturePad({
  value,
  onChange,
  height = 220,
}: {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const latestValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.touchAction = "none";
    canvas.style.webkitUserSelect = "none";
    canvas.style.userSelect = "none";

    renderCanvas(latestValueRef.current);

    function startDrawing(event: MouseEvent | TouchEvent) {
      if (event.cancelable) {
        event.preventDefault();
      }

      const point = getPoint(event);
      if (!point) return;

      if (!hasInkRef.current) {
        clearCanvas();
      }

      drawingRef.current = true;
      hasInkRef.current = true;
      lastPointRef.current = point;
      drawDot(point);
    }

    function moveDrawing(event: MouseEvent | TouchEvent) {
      if (event.cancelable) {
        event.preventDefault();
      }
      if (!drawingRef.current) return;

      const point = getPoint(event);
      const lastPoint = lastPointRef.current;
      if (!point || !lastPoint) return;

      drawLine(lastPoint, point);
      lastPointRef.current = point;
    }

    function endDrawing(event: MouseEvent | TouchEvent) {
      if (!drawingRef.current) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      drawingRef.current = false;
      lastPointRef.current = null;
      commitSignature();
    }

    function cancelDrawing(event: TouchEvent) {
      if (!drawingRef.current) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      // iOS Safari can fire touchcancel when it thinks the page should scroll.
      // Keep the drawn strokes on the canvas and do not trigger a React redraw
      // here; otherwise the user sees the signature flash/disappear mid-stroke.
      drawingRef.current = false;
      lastPointRef.current = null;
    }

    function resizeCanvas() {
      const currentCanvas = canvasRef.current;
      const snapshot =
        currentCanvas &&
        hasInkRef.current &&
        currentCanvas.width > 0 &&
        currentCanvas.height > 0
          ? currentCanvas.toDataURL("image/png")
          : latestValueRef.current;
      renderCanvas(snapshot);
    }

    const options = { passive: false };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", moveDrawing);
    window.addEventListener("mouseup", endDrawing);
    canvas.addEventListener("touchstart", startDrawing, options);
    canvas.addEventListener("touchmove", moveDrawing, options);
    window.addEventListener("touchend", endDrawing, options);
    window.addEventListener("touchcancel", cancelDrawing, options);
    window.addEventListener("resize", resizeCanvas);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", moveDrawing);
      window.removeEventListener("mouseup", endDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", moveDrawing);
      window.removeEventListener("touchend", endDrawing);
      window.removeEventListener("touchcancel", cancelDrawing);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [height]);

  useEffect(() => {
    if (drawingRef.current) return;
    renderCanvas(value);
  }, [height, value]);

  function configureContext(context: CanvasRenderingContext2D, ratio: number) {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#0f172a";
    context.fillStyle = "#0f172a";
  }

  function renderCanvas(source: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const context = canvas.getContext("2d");
    if (!context) return;

    configureContext(context, ratio);
    context.clearRect(0, 0, width, height);

    if (source) {
      hasInkRef.current = true;
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, width, height);
      };
      image.src = source;
    } else {
      hasInkRef.current = false;
      drawGuide(context, width, height);
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, height);
  }

  function drawGuide(
    context: CanvasRenderingContext2D,
    width: number,
    canvasHeight: number,
  ) {
    context.save();
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 1;
    context.setLineDash([6, 6]);
    context.beginPath();
    context.moveTo(24, canvasHeight - 36);
    context.lineTo(width - 24, canvasHeight - 36);
    context.stroke();
    context.restore();
  }

  function getPoint(event: MouseEvent | TouchEvent): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const touchEvent = "touches" in event || "changedTouches" in event;
    const source = touchEvent
      ? event.touches[0] ?? event.changedTouches[0]
      : event;
    if (!source) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  }

  function drawDot(point: Point) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    context.beginPath();
    context.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawLine(from: Point, to: Point) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function commitSignature() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInkRef.current) return;

    const dataUrl = canvas.toDataURL("image/png");
    latestValueRef.current = dataUrl;
    onChangeRef.current(dataUrl);
  }

  function clearSignature() {
    latestValueRef.current = "";
    hasInkRef.current = false;
    onChange("");
    renderCanvas("");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-[220px] w-full touch-none select-none bg-white"
          aria-label="手書きサイン入力欄"
        />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          サインを消去
        </button>
      </div>
    </div>
  );
}
