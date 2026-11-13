import React, { useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  Filter,
  Plus,
  MessageSquare,
  Droplets,
  Calendar,
} from 'lucide-react';
import { FarmTask, FieldProfile } from '../types';

interface TasksViewProps {
  tasks: FarmTask[];
  fields: FieldProfile[];
  activeField: FieldProfile;
  onUpdateTaskStatus: (taskId: string, status: FarmTask['status'], note?: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenFeedback: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  fields,
  activeField,
  onUpdateTaskStatus,
  onNavigateTab,
  onOpenFeedback,
}) => {
  const [filterFieldId, setFilterFieldId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [disagreeTaskId, setDisagreeTaskId] = useState<string | null>(null);
  const [disagreeReason, setDisagreeReason] = useState<string>('');

  const filteredTasks = tasks.filter(t => {
    if (filterFieldId !== 'ALL' && t.fieldId !== filterFieldId) return false;
    if (filterStatus === 'PENDING' && t.status !== 'pending') return false;
    if (filterStatus === 'COMPLETED' && t.status !== 'completed') return false;
    if (filterStatus === 'POSTPONED' && t.status !== 'postponed') return false;
    return true;
  });

  const getFieldName = (fieldId: string) => {
    return fields.find(f => f.id === fieldId)?.name || 'Thửa ruộng';
  };

  const handleDisagreeSubmit = (taskId: string) => {
    onUpdateTaskStatus(taskId, 'postponed', `Nông dân không đồng ý: ${disagreeReason || 'Không phù hợp thực tế'}`);
    setDisagreeTaskId(null);
    setDisagreeReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Lịch công việc tự động thích ứng
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
            Kế hoạch hành động theo điều kiện thực tế
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Không theo lịch cố định máy móc. AI tự động điều chỉnh nhiệm vụ khi có mưa lớn, khô hạn hoặc khi bạn báo tình trạng đất.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('feedback')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cập nhật tình trạng ruộng
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc theo ruộng:
          </span>
          <select
            value={filterFieldId}
            onChange={e => setFilterFieldId(e.target.value)}
            className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-stone-50 text-stone-800 font-medium"
          >
            <option value="ALL">Tất cả thửa ruộng ({fields.length})</option>
            {fields.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <span className="text-stone-400 font-semibold ml-2">Trạng thái:</span>
          <div className="flex items-center gap-1">
            {['ALL', 'PENDING', 'COMPLETED', 'POSTPONED'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterStatus === st
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chưa làm' : st === 'COMPLETED' ? 'Đã xong' : 'Tạm hoãn'}
              </button>
            ))}
          </div>
        </div>

        <div className="text-stone-500 font-medium text-xs">
          Tổng cộng: <strong>{filteredTasks.length}</strong> nhiệm vụ
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 space-y-2">
            <CalendarCheck className="w-10 h-10 mx-auto text-emerald-600 opacity-60" />
            <div className="font-bold text-stone-800 text-base">Hiện không có công việc nào theo bộ lọc</div>
            <p className="text-xs text-stone-400">
              Các nhiệm vụ sẽ tự động kích hoạt khi có thay đổi về thời tiết hoặc độ ẩm đất vùng rễ.
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';
            const isPostponed = task.status === 'postponed';

            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 rounded-2xl border transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'bg-stone-50/70 border-stone-200 opacity-75'
                    : isPostponed
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-white border-stone-200/90 hover:border-emerald-300'
                }`}
              >
                {/* Task Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      {getFieldName(task.fieldId)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        task.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : task.priority === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Ưu tiên: {task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'Trung bình' : 'Thường'}
                    </span>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Dự kiến: <strong>{task.scheduledTime}</strong>
                    </span>
                  </div>

                  <h3
                    className={`text-base font-bold text-stone-900 ${
                      isCompleted ? 'line-through text-stone-500' : ''
                    }`}
                  >
                    {task.title}
                  </h3>

                  <p className="text-xs text-stone-600 leading-relaxed font-normal">
                    {task.reason}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 font-mono pt-1">
                    <span>Dữ liệu kích hoạt: <strong>{task.triggerData}</strong></span>
                    {task.farmerNote && (
                      <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Ghi chú: {task.farmerNote}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                  {task.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => onUpdateTaskStatus(task.id, 'completed')}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
                      </button>

                      <button
                        onClick={() => setDisagreeTaskId(task.id)}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition cursor-pointer"
                      >
                        Tôi không đồng ý
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onUpdateTaskStatus(task.id, 'pending')}
                      className="px-3 py-1.5 border border-stone-300 text-stone-600 hover:bg-stone-100 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Làm lại nhiệm vụ
                    </button>
                  )}
                </div>

                {/* Disagree Dialog */}
                {disagreeTaskId === task.id && (
                  <div className="w-full mt-3 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-stone-800">
                      Vì sao bạn không đồng ý với gợi ý này? (AI sẽ ghi nhận và điều chỉnh cho lần sau):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Đất thực tế vẫn khô', 'Đất đang ngập nước', 'Cây chưa đến tuổi', 'Thời tiết ngoài trời đang nắng gắt'].map(r => (
                        <button
                          key={r}
                          onClick={() => setDisagreeReason(r)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            disagreeReason === r
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-stone-700 border-stone-300'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Lý do khác của bạn..."
                        value={disagreeReason}
                        onChange={e => setDisagreeReason(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
                      />
                      <button
                        onClick={() => handleDisagreeSubmit(task.id)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                      >
                        Xác nhận hoãn
                      </button>
                      <button
                        onClick={() => setDisagreeTaskId(null)}
                        className="px-2.5 py-1.5 text-stone-500 hover:underline cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
