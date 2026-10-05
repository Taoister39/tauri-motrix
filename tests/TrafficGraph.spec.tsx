import { act, render } from "@testing-library/react";
import { createRef } from "react";

import TrafficGraph, { TrafficRef } from "@/layout/TrafficGraph";

describe("TrafficGraph", () => {
  let frame: FrameRequestCallback;
  let path: number[];
  let paths: number[][];
  const context = {
    beginPath: () => {
      path = [];
    },
    closePath: () => {},
    clearRect: () => {},
    moveTo: (_x: number, y: number) => {
      path.push(y);
    },
    lineTo: (_x: number, y: number) => {
      path.push(y);
    },
    quadraticCurveTo: (_cx: number, _cy: number, _x: number, y: number) => {
      path.push(y);
    },
    stroke: () => {
      paths.push([...path]);
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        frame = callback;
        return 1;
      });
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const drawAfter = (milliseconds: number) => {
    paths = [];
    act(() => {
      jest.advanceTimersByTime(milliseconds);
      frame(0);
    });
    // The download path is drawn last, after the reference and upload lines.
    return paths[paths.length - 1];
  };

  it("holds the latest speed between polls and draws zero when reported", () => {
    const ref = createRef<TrafficRef>();
    const { container } = render(<TrafficGraph ref={ref} />);
    const baseline = container.querySelector("canvas")!.height - 1;
    ref.current!.toggleStyle();
    ref.current!.appendData({ up: 0, down: 65 * 1024 ** 2 });

    const points = drawAfter(3000);
    const latestY = points[points.length - 1];
    expect(latestY).toBeLessThan(baseline);
    expect(points.slice(-3)).toEqual(Array(3).fill(latestY));

    ref.current!.appendData({ up: 0, down: 0 });
    const stoppedPoints = drawAfter(1000);
    expect(stoppedPoints[stoppedPoints.length - 1]).toBe(baseline);
  });

  it("starts a new graph without another instance's traffic history", () => {
    const firstRef = createRef<TrafficRef>();
    const first = render(<TrafficGraph ref={firstRef} />);
    firstRef.current!.appendData({ up: 0, down: 65 * 1024 ** 2 });
    drawAfter(2000);
    first.unmount();

    const secondRef = createRef<TrafficRef>();
    const { container } = render(<TrafficGraph ref={secondRef} />);
    const baseline = container.querySelector("canvas")!.height - 1;
    secondRef.current!.toggleStyle();

    expect(drawAfter(1000).every((y) => y === baseline)).toBe(true);
  });
});
