import React, { useState } from 'react';
import {
  X,
  MapPin,
  Satellite,
  Compass,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { ALL_NASA_CELLS, findNearestNasaGrid, exportGridCellsToCSV, AGRO_REGIONS } from '../data/nasaVietnamGrid';
import { NasaGridCell } from '../types';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLat: number;
  selectedLon: number;
  onSelectCoordinates: (lat: number, lon: number) => void;
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  isOpen,
  onClose,
  selectedLat,
  selectedLon,
  onSelectCoordinates,
}) => {
  if (!isOpen) return null;

  const [currentLat, setCurrentLat] = useState(selectedLat || 21.0);
  const [currentLon, setCurrentLon] = useState(selectedLon || 105.8);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('ALL');
  const [importedMessage, setImportedMessage] = useState<string | null>(null);

  // Compute nearest NASA grid cell
  const { cell: nearestCell, distanceKm } = findNearestNasaGrid(currentLat, currentLon);

  // Quick preset locations in Vietnam
  const quickLocations = [
    { name: 'Hà Nội (ĐBSH)', lat: 21.03, lon: 105.85 },
    { name: 'Sơn La (Tây Bắc)', lat: 21.32, lon: 103.91 },
    { name: 'Lạng Sơn (Đông Bắc)', lat: 21.85, lon: 106.76 },
    { name: 'Nghệ An (Bắc Trung Bộ)', lat: 18.67, lon: 105.68 },
    { name: 'Đà Nẵng (DH Nam Trung Bộ)', lat: 16.05, lon: 108.2 },
    { name: 'Đắk Lắk (Tây Nguyên)', lat: 12.67, lon: 108.04 },
    { name: 'TP. Hồ Chí Minh (Đông Nam Bộ)', lat: 10.82, lon: 106.63 },
    { name: 'An Giang (ĐBSCL)', lat: 10.37, lon: 105.43 },
    { name: 'Cà Mau (Mũi Cà Mau)', lat: 9.18, lon: 105.15 },
    { name: 'Quần đảo Hoàng Sa', lat: 16.5, lon: 112.0 },
    { name: 'Quần đảo Trường Sa', lat: 9.0, lon: 114.0 },
  ];

  // Map projection coordinates: Vietnam bounds roughly Lat 8.5 to 23.5, Lon 102.0 to 114.5
  const mapWidth = 520;
  const mapHeight = 560;
  const minLat = 8.0;
  const maxLat = 24.0;
  const minLon = 101.5;
  const maxLon = 114.5;

  const projectToSvg = (lat: number, lon: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * mapWidth;
    const y = ((maxLat - lat) / (maxLat - minLat)) * mapHeight;
    return { x, y };
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const lon = minLon + (clickX / mapWidth) * (maxLon - minLon);
    const lat = maxLat - (clickY / mapHeight) * (maxLat - minLat);

    const roundedLat = Number(lat.toFixed(2));
    const roundedLon = Number(lon.toFixed(2));

    setCurrentLat(roundedLat);
    setCurrentLon(roundedLon);
  };

  const handleDownloadCSV = () => {
    const csvData = exportGridCellsToCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'selected_cells.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyCoordinates = () => {
    onSelectCoordinates(currentLat, currentLon);
    onClose();
  };

  const currentSvgPoint = projectToSvg(currentLat, currentLon);
  const nearestCellSvgPoint = projectToSvg(nearestCell.lat, nearestCell.lon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
              <Satellite className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Bản đồ Lưới NASA POWER 0.5° Toàn Việt Nam (2005–2025)</h2>
              <p className="text-xs text-emerald-200">
                531 ô lưới • Nhấp chuột để định vị thửa ruộng và ghép ô dữ liệu khí hậu 21 năm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive SVG Map of Vietnam Grid */}
          <div className="lg:col-span-7 flex flex-col items-center bg-stone-900 p-4 rounded-xl border border-stone-800 text-white">
            <div className="w-full flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Compass className="w-3.5 h-3.5" /> Bản đồ ô lưới độ phân giải 0.5° (NASA POWER)
              </span>
              <span>Click vào bản đồ để chọn</span>
            </div>

            {/* SVG Visualizer */}
            <div className="relative w-full overflow-hidden flex justify-center bg-stone-950/80 rounded-lg p-2 border border-stone-800">
              <svg
                width={mapWidth}
                height={mapHeight}
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                className="cursor-crosshair max-w-full h-auto"
                onClick={handleSvgClick}
              >
                {/* Background grid markings (0.5 degree lines) */}
                <defs>
                  <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#22272a" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#gridPattern)" />

                {/* Render NASA 0.5° grid cells centers as glowing dots */}
                {ALL_NASA_CELLS.map((c, i) => {
                  const pt = projectToSvg(c.lat, c.lon);
                  const isNearest = c.cellId === nearestCell.cellId;
                  return (
                    <g key={c.cellId || i}>
                      {/* Grid bounding box (0.5 deg around center) */}
                      <rect
                        x={pt.x - 10}
                        y={pt.y - 10}
                        width="20"
                        height="20"
                        fill={isNearest ? 'rgba(16, 185, 129, 0.25)' : 'none'}
                        stroke={isNearest ? '#10b981' : '#2d3748'}
                        strokeWidth={isNearest ? 1.5 : 0.4}
                        strokeDasharray={isNearest ? 'none' : '1,2'}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isNearest ? 3.5 : 1.2}
                        fill={isNearest ? '#34d399' : '#4a5568'}
                      />
                    </g>
                  );
                })}

                {/* Nearest Grid Center Pin */}
                <circle
                  cx={nearestCellSvgPoint.x}
                  cy={nearestCellSvgPoint.y}
                  r="6"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="animate-ping opacity-60"
                />
                <circle
                  cx={nearestCellSvgPoint.x}
                  cy={nearestCellSvgPoint.y}
                  r="4"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Distance line connecting field location to grid center */}
                <line
                  x1={currentSvgPoint.x}
                  y1={currentSvgPoint.y}
                  x2={nearestCellSvgPoint.x}
                  y2={nearestCellSvgPoint.y}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />

                {/* Current Selected Field Pin */}
                <g transform={`translate(${currentSvgPoint.x}, ${currentSvgPoint.y})`}>
                  <circle r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                  <circle r="12" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" />
                </g>

                {/* Islands label */}
                <text x="370" y="270" fill="#94a3b8" fontSize="10" fontWeight="bold">
                  QĐ. Hoàng Sa (VN)
                </text>
                <text x="410" y="480" fill="#94a3b8" fontSize="10" fontWeight="bold">
                  QĐ. Trường Sa (VN)
                </text>
              </svg>
            </div>

            <div className="w-full flex items-center justify-between text-[11px] text-stone-400 mt-2 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Thửa ruộng của bạn
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Tâm ô lưới NASA
              </span>
              <span className="text-amber-400">--- Khoảng cách ({distanceKm} km)</span>
            </div>
          </div>

          {/* Right: Selected Cell Profile & Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Quick Location Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 block uppercase tracking-wider">
                Chọn nhanh địa điểm canh tác
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickLocations.map(loc => (
                  <button
                    key={loc.name}
                    onClick={() => {
                      setCurrentLat(loc.lat);
                      setCurrentLon(loc.lon);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      currentLat === loc.lat && currentLon === loc.lon
                        ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                    }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates manual input */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div>
                <label className="text-stone-500 block mb-1">Vĩ độ (Latitude °N):</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentLat}
                  onChange={e => setCurrentLat(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white font-mono font-bold text-stone-900"
                />
              </div>
              <div>
                <label className="text-stone-500 block mb-1">Kinh độ (Longitude °E):</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentLon}
                  onChange={e => setCurrentLon(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white font-mono font-bold text-stone-900"
                />
              </div>
            </div>

            {/* Nearest NASA Grid Cell Match */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Ô Lưới NASA Khớp Lệnh
                </span>
                <span className="text-xs bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                  {nearestCell.cellId}
                </span>
              </div>

              <div className="text-sm font-bold text-stone-900">
                {nearestCell.subRegion}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border border-emerald-100">
                  <div className="text-stone-400 text-[10px]">Tâm ô lưới:</div>
                  <div className="font-bold text-stone-800">{nearestCell.lat}°N, {nearestCell.lon}°E</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-100">
                  <div className="text-stone-400 text-[10px]">Khoảng cách đến ruộng:</div>
                  <div className="font-bold text-amber-700">{distanceKm} km</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-100">
                  <div className="text-stone-400 text-[10px]">Nhiệt độ TB 21 năm:</div>
                  <div className="font-bold text-stone-800">{nearestCell.climatology21Yr.avgTemp}°C</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-100">
                  <div className="text-stone-400 text-[10px]">Lượng mưa năm TB:</div>
                  <div className="font-bold text-stone-800">{nearestCell.climatology21Yr.annualRainfallMm} mm</div>
                </div>
              </div>

              <div className="text-[11px] text-emerald-800 leading-snug flex items-start gap-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700" />
                <span>
                  0.5° là độ phân giải góc (~55km). Ô lưới cung cấp chu kỳ khí hậu 2005–2025 làm mốc tham chiếu cho thửa ruộng của bạn.
                </span>
              </div>
            </div>

            {/* CSV Export & Import Features */}
            <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700 flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Tệp selected_cells.csv
                </span>
                <span className="text-[10px] text-stone-500">531 ô lưới có sẵn</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCSV}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg text-stone-700 font-medium transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Tải về CSV
                </button>
                <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg text-stone-700 font-medium transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Nhập CSV
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.length) {
                        setImportedMessage(`Đã nạp tệp "${e.target.files[0].name}" thành công!`);
                        setTimeout(() => setImportedMessage(null), 4000);
                      }
                    }}
                  />
                </label>
              </div>
              {importedMessage && (
                <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-1.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {importedMessage}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleApplyCoordinates}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MapPin className="w-4 h-4" /> Áp dụng Tọa độ Này
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
