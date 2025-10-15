"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shuffle,
} from "lucide-react";

const API_URL = "";

const ROIViewer = () => {
  const [outputData, setOutputData] = useState([]);
  const [currentROI, setCurrentROI] = useState(0);
  const [roiSize, setRoiSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const canvasRef = useRef(null);
  const od = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reset image errors when ROI or size changes
    setImageErrors({});
  }, [currentROI, roiSize]);

  useEffect(() => {
    if (outputData.length > 0) {
      drawMinimap();
    }
  }, [currentROI, roiSize]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/roi/all`);
      if (!response.ok) throw new Error("Failed to load ROI data");

      const data = await response.json();
      setOutputData(data.data);

      const statsResponse = await fetch(`${API_URL}/api/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
        const od = data.data
        const xs = od.map((d) => d.x);
        const ys = od.map((d) => d.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
      od.current = {minX,minY,maxX,maxY}

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const drawMinimap = () => {
    if (!canvasRef.current || outputData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);
    const {minX,minY,maxX,maxY} = od.current;


    const padding = 20;
    const scaleX = (width - 2 * padding) / (maxX - minX || 1);
    const scaleY = (height - 2 * padding) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (width - 2 * padding - (maxX - minX) * scale) / 2;
    const offsetY =
      padding + (height - 2 * padding - (maxY - minY) * scale) / 2;

    outputData.forEach((roi, idx) => {
      const x = offsetX + (roi.x - minX) * scale;
      const y = offsetY + (roi.y - minY) * scale;

      if (idx === currentROI) {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, width - 2 * padding, height - 2 * padding);
  };

  const handleMinimapClick = (e) => {
    if (outputData.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    const xs = outputData.map((d) => d.x);
    const ys = outputData.map((d) => d.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padding = 20;
    const scaleX = (width - 2 * padding) / (maxX - minX || 1);
    const scaleY = (height - 2 * padding) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (width - 2 * padding - (maxX - minX) * scale) / 2;
    const offsetY =
      padding + (height - 2 * padding - (maxY - minY) * scale) / 2;

    const worldX = (clickX - offsetX) / scale + minX;
    const worldY = (clickY - offsetY) / scale + minY;

    let nearestIdx = 0;
    let nearestDist = Infinity;

    outputData.forEach((roi, idx) => {
      const dist = Math.sqrt(
        Math.pow(roi.x - worldX, 2) + Math.pow(roi.y - worldY, 2)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    setCurrentROI(nearestIdx);
  };

  const randomSample = () => {
    if (outputData.length === 0) return;
    const randomIdx = Math.floor(Math.random() * outputData.length);
    setCurrentROI(randomIdx);
  };

  const zoomIn = () => {
    if (roiSize > 3) {
      setRoiSize(roiSize - 2);
    }
  };

  const zoomOut = () => {
    setRoiSize(roiSize + 2);
  };

  const getImageUrl = (roiIdx, row, channel) =>
    `${API_URL}/api/roi/${roiIdx}/image?row=${row}&channel=${channel}&size=${roiSize}`;

  const renderImageGrid = () => {
    const rows = 2;
    const cols = 6;
    const channelsPerRow = 5;

    return (
      <div className="space-y-4">
        {[0, 1].map((row) => (
          <div key={row} className="flex gap-2">
            {[...Array(cols)].map((_, col) => (
              <div
                key={col}
                className="flex-1 bg-gray-800 rounded border-2 border-gray-700 flex items-center justify-center relative overflow-hidden"
                style={{ aspectRatio: "1" }}
              >
                {col < channelsPerRow ? (
                  <div className="w-full h-full relative">
                    {outputData[currentROI] && !imageErrors[`${currentROI}-${row}-${col}`] ? (
                      <img
                        src={getImageUrl(currentROI, row, col)}
                        alt={`ROI ${currentROI} Row ${row} Ch ${col}`}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                        onError={() => {
                          setImageErrors(prev => ({
                            ...prev,
                            [`${currentROI}-${row}-${col}`]: true
                          }));
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                        {outputData[currentROI] ? "No image" : "No data"}
                      </div>
                    )}
                    <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      Ch{col + 1}
                    </div>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {roiSize}×{roiSize}
                    </div>
                  </div>
                ) : (
                  <div className="text-white text-center p-2 w-full">
                    <div className="text-xs text-gray-400 mb-1">Output</div>
                    <div className="text-2xl font-bold">
                      {outputData[currentROI]
                        ? row === 0
                          ? outputData[currentROI].cy0.toFixed(0)
                          : outputData[currentROI].cy1.toFixed(0)
                        : "-"}
                    </div>
                    {outputData[currentROI] && (
                      <div className="text-xs text-gray-400 mt-2">
                        <div>x: {outputData[currentROI].x.toFixed(1)}</div>
                        <div>y: {outputData[currentROI].y.toFixed(1)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading ROI data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center bg-red-900 bg-opacity-50 p-8 rounded-lg max-w-md">
          <p className="text-xl font-bold mb-2">Error Loading Data</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded mx-auto"
          >
            <RefreshCw size={16} />
            Retry
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Make sure the Flask server is running at {API_URL}
          </p>
        </div>
      </div>
    );
  }

  const totalROIs = outputData.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Multi-Channel ROI Viewer</h1>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Stats Section */}
          {stats && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {stats.filtered_rois}
                  </div>
                  <div className="text-sm text-gray-400">Filtered ROIs</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.filter_criteria}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {stats.total_rois_in_csv}
                  </div>
                  <div className="text-sm text-gray-400">Total in CSV</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {roiSize}×{roiSize}
                  </div>
                  <div className="text-sm text-gray-400">ROI Size (pixels)</div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold ${
                      stats.row0_image_loaded && stats.row1_image_loaded
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {stats.row0_image_loaded && stats.row1_image_loaded
                      ? "✓"
                      : "✗"}
                  </div>
                  <div className="text-sm text-gray-400">Images Loaded</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation and Zoom Controls */}
          {totalROIs > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentROI(Math.max(0, currentROI - 1))}
                disabled={currentROI === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded transition"
              >
                <ChevronLeft size={20} />
                Previous
              </button>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ROI {currentROI + 1} / {totalROIs}
                  </div>
                  {outputData[currentROI] && (
                    <div className="text-sm text-gray-400 mt-1">
                      Position: ({outputData[currentROI].x.toFixed(0)},{" "}
                      {outputData[currentROI].y.toFixed(0)})
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={zoomIn}
                    disabled={roiSize === 3}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-600 rounded transition"
                    title="Zoom In (-2 pixels)"
                  >
                    <ZoomIn size={20} />
                    Zoom In
                  </button>
                  <div className="flex items-center px-3 py-2 bg-gray-700 rounded font-mono">
                    {roiSize}×{roiSize}
                  </div>
                  <button
                    onClick={zoomOut}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded transition"
                    title="Zoom Out (+2 pixels)"
                  >
                    <ZoomOut size={20} />
                    Zoom Out
                  </button>
                </div>
              </div>

              <button
                onClick={() =>
                  setCurrentROI(Math.min(totalROIs - 1, currentROI + 1))
                }
                disabled={currentROI === totalROIs - 1}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded transition"
              >
                Next
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Image Grid */}
          {totalROIs > 0 ? (
            renderImageGrid()
          ) : (
            <div className="bg-gray-800 rounded-lg p-12 text-center text-gray-400">
              <p className="text-xl mb-2">No ROI data available</p>
              <p className="text-sm">
                No ROIs found where cy0==255 and cy1==255
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Check your CSV data and filter criteria
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
            <h3 className="font-bold text-white mb-2">How it works:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Backend loads 2 large images (5×10k×10k each) and filters CSV
                for cy0==255 and cy1==255
              </li>
              <li>
                Each ROI is cropped on-the-fly from the large images centered at
                (x, y) coordinates
              </li>
              <li>
                Navigate through filtered ROIs using Previous/Next buttons
              </li>
              <li>
                Adjust ROI crop size: Zoom In (smaller), Zoom Out (larger) in
                steps of 2 pixels
              </li>
              <li>
                Each row shows 5 channel crops + output values (cy0 for row 1,
                cy1 for row 2)
              </li>
            </ul>
          </div>
        </div>

        {/* Minimap Sidebar */}
        <div className="w-80 space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold text-white mb-3">Minimap</h3>
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="w-full bg-gray-900 rounded cursor-crosshair border-2 border-gray-700"
              onClick={handleMinimapClick}
            />
            <p className="text-xs text-gray-400 mt-2 text-center">
              Click to jump to nearest ROI
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold text-white mb-3">Quick Navigation</h3>
            <button
              onClick={randomSample}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded transition"
            >
              <Shuffle size={20} />
              Random Sample
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Jump to a random ROI
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                <span className="text-gray-300">ROI Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white"></div>
                <span className="text-gray-300">Current ROI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROIViewer;
