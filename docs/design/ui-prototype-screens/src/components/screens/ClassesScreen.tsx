import React, { useState, useMemo } from 'react';
import { INITIAL_CLASSES, ClassItem } from '../../data/mockData.ts';

interface ClassesScreenProps {
  onShowToast: (msg: string) => void;
}

export const ClassesScreen: React.FC<ClassesScreenProps> = ({ onShowToast }) => {
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [searchTerm, setSearchTerm] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClassForView, setSelectedClassForView] = useState<ClassItem | null>(null);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  // Form states for new class
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newFaculty, setNewFaculty] = useState('Khoa Công nghệ thông tin');
  const [newFacultyKey, setNewFacultyKey] = useState('cntt');
  const [newAdvisor, setNewAdvisor] = useState('');
  const [newCohort, setNewCohort] = useState('k65');
  const [newTotal, setNewTotal] = useState(50);
  const [newResidents, setNewResidents] = useState(25);

  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.advisor.toLowerCase().includes(searchTerm.toLowerCase());

      const matchFaculty = !facultyFilter || item.facultyKey === facultyFilter;
      const matchCohort = !cohortFilter || item.cohort === cohortFilter;

      return matchSearch && matchFaculty && matchCohort;
    });
  }, [classes, searchTerm, facultyFilter, cohortFilter]);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      onShowToast('Vui lòng nhập đầy đủ mã và tên lớp!');
      return;
    }

    const calculatedRate = newTotal > 0 ? Math.round((newResidents / newTotal) * 1000) / 10 : 0;
    const newClassItem: ClassItem = {
      id: 'c_' + Date.now(),
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      faculty: newFaculty,
      facultyKey: newFacultyKey,
      advisor: newAdvisor || 'Chưa phân công',
      cohort: newCohort,
      residents: Number(newResidents),
      totalStudents: Number(newTotal),
      rate: calculatedRate,
    };

    setClasses([newClassItem, ...classes]);
    setIsAddModalOpen(false);
    // Reset form
    setNewCode('');
    setNewName('');
    setNewAdvisor('');
    onShowToast(`Đã thêm thành công lớp ${newClassItem.code}!`);
  };

  const handleExportData = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Mã Lớp,Tên Lớp,Khoa Viện,Cố Vấn Học Tập,Nội Trú,Sĩ Số,Tỷ Lệ']
        .concat(
          filteredClasses.map(
            (c) => `"${c.code}","${c.name}","${c.faculty}","${c.advisor}",${c.residents},${c.totalStudents},"${c.rate}%"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `danh_sach_lop_KTX_UTC2.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Đã xuất danh sách lớp thành file CSV thành công!');
  };

  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* Header Title & Quick Action Sub-bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-md">
        <div>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-semibold">
            SINH VIÊN · PHÂN BỔ ĐƠN VỊ
          </span>
          <h1 className="font-headline-lg text-headline-lg text-[#111c2d] font-bold tracking-tight mt-0.5">
            Quản lý Lớp &amp; Khoa viện
          </h1>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 h-10 px-space-md rounded-xl bg-[#e8eeff] hover:bg-[#dfe8ff] text-[#00163a] font-label-md text-label-md font-medium transition-all shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>Xuất dữ liệu</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-space-md rounded-xl bg-[#0b2a5b] hover:bg-[#00163a] text-white font-label-md text-label-md font-medium transition-all shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Thêm lớp mới</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between space-y-space-md border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-bold">
              KHOA / VIỆN
            </span>
            <span className="material-symbols-outlined text-[#c4c6d0] text-xl">account_balance</span>
          </div>
          <div>
            <div className="font-display-metric text-display-metric text-[#00163a] font-bold tracking-tight">8</div>
            <div className="font-body-sm text-body-sm text-[#747780] mt-1 font-medium">Đơn vị chuyên trách</div>
          </div>
        </div>

        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between space-y-space-md border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-bold">
              TỔNG SỐ LỚP
            </span>
            <span className="material-symbols-outlined text-[#c4c6d0] text-xl">groups_3</span>
          </div>
          <div>
            <div className="font-display-metric text-display-metric text-[#00163a] font-bold tracking-tight">142</div>
            <div className="font-body-sm text-body-sm text-[#747780] mt-1 font-medium">
              Toàn hệ đại học &amp; liên thông
            </div>
          </div>
        </div>

        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between space-y-space-md border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-bold">
              SINH VIÊN NỘI TRÚ
            </span>
            <span className="material-symbols-outlined text-[#c4c6d0] text-xl">bed</span>
          </div>
          <div>
            <div className="font-display-metric text-display-metric text-[#00163a] font-bold tracking-tight">3.420</div>
            <div className="font-body-sm text-body-sm text-[#747780] mt-1 font-medium">Hồ sơ đã cấp giường</div>
          </div>
        </div>

        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between space-y-space-md border border-[#dfe8ff]/60">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#747780] font-bold">
              TỶ LỆ NỘI TRÚ
            </span>
            <span className="material-symbols-outlined text-[#c4c6d0] text-xl">pie_chart</span>
          </div>
          <div>
            <div className="font-display-metric text-display-metric text-[#00163a] font-bold tracking-tight">24.8%</div>
            <div className="font-body-sm text-body-sm text-[#747780] mt-1 font-medium">Toàn phân hiệu UTC2</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-space-md rounded-xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border border-[#dfe8ff]/60">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#747780] text-lg pointer-events-none">
              search
            </span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#747780] font-body-md text-body-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/20 border border-transparent focus:border-[#c4c6d0] transition-colors"
              placeholder="Tìm theo mã lớp, tên lớp, CVHT..."
              type="text"
            />
          </div>

          <div className="relative min-w-[210px]">
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="w-full h-10 px-3 bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md rounded-xl focus:outline-none cursor-pointer appearance-none pr-8 border border-transparent hover:border-[#c4c6d0]"
            >
              <option value="">Tất cả Khoa / Viện</option>
              <option value="cntt">Công nghệ thông tin</option>
              <option value="ktvt">Kinh tế vận tải</option>
              <option value="ck">Cơ khí</option>
              <option value="ktxd">Kỹ thuật xây dựng</option>
              <option value="dt">Điện - Điện tử</option>
              <option value="ct">Kỹ thuật công trình</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#747780] text-base pointer-events-none">
              expand_more
            </span>
          </div>

          <div className="relative min-w-[130px]">
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              className="w-full h-10 px-3 bg-[#f0f3ff] text-[#111c2d] font-body-md text-body-md rounded-xl focus:outline-none cursor-pointer appearance-none pr-8 border border-transparent hover:border-[#c4c6d0]"
            >
              <option value="">Tất cả Khóa</option>
              <option value="k65">Khóa 65</option>
              <option value="k64">Khóa 64</option>
              <option value="k63">Khóa 63</option>
              <option value="k62">Khóa 62</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#747780] text-base pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm text-[#747780] font-label-sm text-label-sm self-end lg:self-center">
          <span>
            Hiển thị <span className="text-[#111c2d] font-semibold">{filteredClasses.length}</span> / 142 lớp
          </span>
        </div>
      </div>

      {/* Main Data Table Container */}
      <div className="bg-white rounded-xl shadow-xs overflow-hidden flex flex-col border border-[#dfe8ff]/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#44474f] font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-space-md font-semibold">Mã Lớp</th>
                <th className="py-3 px-space-md font-semibold">Tên Lớp Học</th>
                <th className="py-3 px-space-md font-semibold">Khoa / Viện Quản Lý</th>
                <th className="py-3 px-space-md font-semibold">Cố Vấn Học Tập</th>
                <th className="py-3 px-space-md font-semibold text-center">Nội Trú / Sĩ Số</th>
                <th className="py-3 px-space-md font-semibold text-right">Tỷ Lệ Ở KTX</th>
                <th className="py-3 px-space-md font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-[#111c2d] divide-y divide-[#f0f3ff]">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#747780] text-sm">
                    Không tìm thấy lớp học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f0f3ff]/60 transition-colors">
                    <td className="py-3.5 px-space-md font-code-metric text-code-metric text-[#00163a] font-semibold">
                      {item.code}
                    </td>
                    <td className="py-3.5 px-space-md font-medium">{item.name}</td>
                    <td className="py-3.5 px-space-md text-[#44474f]">{item.faculty}</td>
                    <td className="py-3.5 px-space-md">{item.advisor}</td>
                    <td className="py-3.5 px-space-md text-center">
                      <span className="font-semibold text-[#00163a]">{item.residents}</span>
                      <span className="text-[#747780]">/ {item.totalStudents}</span>
                    </td>
                    <td className="py-3.5 px-space-md text-right">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-semibold text-[#00163a]">{item.rate}%</span>
                        <div className="w-16 h-1.5 bg-[#e8eeff] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0b2a5b] rounded-full" style={{ width: `${Math.min(100, item.rate)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-space-md text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setSelectedClassForView(item)}
                          className="p-1.5 rounded-lg text-[#747780] hover:text-[#00163a] hover:bg-[#e8eeff] transition-colors"
                          title="Xem danh sách SV"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingClass(item);
                            onShowToast(`Mở hộp thoại cập nhật cho lớp ${item.code}`);
                          }}
                          className="p-1.5 rounded-lg text-[#747780] hover:text-[#00163a] hover:bg-[#e8eeff] transition-colors"
                          title="Chỉnh sửa"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Pagination Footer */}
        <div className="px-space-md py-3 bg-[#f0f3ff] flex flex-col sm:flex-row items-center justify-between gap-space-sm text-[#747780] font-label-sm text-label-sm">
          <div>Đang xem hàng 1 đến {filteredClasses.length} trong tổng số 142 lớp</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#747780] hover:bg-[#e8eeff] hover:text-[#111c2d] transition-colors disabled:opacity-40 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold cursor-pointer ${
                currentPage === 1 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium cursor-pointer ${
                currentPage === 2 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium cursor-pointer ${
                currentPage === 3 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              3
            </button>
            <span className="px-1 text-[#747780]">...</span>
            <button
              onClick={() => setCurrentPage(18)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium cursor-pointer ${
                currentPage === 18 ? 'bg-[#0b2a5b] text-white' : 'hover:bg-[#e8eeff] text-[#111c2d]'
              }`}
              type="button"
            >
              18
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(18, p + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#747780] hover:bg-[#e8eeff] hover:text-[#111c2d] transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Thêm lớp mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">domain_add</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Thêm Lớp Học Mới</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44474f] mb-1">Mã Lớp Học *</label>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="VD: CNTT-K65B"
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474f] mb-1">Khóa học</label>
                  <select
                    value={newCohort}
                    onChange={(e) => setNewCohort(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  >
                    <option value="k65">Khóa 65</option>
                    <option value="k64">Khóa 64</option>
                    <option value="k63">Khóa 63</option>
                    <option value="k62">Khóa 62</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44474f] mb-1">Tên Chuyên Ngành / Lớp *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Khoa học dữ liệu K65B"
                  required
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44474f] mb-1">Khoa / Viện Quản Lý</label>
                <select
                  value={newFacultyKey}
                  onChange={(e) => {
                    setNewFacultyKey(e.target.value);
                    const opt = e.target.options[e.target.selectedIndex];
                    setNewFaculty(opt.text);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                >
                  <option value="cntt">Khoa Công nghệ thông tin</option>
                  <option value="ktvt">Khoa Kinh tế vận tải</option>
                  <option value="ck">Khoa Cơ khí</option>
                  <option value="ktxd">Khoa Kỹ thuật xây dựng</option>
                  <option value="dt">Khoa Điện - Điện tử</option>
                  <option value="ct">Khoa Kỹ thuật Công trình</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44474f] mb-1">Cố Vấn Học Tập</label>
                <input
                  value={newAdvisor}
                  onChange={(e) => setNewAdvisor(e.target.value)}
                  placeholder="VD: TS. Nguyễn Thanh Tùng"
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44474f] mb-1">Sĩ Số Cả Lớp</label>
                  <input
                    type="number"
                    value={newTotal}
                    onChange={(e) => setNewTotal(Number(e.target.value))}
                    min={1}
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474f] mb-1">SV Đang Ở KTX</label>
                  <input
                    type="number"
                    value={newResidents}
                    onChange={(e) => setNewResidents(Number(e.target.value))}
                    min={0}
                    max={newTotal}
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f3ff]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 h-10 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d] text-sm font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 h-10 rounded-xl bg-[#0b2a5b] hover:bg-[#00163a] text-white text-sm font-semibold shadow-xs"
                >
                  Lưu &amp; Thêm lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem danh sách sinh viên nội trú của lớp */}
      {selectedClassForView && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div>
                <span className="text-[11px] font-bold text-[#375ba9] uppercase tracking-wider">
                  DANH SÁCH SINH VIÊN NỘI TRÚ
                </span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">
                  Lớp {selectedClassForView.code} ({selectedClassForView.name})
                </h2>
              </div>
              <button
                onClick={() => setSelectedClassForView(null)}
                className="p-1 rounded-lg text-[#747780] hover:text-[#111c2d] hover:bg-[#f0f3ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-[#747780] flex items-center justify-between">
                <span>
                  Sĩ số nội trú: <strong className="text-[#00163a]">{selectedClassForView.residents}</strong> /{' '}
                  {selectedClassForView.totalStudents} sinh viên ({selectedClassForView.rate}%)
                </span>
                <span>CVHT: {selectedClassForView.advisor}</span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-[#dfe8ff] divide-y divide-[#f0f3ff]">
                {[
                  { mssv: '72DCHT21045', name: 'Trần Minh Hoàng', room: 'A2-304', bed: 'G.02', status: 'Đang ở' },
                  { mssv: '72DCHT21046', name: 'Nguyễn Văn Minh', room: 'A1-201', bed: 'G.01', status: 'Đang ở' },
                  { mssv: '72DCHT21088', name: 'Lê Hoàng Nam', room: 'A1-204', bed: 'G.03', status: 'Đang ở' },
                  { mssv: '72DCHT21102', name: 'Phạm Đức Duy', room: 'A3-512', bed: 'G.04', status: 'Đang ở' },
                  { mssv: '72DCHT21115', name: 'Đỗ Quốc Cường', room: 'A2-202', bed: 'G.01', status: 'Đang ở' },
                ].map((s, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#f9f9ff]">
                    <div className="flex items-center gap-2">
                      <span className="font-code-metric font-semibold text-[#00163a]">{s.mssv}</span>
                      <span className="font-medium text-[#111c2d]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#e8eeff] text-[#00163a] font-semibold">
                        Phòng {s.room} · {s.bed}
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedClassForView(null)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#111c2d] text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
