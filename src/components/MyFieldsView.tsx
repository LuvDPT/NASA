import React, { useState } from 'react';
import {
  Sprout,
  Plus,
  MapPin,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Droplets,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { FieldProfile, SoilType, WaterSourceType, CropCategory } from '../types';
import { getSoilLabel, getDrainageLabel, getWaterLabel, getGoalLabel } from '../services/agronomyEngine';

interface MyFieldsViewProps {
  fields: FieldProfile[];
  activeField: FieldProfile;
  onSelectField: (id: string) => void;
  onAddNewField: (field: Omit<FieldProfile, 'id' | 'nasaGrid'>) => void;
  onDeleteField: (id: string) => void;
  onOpenMapPicker: (currentLat: number, currentLon: number) => void;
  wizardOpen: boolean;
  setWizardOpen: (open: boolean) => void;
}

export const MyFieldsView: React.FC<MyFieldsViewProps> = ({
  fields,
  activeField,
  onSelectField,
  onAddNewField,
  onDeleteField,
  onOpenMapPicker,
  wizardOpen,
  setWizardOpen,
}) => {
  // Wizard steps: 1: Location, 2: Soil, 3: Water, 4: Crop, 5: Goal
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [name, setName] = useState('');
  const [province, setProvince] = useState('Hà Nội');
  const [district, setDistrict] = useState('');
  const [lat, setLat] = useState(21.03);
  const [lon, setLon] = useState(105.85);
  const [areaHa, setAreaHa] = useState(1.0);

  // Soil
  const [soilType, setSoilType] = useState<SoilType>('loam');
  const [drainage, setDrainage] = useState<'fast' | 'moderate' | 'slow'>('moderate');
  const [holdsWater, setHoldsWater] = useState(true);
  const [proneToFlooding, setProneToFlooding] = useState(false);
  const [ph, setPh] = useState<number | undefined>(undefined);
  const [soilUnknownHelper, setSoilUnknownHelper] = useState(false);

  // Water
  const [waterSourceType, setWaterSourceType] = useState<WaterSourceType>('pond');
  const [waterStable, setWaterStable] = useState(true);
  const [waterObs, setWaterObs] = useState<'clear' | 'turbid' | 'odor' | 'normal'>('normal');
  const [hasTest, setHasTest] = useState(false);
  const [salinityRisk, setSalinityRisk] = useState(false);

  // Crop
  const [cropName, setCropName] = useState('Lúa');
  const [cropCategory, setCropCategory] = useState<CropCategory>('rice');
  const [variety, setVariety] = useState('ST25');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentStage, setCurrentStage] = useState('Cây con / Mạ non');
  const [farmingMethod, setFarmingMethod] = useState('Tiêu chuẩn an toàn VietGAP');
  const [irrigationMethod, setIrrigationMethod] = useState('Tưới ngập khô xen kẽ');

  // Goals
  const [primaryGoal, setPrimaryGoal] = useState<'save_water' | 'minimize_risk' | 'stabilize_yield' | 'optimize_cost'>('minimize_risk');
  const [inspectTime, setInspectTime] = useState<'morning' | 'afternoon' | 'anytime'>('morning');

  const handleFinishWizard = () => {
    if (!name.trim()) return;

    onAddNewField({
      name: name.trim(),
      province,
      district: district.trim() || 'Khu vực canh tác',
      lat,
      lon,
      areaHa,
      soilType,
      soilCharacteristics: {
        drainage,
        holdsWater,
        proneToFlooding,
        ph,
      },
      waterSource: {
        type: waterSourceType,
        isStable: waterStable,
        observation: waterObs,
        hasTestResult: hasTest,
        salinityRisk,
      },
      crop: {
        name: cropName,
        category: cropCategory,
        variety,
        plantingDate,
        currentStage,
        stageIndex: 1,
        farmingMethod,
        irrigationMethod,
        healthStatus: 'healthy',
      },
      primaryGoal,
      inspectTime,
      notificationMethod: 'in_app',
    });

    setWizardOpen(false);
    setCurrentStep(1);
    // Reset defaults
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Quản lý Thửa ruộng của bạn</h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Mỗi thửa ruộng có vị trí, chất đất, nguồn nước và giống cây riêng biệt để AI tối ưu hóa quyết định canh tác.
          </p>
        </div>
        <button
          onClick={() => {
            setWizardOpen(true);
            setCurrentStep(1);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tạo hồ sơ thửa ruộng mới
        </button>
      </div>

      {/* Field Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {fields.map(f => {
          const isActive = f.id === activeField.id;
          return (
            <div
              key={f.id}
              className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                  : 'border-stone-200 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {f.crop.name}
                  </span>
                  {isActive ? (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đang theo dõi
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectField(f.id)}
                      className="text-xs text-stone-500 hover:text-emerald-700 font-semibold cursor-pointer underline"
                    >
                      Chọn xem ruộng này
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-base text-stone-900">{f.name}</h3>
                <p className="text-xs text-stone-500">
                  {f.province}, {f.district} • Diện tích: {f.areaHa} ha
                </p>
              </div>

              {/* Detailed summary tags */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-100">
                <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                  <span className="text-stone-400 text-[10px] block">Chất đất:</span>
                  <span className="font-semibold text-stone-800">{getSoilLabel(f.soilType)}</span>
                  <span className="text-[11px] text-stone-500 block">({getDrainageLabel(f.soilCharacteristics.drainage)})</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                  <span className="text-stone-400 text-[10px] block">Giai đoạn:</span>
                  <span className="font-semibold text-stone-800">{f.crop.currentStage}</span>
                  <span className="text-[11px] text-stone-500 block">Giống: {f.crop.variety}</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                  <span className="text-stone-400 text-[10px] block">Nguồn nước:</span>
                  <span className="font-semibold text-stone-800">{getWaterLabel(f.waterSource.type)}</span>
                  <span className="text-[11px] text-stone-500 block">{f.waterSource.observation}</span>
                </div>
                <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                  <span className="text-stone-400 text-[10px] block">Ô lưới NASA:</span>
                  <span className="font-semibold text-stone-800">{f.nasaGrid.cellId}</span>
                  <span className="text-[11px] text-emerald-700 font-medium block">Cách {f.nasaGrid.distanceKm} km</span>
                </div>
              </div>

              {/* Learned Memory Tag */}
              {f.adaptiveMemory?.soilAdjustment && (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-900 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <span>AI đã học: {f.adaptiveMemory.soilAdjustment}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  onClick={() => onSelectField(f.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {isActive ? 'Đang chọn xem' : 'Chuyển sang ruộng này'}
                </button>

                {fields.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa thửa ruộng "${f.name}" không?`)) {
                        onDeleteField(f.id);
                      }
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Xóa thửa ruộng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5-STEP FIELD PROFILE CREATION WIZARD MODAL */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Tạo Hồ sơ Canh tác Thửa ruộng Cá nhân hóa</h2>
                  <p className="text-xs text-emerald-200">
                    Bước {currentStep}/5: {
                      currentStep === 1 ? 'Vị trí địa lý' :
                      currentStep === 2 ? 'Đặc điểm đất' :
                      currentStep === 3 ? 'Nguồn nước tưới' :
                      currentStep === 4 ? 'Cây trồng & giống' : 'Mục tiêu canh tác'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWizardOpen(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="px-6 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600">
              {[
                { s: 1, label: '1. Vị trí' },
                { s: 2, label: '2. Đất' },
                { s: 3, label: '3. Nước' },
                { s: 4, label: '4. Cây' },
                { s: 5, label: '5. Mục tiêu' },
              ].map(st => (
                <div
                  key={st.s}
                  className={`flex items-center gap-1 font-semibold ${
                    currentStep === st.s
                      ? 'text-emerald-700 border-b-2 border-emerald-700 pb-0.5'
                      : currentStep > st.s
                      ? 'text-stone-900'
                      : 'text-stone-400'
                  }`}
                >
                  {st.label}
                </div>
              ))}
            </div>

            {/* Step Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {/* STEP 1: VỊ TRÍ ĐỊA LÝ */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-stone-800 block mb-1">Tên thửa ruộng đặt theo ý bạn *</label>
                    <input
                      type="text"
                      placeholder="VD: Ruộng rau bãi ngoài, Ruộng lúa đằng sau nhà..."
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 focus:outline-emerald-600 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Tỉnh / Thành phố *</label>
                      <input
                        type="text"
                        value={province}
                        onChange={e => setProvince(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Huyện / Xã / Thôn</label>
                      <input
                        type="text"
                        placeholder="VD: Xã Tiền Phong"
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">Tọa độ GPS định vị ô NASA:</span>
                      <button
                        type="button"
                        onClick={() => onOpenMapPicker(lat, lon)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Chọn vị trí trên bản đồ
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-stone-500 text-xs">Vĩ độ (°N):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={lat}
                          onChange={e => setLat(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-stone-500 text-xs">Kinh độ (°E):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={lon}
                          onChange={e => setLon(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-500 italic">
                      * Nhập vị trí cụ thể giúp hệ thống ghép chính xác với ô lưới NASA 0.5° gần nhất.
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-stone-800 block mb-1">Diện tích canh tác (ha hoặc sào)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={areaHa}
                        onChange={e => setAreaHa(parseFloat(e.target.value) || 0.1)}
                        className="w-32 px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                      />
                      <span className="text-stone-600 text-xs">Hecta (ha)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ĐẶC ĐIỂM ĐẤT */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-stone-800 block mb-2">Loại đất chính của thửa ruộng</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { type: 'sand', label: 'Đất cát' },
                        { type: 'loam', label: 'Đất thịt' },
                        { type: 'clay', label: 'Đất sét' },
                        { type: 'alluvial', label: 'Đất phù sa' },
                        { type: 'basalt', label: 'Đất đỏ bazan' },
                        { type: 'acid_sulfate', label: 'Đất phèn' },
                        { type: 'saline', label: 'Đất mặn' },
                        { type: 'unknown', label: 'Không biết loại đất' },
                      ].map(item => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setSoilType(item.type as SoilType);
                            if (item.type === 'unknown') setSoilUnknownHelper(true);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                            soilType === item.type
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Soil Helper if unknown */}
                  {soilType === 'unknown' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-amber-700" />
                        Trợ lý nhận định sơ bộ loại đất (Không khẳng định tuyệt đối)
                      </div>
                      <p>
                        Khi bạn nắm một nắm đất ẩm trong lòng bàn tay và bóp chặt:
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="soilGuess"
                            onChange={() => {
                              setSoilType('sand');
                              setDrainage('fast');
                            }}
                          />
                          <span>Đất rời rạc, không vê thành viên được (Nghiêng về đất cát)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="soilGuess"
                            onChange={() => {
                              setSoilType('clay');
                              setDrainage('slow');
                            }}
                          />
                          <span>Đất dính chặt vào tay, nặn được dải dài bóng nhẵn (Nghiêng về đất sét)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="soilGuess"
                            onChange={() => {
                              setSoilType('loam');
                              setDrainage('moderate');
                            }}
                          />
                          <span>Vê được thành viên nhưng dễ vỡ khi ấn nhẹ (Nghiêng về đất thịt)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Khả năng thoát nước</label>
                      <select
                        value={drainage}
                        onChange={e => setDrainage(e.target.value as any)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900"
                      >
                        <option value="fast">Thoát nước nhanh (khô ráo sau 2-4 giờ)</option>
                        <option value="moderate">Thoát nước vừa phải (trung bình 1 ngày)</option>
                        <option value="slow">Thoát nước chậm (dễ ứ đọng nhiều ngày)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Độ pH đất (nếu đã đo)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="VD: 6.2 (Bỏ trống nếu chưa đo)"
                        value={ph || ''}
                        onChange={e => setPh(parseFloat(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-stone-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={holdsWater}
                        onChange={e => setHoldsWater(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                      />
                      <span>Đất giữ ẩm lâu sau mưa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={proneToFlooding}
                        onChange={e => setProneToFlooding(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                      />
                      <span>Ruộng nằm ở vùng trũng hay bị ngập úng</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: NGUỒN NƯỚC */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-stone-800 block mb-2">Nguồn nước tưới chính</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { type: 'river', label: 'Nước sông / kênh mương' },
                        { type: 'pond', label: 'Nước ao / hồ chứa' },
                        { type: 'well', label: 'Nước giếng khoan / ngầm' },
                        { type: 'tap', label: 'Nước máy sinh hoạt' },
                        { type: 'rain', label: 'Chỉ dựa vào nước mưa' },
                        { type: 'other', label: 'Nguồn khác' },
                      ].map(item => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setWaterSourceType(item.type as WaterSourceType)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                            waterSourceType === item.type
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Quan sát cảm quan màu nước</label>
                      <select
                        value={waterObs}
                        onChange={e => setWaterObs(e.target.value as any)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900"
                      >
                        <option value="normal">Nước bình thường, không mùi</option>
                        <option value="clear">Nước rất trong</option>
                        <option value="turbid">Nước nhiều phù sa / đục bùn</option>
                        <option value="odor">Nước có mùi lạ / nghi ngờ ô nhiễm</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Tính ổn định của nguồn nước</label>
                      <select
                        value={waterStable ? 'true' : 'false'}
                        onChange={e => setWaterStable(e.target.value === 'true')}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900"
                      >
                        <option value="true">Dồi dào quanh năm, không lo cạn</option>
                        <option value="false">Dễ bị cạn kiệt vào cao điểm mùa khô</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-stone-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={salinityRisk}
                        onChange={e => setSalinityRisk(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                      />
                      <span>Khu vực có nguy cơ xâm nhập mặn mùa khô</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasTest}
                        onChange={e => setHasTest(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                      />
                      <span>Đã từng xét nghiệm chất lượng nước phòng thí nghiệm</span>
                    </label>
                  </div>

                  <div className="p-3 bg-stone-100 rounded-xl text-stone-600 text-[11px] leading-relaxed flex items-start gap-1.5">
                    <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <span>
                      Nguyên tắc minh bạch: AI không kết luận nguồn nước an toàn hoặc ô nhiễm chỉ từ dữ liệu viễn thám NASA hay mắt thường nếu chưa có xét nghiệm cụ thể.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 4: THÔNG TIN CÂY TRỒNG */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Loại cây trồng *</label>
                      <input
                        type="text"
                        value={cropName}
                        onChange={e => setCropName(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 font-semibold"
                        placeholder="VD: Lúa, Rau cải, Bắp ngô, Sầu riêng..."
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Giống cây cụ thể</label>
                      <input
                        type="text"
                        value={variety}
                        onChange={e => setVariety(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                        placeholder="VD: ST25, Đài Thơm 8, Cải ngọt F1..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Ngày gieo trồng / xuống giống</label>
                      <input
                        type="date"
                        value={plantingDate}
                        onChange={e => setPlantingDate(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Giai đoạn sinh trưởng hiện tại</label>
                      <input
                        type="text"
                        value={currentStage}
                        onChange={e => setCurrentStage(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900 font-medium"
                        placeholder="VD: Cây con, Đẻ nhánh, Làm đòng, Trổ hoa..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Phương pháp canh tác</label>
                      <input
                        type="text"
                        value={farmingMethod}
                        onChange={e => setFarmingMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                        placeholder="VD: VietGAP, Hữu cơ, Truyền thống..."
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Phương pháp tưới</label>
                      <input
                        type="text"
                        value={irrigationMethod}
                        onChange={e => setIrrigationMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl text-stone-900"
                        placeholder="VD: Tưới rãnh, Phun sương, Nhỏ giọt..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: MỤC TIÊU & THỜI GIAN THĂM RUỘNG */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-stone-800 block mb-2">Mục tiêu canh tác ưu tiên hàng đầu của bạn</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { goal: 'minimize_risk', title: 'Giảm thiểu rủi ro thời tiết', desc: 'Ưu tiên phòng tránh rét đậm, úng ngập, sốc nhiệt' },
                        { goal: 'save_water', title: 'Tiết kiệm nước tưới', desc: 'Tối ưu chu kỳ tưới, giảm chi phí nhiên liệu/bơm' },
                        { goal: 'stabilize_yield', title: 'Ổn định năng suất & chất lượng', desc: 'Duy trì cân bằng dinh dưỡng và ẩm độ rễ chuẩn' },
                        { goal: 'optimize_cost', title: 'Tối ưu chi phí phân thuốc', desc: 'Tránh bón phân trước mưa lớn hoặc khi cây hấp thu kém' },
                      ].map(item => (
                        <button
                          key={item.goal}
                          type="button"
                          onClick={() => setPrimaryGoal(item.goal as any)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            primaryGoal === item.goal
                              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/20'
                              : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <div className="font-bold text-xs text-stone-900">{item.title}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Thời gian bạn thường thăm ruộng</label>
                      <select
                        value={inspectTime}
                        onChange={e => setInspectTime(e.target.value as any)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900"
                      >
                        <option value="morning">Buổi sáng sớm (05:30 - 08:00)</option>
                        <option value="afternoon">Buổi chiều mát (16:00 - 18:30)</option>
                        <option value="anytime">Linh hoạt bất kỳ lúc nào</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-stone-800 block mb-1">Hình thức nhận nhắc nhở</label>
                      <select className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white text-stone-900">
                        <option value="in_app">Thông báo trực tiếp trên ứng dụng</option>
                        <option value="push">Web Push Notification</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Hồ sơ cá nhân hóa của bạn đã sẵn sàng!
                    </div>
                    <p>
                      Khi nhấn Hoàn thành, AI sẽ ghép tọa độ với ô lưới NASA 21 năm, đối chiếu chu kỳ khí hậu và sinh ra bản tin quyết định canh tác cùng lịch công việc thích ứng riêng cho thửa ruộng này.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Footer Controls */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 font-semibold rounded-xl text-xs hover:bg-stone-100 transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Quay lại
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="px-4 py-2 text-stone-500 font-semibold text-xs hover:underline cursor-pointer"
                >
                  Hủy bỏ
                </button>
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && !name.trim()) {
                      alert('Vui lòng nhập tên thửa ruộng!');
                      return;
                    }
                    setCurrentStep(prev => prev + 1);
                  }}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  Tiếp theo <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishWizard}
                  className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-700/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Hoàn thành & Kích hoạt AI
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
