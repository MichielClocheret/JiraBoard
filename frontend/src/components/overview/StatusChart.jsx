import { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

// Ported from initOverviewChart() in legacy/js/userDashboard.js, restyled
// for the dark KPI-card treatment (light bars/text on the near-black card).
export default function StatusChart({ chartData }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (!chartData.length) return;

    const labels = chartData.map((u) => u.displayName || "Unknown");
    const totals = chartData.map((u) => u.totalOpen ?? 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: totals,
            borderWidth: 1,
            borderRadius: 6,
            backgroundColor: "rgba(63, 174, 102, 0.55)",
            borderColor: "rgba(63, 174, 102, 0.95)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", axis: "x", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            titleFont: { size: 12, weight: "600" },
            bodyFont: { size: 13, weight: "600" },
            padding: 14,
            callbacks: {
              title: (items) => String(items[0]?.label || "Unknown"),
              label: (ctx) => String(ctx.parsed.y),
            },
          },
        },
        scales: {
          x: {
            ticks: { display: false, autoSkip: false, maxRotation: 0, minRotation: 0 },
            grid: { color: "rgba(234, 242, 236, 0.08)" },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: "rgba(234, 242, 236, 0.65)" },
            grid: { color: "rgba(234, 242, 236, 0.08)" },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [chartData]);

  return <canvas ref={canvasRef} />;
}
