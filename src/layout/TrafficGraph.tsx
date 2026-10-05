// from clash verge
import { useTheme } from "@mui/material";
import { Ref, useEffect, useImperativeHandle, useRef } from "react";

import { getTrafficGraphY } from "@/utils/traffic";

const maxPoint = 30;

const refLineAlpha = 1;
const refLineWidth = 2;

const upLineAlpha = 0.6;
const upLineWidth = 4;

const downLineAlpha = 1;
const downLineWidth = 4;

type TrafficData = { up: number; down: number };

export interface TrafficRef {
  appendData: (data: TrafficData) => void;
  toggleStyle: () => void;
}

/**
 * draw the traffic graph
 */
function TrafficGraph(props: { ref: Ref<TrafficRef> }) {
  const countRef = useRef(0);
  const styleRef = useRef(true);
  const listRef = useRef<TrafficData[]>(
    Array.from({ length: maxPoint + 2 }, () => ({ up: 0, down: 0 })),
  );
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  // Polling can be slower than the graph, so hold the latest reported speed.
  const cacheRef = useRef<TrafficData>({ up: 0, down: 0 });

  const { palette } = useTheme();

  useImperativeHandle(props.ref, () => ({
    appendData: (data: TrafficData) => {
      cacheRef.current = data;
    },
    toggleStyle: () => {
      styleRef.current = !styleRef.current;
    },
  }));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleData = () => {
      const list = listRef.current;
      if (list.length >= maxPoint + 2) list.shift();
      list.push(cacheRef.current);
      countRef.current = 0;

      timer = setTimeout(handleData, 1000);
    };

    handleData();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current!;

    if (!canvas) return;

    const context = canvas.getContext("2d")!;

    if (!context) return;

    const { primary, secondary, divider } = palette;
    const refLineColor = divider || "rgba(0, 0, 0, 0.12)";
    const upLineColor = secondary.main || "#9c27b0";
    const downLineColor = primary.main || "#5b5c9d";

    const width = canvas.width;
    const height = canvas.height;
    const dx = width / maxPoint;
    const dy = height / 7;
    const l1 = dy;
    const l2 = dy * 4;

    const drawBezier = (list: number[], offset: number, peakSpeed: number) => {
      const points = list.map((y, i) => [
        (dx * (i - 1) - offset + 3) | 0,
        getTrafficGraphY(y, peakSpeed, height),
      ]);

      let x = points[0][0];
      let y = points[0][1];

      context.moveTo(x, y);

      for (let i = 1; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[i + 1] || p1;

        const x1 = (p1[0] + p2[0]) / 2;
        const y1 = (p1[1] + p2[1]) / 2;

        context.quadraticCurveTo(p1[0], p1[1], x1, y1);
        x = x1;
        y = y1;
      }
    };

    const drawLine = (list: number[], offset: number, peakSpeed: number) => {
      const points = list.map((y, i) => [
        (dx * (i - 1) - offset) | 0,
        getTrafficGraphY(y, peakSpeed, height),
      ]);

      context.moveTo(points[0][0], points[0][1]);

      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        context.lineTo(p[0], p[1]);
      }
    };

    const drawGraph = (lastTime: number) => {
      const listUp = listRef.current.map((v) => v.up);
      const listDown = listRef.current.map((v) => v.down);
      const lineStyle = styleRef.current;

      const now = Date.now();
      const diff = now - lastTime;
      if (diff < 33) {
        raf = requestAnimationFrame(() => drawGraph(lastTime));
        return;
      }
      const temp = Math.min((diff / 1000) * dx + countRef.current, dx);
      const offset = countRef.current === 0 ? 0 : temp;
      countRef.current = temp;

      // Keep both series on one scale with headroom above the recent peak.
      const peakSpeed = Math.max(...listUp, ...listDown);

      context.clearRect(0, 0, width, height);

      // Reference lines
      context.beginPath();
      context.globalAlpha = refLineAlpha;
      context.lineWidth = refLineWidth;
      context.strokeStyle = refLineColor;
      context.moveTo(0, l1);
      context.lineTo(width, l1);
      context.moveTo(0, l2);
      context.lineTo(width, l2);
      context.stroke();
      context.closePath();

      context.beginPath();
      context.globalAlpha = upLineAlpha;
      context.lineWidth = upLineWidth;
      context.strokeStyle = upLineColor;

      if (lineStyle) {
        drawBezier(listUp, offset, peakSpeed);
      } else {
        drawLine(listUp, offset, peakSpeed);
      }

      context.stroke();
      context.closePath();

      context.beginPath();
      context.globalAlpha = downLineAlpha;
      context.lineWidth = downLineWidth;
      context.strokeStyle = downLineColor;

      if (lineStyle) {
        drawBezier(listDown, offset, peakSpeed);
      } else {
        drawLine(listDown, offset, peakSpeed);
      }

      context.stroke();
      context.closePath();

      raf = requestAnimationFrame(() => drawGraph(now));
    };

    drawGraph(Date.now());

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [palette]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

export default TrafficGraph;
