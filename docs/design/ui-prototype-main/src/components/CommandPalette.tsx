import React, { useState, useEffect } from 'react';
import { Student, Contract, Room, TabType } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  contracts: Contract[];
  rooms: Room[];
  onNavigate: (tab: TabType) => void;
  onSelectStudent: (student: Student) => void;
  onSelectContract: (contract: Contract) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  students,
  contracts,
  rooms,
  onNavigate,
  onSelectStudent,
  onSelectContract,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchingStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.mssv.includes(q) ||
      s.roomNumber.toLowerCase().includes(q)
  ).slice(0, 4);

  const matchingContracts = contracts.filter(
    (c) =>
      c.contractNumber.toLowerCase().includes(q) ||
      c.studentName.toLowerCase().includes(q) ||
      c.mssv.includes(q) ||
      c.roomNumber.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchingRooms = rooms.filter(
    (r) => r.roomNumber.toLowerCase().includes(q) || r.buildingName.toLowerCase().includes(q)
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232B3B] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-[#232B3B]">
          <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
          <input
            autoFocus
            type="text"
            placeholder="Tìm sinh viên (tên, MSSV), phòng, hợp đồng, lệnh thao tác..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <kbd
            onClick={onClose}
            className="cursor-pointer text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          {!q && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Lối tắt thao tác nhanh
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('dashboard');
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">
                    dashboard
                  </span>
                  Về Dashboard Tổng quan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('don-dang-ky');
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">
                    how_to_reg
                  </span>
                  Xét duyệt đơn đăng ký K65
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('hop-dong');
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">
                    edit_document
                  </span>
                  Quản lý Hợp đồng cư xá
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('phong-va-giuong');
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#0B2A5B] dark:text-blue-400">
                    domain
                  </span>
                  Xem sơ đồ buồng phòng KTX
                </button>
              </div>
            </div>
          )}

          {/* Students matches */}
          {matchingStudents.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Sinh viên
              </div>
              <div className="space-y-1">
                {matchingStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelectStudent(s);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200">
                        <img src={s.avatarUrl} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-white">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          MSSV: {s.mssv} · {s.className}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-[#0B2A5B] dark:text-blue-300">
                      {s.roomNumber} · {s.bedNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contracts matches */}
          {matchingContracts.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Hợp đồng
              </div>
              <div className="space-y-1">
                {matchingContracts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectContract(c);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#0B2A5B] dark:text-blue-400">
                        {c.contractNumber}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {c.studentName} ({c.mssv}) · Phòng {c.roomNumber}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rooms matches */}
          {matchingRooms.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Buồng phòng
              </div>
              <div className="space-y-1">
                {matchingRooms.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      onNavigate('phong-va-giuong');
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">
                        meeting_room
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-white">
                        Phòng {r.roomNumber} ({r.buildingName})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {r.occupied}/{r.capacity} giường ({r.gender})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q && matchingStudents.length === 0 && matchingContracts.length === 0 && matchingRooms.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Không tìm thấy kết quả nào phù hợp với &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
