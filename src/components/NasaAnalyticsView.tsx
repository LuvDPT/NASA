import React, { useState } from 'react';
import {
  BarChart3,
  Satellite,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Layers,
  Calendar,
  Compass,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { FieldProfile, WeatherObservation } from '../types';
import { getCellMonthlyProfile, findNearestNasaGrid } from '../data/nasaVietnamGrid';

interface NasaAnalyticsViewProps {
  field: FieldProfile;
  weather: WeatherObservation;
  onOpenMap: () => void;
}

export const NasaAnalyticsView: React.FC<NasaAnalyticsViewProps> = ({ field, weather, onOpenMap }) => {
  const [selectedIndicator, setSelectedIndicator] = useState<'T2M' | 'PRECTOTCORR' | 'GWETROOT' | 'ALLSKY_SFC_SW_DWN' | 'RH2M'>('T2M');

  const { cell } = findNearestNasaGrid(field.lat, field.lon);
  const monthlyData = getCellMonthlyProfile(cell);

  const indicatorsMeta = [
    { code: 'T2M', name: 'Nhiệt độ (T2M, MIN, MAX)', unit: '°C', icon: Thermometer, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { code: 'PRECTOTCORR', name: 'Lượng mưa (PRECTOTCORR)', unit: 'mm/tháng', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { code: 'GWETROOT', name: 'Độ ẩm rễ (GWETROOT)', unit: '0 - 1.0 (tỷ lệ)', icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { code: 'RH2M', name: 'Độ ẩm không khí (RH2M)', unit: '%', icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    { code: 'ALLSKY_SFC_SW_DWN', name: 'Bức xạ mặt trời (ALLSKY)', unit: 'MJ/m²/ngày', icon: Sun, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  ];

  const currentMeta = indicatorsMeta.find(i => i.code === selectedIndicator) || indicatorsMeta[0];

  // Calculate indicator max for chart scaling
  let maxValue = 1;
  if (selectedIndicator === 'T2M') maxValue = 40;
  else if (selectedIndicator === 'PRECTOTCORR') maxValue = Math.max(...monthlyData.map(d => d.PRECTOTCORR), 350);
  else if (selectedIndicator === 'GWETROOT') maxValue = 1.0;
  else if (selectedIndicator === 'RH2M') maxValue = 100;
  else if (selectedIndicator === 'ALLSKY_SFC_SW_DWN') maxValue = 25;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
              NASA POWER Climatology (2005–2025)
            </span>
            <span className="text-xs text-stone-500">Chu kỳ 21 năm</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
            Phân tích Khí hậu Lịch sử 21 Năm Ô Lưới {field.nasaGrid.cellId}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Tâm ô lưới: {cell.lat}°N, {cell.lon}°E (Cách ruộng: <strong>{field.nasaGrid.distanceKm} km</strong>) • Độ phân giải góc: <strong>0.5° (~55 km)</strong>
          </p>
        </div>

        <button
          onClick={onOpenMap}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Compass className="w-4 h-4" /> Đổi vị trí trên bản đồ 531 ô
        </button>
      </div>

      {/* 8 Indicators Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {indicatorsMeta.map(meta => {
          const Icon = meta.icon;
          const isSelected = selectedIndicator === meta.code;
          return (
            <button
              key={meta.code}
              onClick={() => setSelectedIndicator(meta.code as any)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-md'
                  : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{meta.code}</span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-200' : meta.color}`} />
              </div>
              <div className="font-bold text-xs truncate">{meta.name}</div>
              <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-stone-400'}`}>
                Đơn vị: {meta.unit}
              </div>
            </button>
          );
        })}
      </div>

      {/* Monthly Climatology Bar/Line Interactive Chart */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
              Chu kỳ 12 tháng: {currentMeta.name} (Trung bình 2005–2025)
            </h2>
            <p className="text-xs text-stone-500">
              Đánh giá biến động theo mùa để xác định khung thời vụ và rủi ro nông học
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" /> Trung bình 21 năm
            </span>
            {selectedIndicator === 'T2M' && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-400 inline-block" /> Khoảng T_MIN – T_MAX
              </span>
            )}
          </div>
        </div>

        {/* Custom High-Quality SVG/HTML Chart */}
        <div className="pt-4">
          <div className="grid grid-cols-12 gap-1.5 sm:gap-3 h-64 items-end pb-2 border-b border-stone-200">
            {monthlyData.map(d => {
              let val = 0;
              if (selectedIndicator === 'T2M') val = d.T2M;
              else if (selectedIndicator === 'PRECTOTCORR') val = d.PRECTOTCORR;
              else if (selectedIndicator === 'GWETROOT') val = d.GWETROOT;
              else if (selectedIndicator === 'RH2M') val = d.RH2M;
              else if (selectedIndicator === 'ALLSKY_SFC_SW_DWN') val = d.ALLSKY_SFC_SW_DWN;

              const heightPct = Math.min(100, Math.max(8, (val / maxValue) * 100));

              return (
                <div key={d.month} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-20 pointer-events-none shadow-md">
                    {d.month}: <strong>{val}</strong> {currentMeta.unit}
                    {selectedIndicator === 'T2M' && (
                      <div className="text-[9px] text-stone-300">Min: {d.T2M_MIN}°C | Max: {d.T2M_MAX}°C</div>
                    )}
                  </div>

                  {/* Value label */}
                  <span className="text-[10px] font-bold text-stone-700 mb-1 opacity-80 group-hover:opacity-100">
                    {val}
                  </span>

                  {/* Bar */}
                  <div className="w-full max-w-[36px] bg-stone-100 rounded-t-lg relative flex items-end justify-center overflow-hidden h-full">
                    {selectedIndicator === 'T2M' ? (
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 via-amber-500 to-rose-500 rounded-t-lg transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : selectedIndicator === 'PRECTOTCORR' ? (
                      <div
                        className="w-full bg-gradient-to-t from-blue-700 to-cyan-400 rounded-t-lg transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : (
                      <div
                        className="w-full bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t-lg transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    )}
                  </div>

                  {/* Month Label */}
                  <span className="text-[11px] font-bold text-stone-700 mt-2">
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 21-Year Climate Statistical Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">Đặc trưng nhiệt</span>
            <div className="text-stone-900 font-bold text-sm">
              TB: {cell.climatology21Yr.avgTemp}°C (Biên độ: {cell.climatology21Yr.minTempAnnual}°C – {cell.climatology21Yr.maxTempAnnual}°C)
            </div>
            <p className="text-[11px] text-stone-500">
              Tháng có nguy cơ rét hại: {cell.climatology21Yr.riskMonthsCold.length ? `Tháng ${cell.climatology21Yr.riskMonthsCold.join(', ')}` : 'Không có'}
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">Tổng lượng mưa năm</span>
            <div className="text-stone-900 font-bold text-sm">
              {cell.climatology21Yr.annualRainfallMm} mm / năm
            </div>
            <p className="text-[11px] text-stone-500">
              Tháng mưa bão lớn: Tháng {cell.climatology21Yr.riskMonthsFlood.join(', ')}
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">Tháng khô hạn cao điểm</span>
            <div className="text-stone-900 font-bold text-sm">
              Tháng {cell.climatology21Yr.riskMonthsDrought.join(', ')}
            </div>
            <p className="text-[11px] text-stone-500">
              Độ ẩm rễ trung bình mùa cạn hạ xuống dưới 0.35
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
