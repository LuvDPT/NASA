import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MyFieldsView } from './components/MyFieldsView';
import { TasksView } from './components/TasksView';
import { NasaAnalyticsView } from './components/NasaAnalyticsView';
import { PlantingCalendarView } from './components/PlantingCalendarView';
import { AiAssistantView } from './components/AiAssistantView';
import { FeedbackHistoryView } from './components/FeedbackHistoryView';
import { ExplanationDrawer } from './components/ExplanationDrawer';
import { DemoCompareModal } from './components/DemoCompareModal';
import { InteractiveMapModal } from './components/InteractiveMapModal';
import { AdminDataManagementView } from './components/AdminDataManagementView';
import { StorageService } from './services/storage';
import { analyzeFieldAgronomy, generateTasksFromBrief } from './services/agronomyEngine';
import { GeminiService } from './services/geminiService';
import { FieldProfile, WeatherObservation, DailyAgronomicBrief, FarmTask, FeedbackRecord, FeedbackType } from './types';
import { Satellite, Sprout, Heart, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [fields, setFields] = useState<FieldProfile[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string>('');
  const [weather, setWeather] = useState<WeatherObservation>(StorageService.getWeather());
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackRecord[]>([]);

  // Modals state
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [demoCompareOpen, setDemoCompareOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapInitialCoords, setMapInitialCoords] = useState<{ lat: number; lon: number }>({ lat: 21.03, lon: 105.85 });
  const [wizardOpen, setWizardOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    const loadedFields = StorageService.getFields();
    setFields(loadedFields);
    const activeId = StorageService.getActiveFieldId();
    setActiveFieldId(activeId);
    setTasks(StorageService.getTasks());
    setFeedbackHistory(StorageService.getFeedbackHistory());
  }, []);

  const activeField = fields.find(f => f.id === activeFieldId) || fields[0];

  // Dynamic Rule Analysis Brief for Active Field
  const ruleBrief: DailyAgronomicBrief = activeField
    ? analyzeFieldAgronomy(activeField, weather, feedbackHistory)
    : ({} as any);

  // Switch Field Handler
  const handleSelectField = (fieldId: string) => {
    setActiveFieldId(fieldId);
    StorageService.setActiveFieldId(fieldId);
  };

  // Add New Field Handler
  const handleAddNewField = (newFieldData: Omit<FieldProfile, 'id' | 'nasaGrid'>) => {
    const created = StorageService.addField(newFieldData);
    const updatedFields = StorageService.getFields();
    setFields(updatedFields);
    setActiveFieldId(created.id);
    setTasks(StorageService.getTasks());
    setActiveTab('dashboard');
  };

  // Delete Field Handler
  const handleDeleteField = (fieldId: string) => {
    StorageService.deleteField(fieldId);
    const remaining = StorageService.getFields();
    setFields(remaining);
    setActiveFieldId(StorageService.getActiveFieldId());
  };

  // Update Task Status
  const handleUpdateTaskStatus = (taskId: string, status: FarmTask['status'], note?: string) => {
    StorageService.updateTaskStatus(taskId, status, note);
    setTasks(StorageService.getTasks());
  };

  // Farmer Feedback Handler
  const handleAddFeedback = (feedback: Omit<FeedbackRecord, 'id' | 'timestamp'>) => {
    StorageService.addFeedback(feedback);
    setFeedbackHistory(StorageService.getFeedbackHistory());
    setFields(StorageService.getFields());
  };

  const handleInstantFeedback = (type: FeedbackType, note?: string) => {
    if (!activeField) return;
    handleAddFeedback({
      fieldId: activeField.id,
      feedbackType: type,
      userComment: note,
      systemActionTaken:
        type === 'soil_still_dry'
          ? 'AI ghi nhận đất khô nhanh: Tăng độ nhạy tưới'
          : type === 'soil_too_wet'
          ? 'AI ghi nhận đất thoát chậm: Ưu tiên thoát nước'
          : 'Đã lưu phản hồi vào nhật ký huấn luyện',
      appliedToProfile: true,
    });
  };

  // Map Picker Coordinate Selection
  const handleMapCoordinateSelected = (lat: number, lon: number) => {
    if (activeField) {
      const updated = {
        ...activeField,
        lat,
        lon,
      };
      StorageService.updateField(updated);
      setFields(StorageService.getFields());
    }
  };

  if (!activeField) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <Sprout className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <div className="font-bold text-stone-800">Đang khởi tạo AgriNASA AI...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans antialiased">
      {/* Responsive Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fields={fields}
        activeField={activeField}
        onSelectField={handleSelectField}
        onOpenNewFieldModal={() => {
          setWizardOpen(true);
          setActiveTab('fields');
        }}
        onOpenDemoCompare={() => setDemoCompareOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            field={activeField}
            weather={weather}
            brief={ruleBrief}
            onOpenExplanation={() => setExplanationOpen(true)}
            onOpenMap={() => {
              setMapInitialCoords({ lat: activeField.lat, lon: activeField.lon });
              setMapPickerOpen(true);
            }}
            onNavigateTab={setActiveTab}
            onSendFeedback={handleInstantFeedback}
            onTaskCompleted={title => {
              // mark task matching or general
            }}
          />
        )}

        {activeTab === 'fields' && (
          <MyFieldsView
            fields={fields}
            activeField={activeField}
            onSelectField={handleSelectField}
            onAddNewField={handleAddNewField}
            onDeleteField={handleDeleteField}
            onOpenMapPicker={(curLat, curLon) => {
              setMapInitialCoords({ lat: curLat, lon: curLon });
              setMapPickerOpen(true);
            }}
            wizardOpen={wizardOpen}
            setWizardOpen={setWizardOpen}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            fields={fields}
            activeField={activeField}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onNavigateTab={setActiveTab}
            onOpenFeedback={() => setActiveTab('feedback')}
          />
        )}

        {activeTab === 'analytics' && (
          <NasaAnalyticsView
            field={activeField}
            weather={weather}
            onOpenMap={() => {
              setMapInitialCoords({ lat: activeField.lat, lon: activeField.lon });
              setMapPickerOpen(true);
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <PlantingCalendarView activeField={activeField} />
        )}

        {activeTab === 'assistant' && (
          <AiAssistantView activeField={activeField} weather={weather} />
        )}

        {activeTab === 'feedback' && (
          <FeedbackHistoryView
            activeField={activeField}
            feedbackHistory={feedbackHistory}
            onAddFeedback={handleAddFeedback}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDataManagementView />
        )}
      </main>

      {/* Modals & Drawers */}
      <ExplanationDrawer
        isOpen={explanationOpen}
        onClose={() => setExplanationOpen(false)}
        brief={ruleBrief}
        field={activeField}
        weather={weather}
      />

      <DemoCompareModal
        isOpen={demoCompareOpen}
        onClose={() => setDemoCompareOpen(false)}
      />

      <InteractiveMapModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        selectedLat={mapInitialCoords.lat}
        selectedLon={mapInitialCoords.lon}
        onSelectCoordinates={handleMapCoordinateSelected}
      />

      {/* Modern Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 px-4 text-xs text-stone-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              <Sprout className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-stone-800">AgriNASA AI</span>
            <span>— Trợ lý canh tác cá nhân hóa từ dữ liệu NASA POWER (2005–2025)</span>
          </div>

          <div className="flex items-center gap-4 text-stone-600">
            <span className="flex items-center gap-1 text-emerald-800 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Minh bạch khoa học
            </span>
            <button
              onClick={() => setDemoCompareOpen(true)}
              className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
            >
              Demo Space Apps
            </button>
            <span>Phủ sóng 531 ô lưới Việt Nam</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
