import React, { useState } from 'react';
import {
  Sprout,
  Satellite,
  Layers,
  CalendarCheck,
  BarChart3,
  CalendarDays,
  Bot,
  History,
  Menu,
  X,
  ChevronDown,
  Plus,
  Flame,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { FieldProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  fields: FieldProfile[];
  activeField: FieldProfile;
  onSelectField: (fieldId: string) => void;
  onOpenNewFieldModal: () => void;
  onOpenDemoCompare: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  fields,
  activeField,
  onSelectField,
  onOpenNewFieldModal,
  onOpenDemoCompare,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: Layers },
    { id: 'fields', label: 'Ruộng của tôi', icon: Sprout },
    { id: 'tasks', label: 'Việc cần làm', icon: CalendarCheck },
    { id: 'analytics', label: 'Phân tích NASA', icon: BarChart3 },
    { id: 'calendar', label: 'Lịch gieo trồng', icon: CalendarDays },
    { id: 'assistant', label: 'Trợ lý AI', icon: Bot },
    { id: 'feedback', label: 'Lịch sử & Phản hồi', icon: History },
    { id: 'admin', label: 'Quản trị NASA', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      {/* Top Banner with slogan & Space Apps challenge tag */}
      <div className="bg-emerald-900 text-emerald-100 text-xs py-1.5 px-4 hidden sm:flex justify-between items-center">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
            <Satellite className="w-3.5 h-3.5" /> NASA POWER (2005–2025):
          </span>
          <span className="truncate">531 ô lưới phủ khắp Việt Nam • Phân giải 0.5° • Phân tích khí hậu 21 năm</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenDemoCompare}
            className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 fill-current" /> Demo NASA Space Apps (So sánh 2 ruộng)
          </button>
          <span className="text-emerald-400 font-medium">Phiên bản Nông dân 4.0</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-stone-900 tracking-tight">AgriNASA</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">AI</span>
              </div>
              <p className="text-[11px] text-stone-500 hidden md:block">
                Trợ lý canh tác cá nhân hóa từ dữ liệu NASA
              </p>
            </div>
          </div>

          {/* Field Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFieldDropdownOpen(!fieldDropdownOpen)}
              className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-lg border border-stone-200 text-xs sm:text-sm text-stone-800 font-medium transition cursor-pointer max-w-[210px] sm:max-w-xs truncate"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <div className="text-left truncate">
                <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold leading-none">
                  Thửa ruộng đang xem
                </div>
                <div className="truncate font-semibold text-stone-900">{activeField?.name || 'Chọn thửa ruộng'}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-500 shrink-0 ml-1" />
            </button>

            {fieldDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Danh sách thửa ruộng ({fields.length})
                </div>
                {fields.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelectField(f.id);
                      setFieldDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-start justify-between hover:bg-stone-50 transition cursor-pointer ${
                      f.id === activeField?.id ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-stone-900">{f.name}</div>
                      <div className="text-[11px] text-stone-500">
                        {f.crop.name} • {f.province}
                      </div>
                    </div>
                    {f.id === activeField?.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                  </button>
                ))}
                <div className="border-t border-stone-100 mt-1 pt-1 px-2">
                  <button
                    onClick={() => {
                      onOpenNewFieldModal();
                      setFieldDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm thửa ruộng mới
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onOpenDemoCompare}
              className="sm:hidden bg-amber-500 text-stone-900 px-2 py-1 rounded text-xs font-bold"
            >
              Demo So sánh
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="py-1">
            <button
              onClick={() => {
                onOpenDemoCompare();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-stone-900 font-bold py-2 rounded-lg text-xs"
            >
              <Flame className="w-4 h-4 fill-current" /> Demo NASA Space Apps (So sánh 2 ruộng)
            </button>
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-emerald-800 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
