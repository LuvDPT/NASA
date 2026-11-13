import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudUpload,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight,
  Eye,
  Download,
  Info,
  Check,
  Copy,
  Lock,
} from 'lucide-react';
import { CentralDataStatus, DataImportRecord, SyncLogRecord, CsvPreviewResult } from '../types';

export const AdminDataManagementView: React.FC = () => {
  const [status, setStatus] = useState<CentralDataStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogRecord[]>([]);
  const [imports, setImports] = useState<DataImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Upload & preview state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<CsvPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Rollback state
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);

  // SQL schema copy state
  const [copiedSql, setCopiedSql] = useState(false);

  // Fetch initial warehouse status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [resStatus, resLogs] = await Promise.all([
        fetch('/api/admin/status'),
        fetch('/api/admin/sync-logs'),
      ]);

      if (resStatus.ok) {
        const data = await resStatus.json();
        setStatus(data);
      }

      if (resLogs.ok) {
        const data = await resLogs.json();
        setSyncLogs(data.logs || []);
        setImports(data.imports || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Trigger NASA POWER API Daily Sync
  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncMessage('Đang kết nối NASA POWER Daily API và đồng bộ delta cho 531 ô lưới...');
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Đồng bộ thành công! Đã xử lý ${data.recordsSynced} bản ghi. Dữ liệu mới nhất: ${data.latestNasaDate}`);
      } else {
        setSyncMessage(`Lỗi đồng bộ: ${data.error || 'NASA API không phản hồi'}`);
      }
      fetchStatus();
    } catch (err: any) {
      setSyncMessage(`Lỗi kết nối: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 8000);
    }
  };

  // Toggle Auto Sync
  const handleToggleAutoSync = async () => {
    if (!status) return;
    const newState = !status.autoSyncEnabled;
    try {
      const res = await fetch('/api/admin/toggle-auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      });
      if (res.ok) {
        setStatus({ ...status, autoSyncEnabled: newState });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle File Upload & Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setImportSuccessMsg(null);
    setPreviewing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = (event.target?.result as string) || '';
      setFileContent(content);

      try {
        const res = await fetch('/api/admin/preview-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            content,
          }),
        });

        if (res.ok) {
          const previewData = await res.json();
          setPreviewResult(previewData);
        }
      } catch (err) {
        console.error('Preview error', err);
      } finally {
        setPreviewing(false);
      }
    };
    reader.readAsText(file);
  };

  // Commit Import
  const handleCommitImport = async () => {
    if (!previewResult || !fileContent) return;

    setImporting(true);
    try {
      const res = await fetch('/api/admin/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: previewResult,
          rawContent: fileContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImportSuccessMsg(`Đã nhập thành công ${data.importRecord.recordCount} bản ghi vào kho Supabase! Phiên bản: ${data.importRecord.version}`);
        setUploadedFile(null);
        setPreviewResult(null);
        setFileContent('');
        fetchStatus();
      }
    } catch (err: any) {
      alert(`Lỗi khi nhập: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Rollback Version
  const handleRollback = async (version: string) => {
    if (!confirm(`Bạn có chắc muốn khôi phục kho dữ liệu về phiên bản ${version}?`)) return;

    try {
      const res = await fetch('/api/admin/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });

      const data = await res.json();
      if (res.ok) {
        setRollbackSuccessMsg(data.message);
        fetchStatus();
        setTimeout(() => setRollbackSuccessMsg(null), 6000);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sampleCsvContent = `cell_id,date,indicator_code,value
NASA_VN_001,2026-11-08,T2M,19.2
NASA_VN_001,2026-11-08,T2M_MIN,15.4
NASA_VN_001,2026-11-08,T2M_MAX,22.8
NASA_VN_001,2026-11-08,PRECTOTCORR,14.5
NASA_VN_001,2026-11-08,GWETROOT,0.76
NASA_VN_001,2026-11-08,GWETTOP,0.82
NASA_VN_001,2026-11-08,RH2M,88
NASA_VN_001,2026-11-08,ALLSKY_SFC_SW_DWN,11.8`;

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nasa_daily_sample_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Admin Header */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 rounded-2xl p-6 text-white shadow-md border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" /> Khu Vực Quản Trị Hệ Thống
            </span>
            <span className="text-xs text-stone-400">
              Supabase PostgreSQL • Supabase Storage • NASA POWER Daily API
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
            Quản trị & Đồng bộ Kho Dữ liệu NASA Tập Trung
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
            Quản lý kho dữ liệu khí hậu 531 ô lưới Việt Nam, tự động đồng bộ delta từ NASA POWER API và lưu trữ tập trung trên Supabase.
          </p>
        </div>

        {/* Sync Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ NASA ngay'}
          </button>

          <button
            onClick={handleToggleAutoSync}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              status?.autoSyncEnabled
                ? 'bg-stone-800 text-emerald-300 border-emerald-500/30 hover:bg-stone-700'
                : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
            }`}
          >
            Tự động hàng ngày: {status?.autoSyncEnabled ? 'BẬT' : 'TẮT'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-semibold animate-in fade-in flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-800">✕</button>
        </div>
      )}

      {rollbackSuccessMsg && (
        <div className="p-3.5 bg-blue-100 border border-blue-300 text-blue-950 rounded-xl text-xs font-semibold animate-in fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>{rollbackSuccessMsg}</span>
        </div>
      )}

      {/* 4 Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] uppercase font-bold">Ngày NASA mới nhất</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{status?.latestNasaDate || '2026-11-08'}</div>
          <div className="text-[11px] text-stone-500">Độ trễ xử lý vệ tinh ~48-72h</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] uppercase font-bold">Tổng số bản ghi kho</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-stone-900">
            {status?.totalRecords ? status.totalRecords.toLocaleString('vi-VN') : '1.550.640'}
          </div>
          <div className="text-[11px] text-stone-500">531 ô lưới × 8 chỉ số NASA</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] uppercase font-bold">Phiên bản dữ liệu</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{status?.activeVersion || 'v2026.11'}</div>
          <div className="text-[11px] text-emerald-700 font-semibold">Khóa độc nhất: cell + date + code</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] uppercase font-bold">Trạng thái kho Supabase</span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            {status?.isConnectedToSupabase ? 'Supabase Sẵn sàng' : 'Kho trung tâm tích hợp'}
          </div>
          <div className="text-[10px] text-stone-500 truncate">
            {status?.supabaseUrl || 'RLS Policies & Storage Bucket Active'}
          </div>
        </div>
      </div>

      {/* SECTION 1: UPLOAD CSV / EXCEL & PRE-VALIDATION */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-emerald-700" />
              1. Tải lên tệp CSV / Excel & Kiểm tra tính toàn vẹn dữ liệu
            </h2>
            <p className="text-xs text-stone-500">
              Hệ thống tự động kiểm tra cấu trúc 4 cột chuẩn, lọc giá trị trùng lặp và xác thực khoảng ngày trước khi ghi vào kho.
            </p>
          </div>

          <button
            onClick={handleDownloadSampleCsv}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer underline"
          >
            <Download className="w-3.5 h-3.5" /> Tải tệp mẫu chuẩn (.CSV)
          </button>
        </div>

        {/* Upload Dropzone */}
        <div className="p-6 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl text-center bg-stone-50/50 transition flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer">
              Nhấp vào đây để chọn tệp CSV hoặc Excel
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <p className="text-[11px] text-stone-400 mt-1">
              Hỗ trợ tệp số liệu khí hậu NASA POWER định dạng .csv hoặc .xlsx
            </p>
          </div>
          {uploadedFile && (
            <div className="text-xs font-bold text-stone-800 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-2xs">
              Đã chọn: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Pre-validation Results Summary */}
        {previewing && (
          <div className="p-4 text-center text-xs text-stone-500 italic">
            Đang phân tích cấu trúc cột và kiểm tra trùng lặp...
          </div>
        )}

        {previewResult && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" /> Kết quả kiểm tra trước khi nhập
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${previewResult.errors.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {previewResult.errors.length === 0 ? 'Cấu trúc hợp lệ' : 'Phát hiện lỗi'}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 text-[10px] block">Số dòng hợp lệ</span>
                <span className="font-bold text-emerald-700 text-sm">{previewResult.validRows.toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 text-[10px] block">Số ô lưới nhận diện</span>
                <span className="font-bold text-stone-800 text-sm">{previewResult.uniqueCells} ô</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 text-[10px] block">Khoảng ngày</span>
                <span className="font-bold text-stone-800 text-[11px] truncate block">
                  {previewResult.startDate} → {previewResult.endDate}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 text-[10px] block">Dòng trùng lặp đã lọc</span>
                <span className="font-bold text-amber-700 text-sm">{previewResult.duplicateCount}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-400 text-[10px] block">Chỉ số phát hiện</span>
                <span className="font-bold text-stone-800 text-[11px] truncate block">
                  {previewResult.indicatorsDetected.join(', ') || 'Chưa rõ'}
                </span>
              </div>
            </div>

            {/* Error notifications */}
            {previewResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Các lỗi cấu trúc cần khắc phục:
                </div>
                <ul className="list-disc pl-5">
                  {previewResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample Table */}
            {previewResult.sampleRows.length > 0 && (
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[11px]">
                    <tr>
                      <th className="p-2 font-semibold">Ô lưới (cell_id)</th>
                      <th className="p-2 font-semibold">Ngày (date)</th>
                      <th className="p-2 font-semibold">Chỉ số (indicator_code)</th>
                      <th className="p-2 font-semibold">Giá trị đo (value)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {previewResult.sampleRows.map((r, i) => (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="p-2 font-mono text-stone-900 font-bold">{r.cell_id}</td>
                        <td className="p-2 font-mono text-stone-600">{r.date}</td>
                        <td className="p-2 font-bold text-emerald-800">{r.indicator_code}</td>
                        <td className="p-2 font-mono font-bold text-stone-800">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commit Import Button */}
            {previewResult.validRows > 0 && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setPreviewResult(null)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={importing}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {importing ? 'Đang ghi vào Supabase...' : `Ghi ${previewResult.validRows.toLocaleString()} dòng vào Kho Trung tâm`}
                </button>
              </div>
            )}
          </div>
        )}

        {importSuccessMsg && (
          <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{importSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* SECTION 2: SYNCHRONIZATION LOGS & ROLLBACK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sync Logs History */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                Lịch sử Đồng bộ NASA POWER API
              </h2>
              <p className="text-xs text-stone-500">
                Ghi nhận chi tiết mọi phiên cập nhật tự động và thủ công
              </p>
            </div>
            <button
              onClick={fetchStatus}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {syncLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">Chưa có nhật ký đồng bộ</div>
            ) : (
              syncLogs.map(log => {
                const isSuccess = log.status === 'SUCCESS';
                const isFailed = log.status === 'FAILED';
                return (
                  <div
                    key={log.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : isFailed
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="font-bold text-stone-900">{log.syncType}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(log.startTime).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-600">
                      <span>Bản ghi đã đồng bộ: <strong>{log.recordsSynced.toLocaleString()}</strong></span>
                      <span>Mốc dữ liệu NASA: <strong>{log.latestNasaDate || 'N/A'}</strong></span>
                    </div>

                    {log.details?.message && (
                      <p className="text-[11px] text-stone-500 italic">{log.details.message}</p>
                    )}

                    {log.errorMessage && (
                      <p className="text-[11px] text-rose-700 font-medium bg-rose-50 p-1.5 rounded">
                        Lỗi: {log.errorMessage}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Version Rollback & Manifest */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-700" />
              Khôi phục Phiên bản Dữ liệu (Rollback)
            </h2>
            <p className="text-xs text-stone-500">
              Bảo vệ an toàn kho: Cho phép hoàn tác về trạng thái trước nếu tệp nhập bị lỗi
            </p>
          </div>

          <div className="space-y-2.5">
            {imports.map(imp => {
              const isCurrent = imp.version === status?.activeVersion;
              return (
                <div
                  key={imp.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                    isCurrent
                      ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-300'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">{imp.fileName}</span>
                    <span className="text-[10px] font-mono bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
                      {imp.version}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>{imp.recordCount.toLocaleString()} bản ghi</span>
                    <span>{imp.startDate} → {imp.endDate}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                    {isCurrent ? (
                      <span className="text-[11px] font-bold text-purple-800 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Phiên bản đang kích hoạt
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRollback(imp.version)}
                        className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Khôi phục phiên bản này
                      </button>
                    )}
                    <span className="text-[10px] text-stone-400">
                      {new Date(imp.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3: SUPABASE DDL SCHEMA & ARCHITECTURE REFERENCE */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white border border-stone-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-stone-100">
              Kiến trúc Kho Dữ liệu Supabase & Row Level Security (RLS)
            </h3>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`-- Xem tệp /src/db/supabase_schema.sql trong mã nguồn dự án`);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 3000);
            }}
            className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-lg border border-stone-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSql ? 'Đã sao chép' : 'Sao chép đường dẫn DDL'}
          </button>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          Tệp cấu trúc toàn diện đã được tạo tại <code>/src/db/supabase_schema.sql</code>, bao gồm 6 bảng:
          <br />
          • <code>public.nasa_grid_cells</code> (531 ô lưới phủ khắp Việt Nam)
          <br />
          • <code>public.nasa_daily_data</code> (Khóa duy nhất <code>uq_cell_date_indicator</code> chống trùng lặp theo ô, ngày, chỉ số)
          <br />
          • <code>public.data_imports</code>, <code>public.sync_logs</code>, <code>public.farms</code>, <code>public.recommendations</code>.
          <br />
          • Toàn bộ bảng kích hoạt Row Level Security (RLS), chỉ tài khoản admin/service role mới có quyền ghi dữ liệu khí hậu tập trung.
        </p>
      </div>
    </div>
  );
};
