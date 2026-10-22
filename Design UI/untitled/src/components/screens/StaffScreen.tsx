import React, { useState, useMemo } from 'react';
import { INITIAL_STAFF, StaffItemData } from '../../data/mockData.ts';

interface StaffScreenProps {
  onShowToast: (msg: string) => void;
}

export const StaffScreen: React.FC<StaffScreenProps> = ({ onShowToast }) => {
  const [staffList, setStaffList] = useState<StaffItemData[]>(INITIAL_STAFF);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItemData | null>(null);
  const [passwordStaff, setPasswordStaff] = useState<StaffItemData | null>(null);

  // Add staff form
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newDept, setNewDept] = useState('Tổ Giám thị & Sinh viên');
  const [newDeptKey, setNewDeptKey] = useState<StaffItemData['departmentKey']>('gt');
  const [newArea, setNewArea] = useState('Tòa A01 & A02');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffItemData['role']>('Ban Quản lý');

  const filteredStaff = useMemo(() => {
    return staffList.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = !deptFilter || item.departmentKey === deptFilter;
      const matchRole = !roleFilter || item.roleKey === roleFilter;
      const matchStatus = !statusFilter || item.status === statusFilter;

      return matchSearch && matchDept && matchRole && matchStatus;
    });
  }, [staffList, searchTerm, deptFilter, roleFilter, statusFilter]);

  const handleToggleLock = (staff: StaffItemData) => {
    const isNowLocked = staff.status === 'active';
    const updated = staffList.map((s) => {
      if (s.id === staff.id) {
        return {
          ...s,
          status: isNowLocked ? ('locked' as const) : ('active' as const),
        };
      }
      return s;
    });

    setStaffList(updated);
    onShowToast(
      isNowLocked
        ? `Đã tạm khóa tài khoản của ${staff.name} (${staff.code})!`
        : `Đã mở khóa và kích hoạt tài khoản của ${staff.name}!`
    );
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newEmail.trim()) {
      onShowToast('Vui lòng điền đầy đủ họ tên, SĐT và email!');
      return;
    }

    const initials = newName
      .trim()
      .split(' ')
      .slice(-2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

    const nextCodeNum = String(staffList.length + 130).padStart(5, '0');
    const newStaffItem: StaffItemData = {
      id: 's_' + Date.now(),
      code: `NV-${nextCodeNum}`,
      name: newName.trim(),
      avatarText: initials || 'NV',
      lastLogin: 'Chưa đăng nhập',
      position: newPosition.trim() || 'Cán bộ KTX',
      department: newDept,
      departmentKey: newDeptKey,
      managedArea: newArea,
      phone: newPhone.trim(),
      email: newEmail.trim(),
      role: newRole,
      roleKey: newRole === 'System Admin' ? 'admin' : newRole === 'Ban Quản lý' ? 'manager' : 'operator',
      status: 'active',
    };

    setStaffList([newStaffItem, ...staffList]);
    setIsAddModalOpen(false);
    // Reset form
    setNewName('');
    setNewPosition('');
    setNewPhone('');
    setNewEmail('');
    onShowToast(`Đã tạo tài khoản cán bộ thành công cho ${newStaffItem.name} (${newStaffItem.code})!`);
  };

  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* Header Context & Quick Meta */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-[#375ba9] font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-sm">shield_person</span>
            <span className="font-semibold">Hệ thống quản trị nội bộ</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-[#00163a] tracking-tight font-bold">
            Quản lý Nhân viên &amp; Tài khoản
          </h1>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setIsRoleModalOpen(true)}
            className="h-10 px-space-md rounded-xl bg-[#dfe8ff] text-[#111c2d] hover:bg-[#d9e3fb] transition-all flex items-center gap-space-xs font-label-md shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            <span>Phân quyền vai trò</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-space-md rounded-xl bg-[#00163a] text-white hover:bg-[#0b2a5b] transition-all flex items-center gap-space-xs font-label-md shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>Thêm nhân sự mới</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-[#dfe8ff]/60">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#e8eeff] rounded-full opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[#747780] font-semibold uppercase tracking-wider">TỔNG NHÂN VIÊN</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label-sm bg-[#f0f3ff] text-[#375ba9] font-semibold">
              100%
            </span>
          </div>
          <div className="my-space-md flex items-baseline gap-space-xs">
            <span className="font-display-metric text-display-metric font-bold text-[#00163a] tracking-tight">28</span>
            <span className="font-body-md text-[#44474f]">người</span>
          </div>
          <div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '100%' }} />
            </div>
            <p className="font-body-sm text-[#44474f] mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#375ba9]">verified</span>
              28/28 tài khoản SSO đã kích hoạt
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-[#dfe8ff]/60">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#e8eeff] rounded-full opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[#747780] font-semibold uppercase tracking-wider">
              QUẢN LÝ / GIÁM THỊ
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label-sm bg-[#f0f3ff] text-[#375ba9] font-semibold">
              50%
            </span>
          </div>
          <div className="my-space-md flex items-baseline gap-space-xs">
            <span className="font-display-metric text-display-metric font-bold text-[#00163a] tracking-tight">14</span>
            <span className="font-body-md text-[#44474f]">cán bộ</span>
          </div>
          <div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '50%' }} />
            </div>
            <p className="font-body-sm text-[#44474f] mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#375ba9]">apartment</span>
              Phụ trách 4 tòa KTX A, B, C, D
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-[#dfe8ff]/60">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#e8eeff] rounded-full opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[#747780] font-semibold uppercase tracking-wider">
              KỸ THUẬT &amp; BẢO TRÌ
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label-sm bg-[#f0f3ff] text-[#375ba9] font-semibold">
              28.5%
            </span>
          </div>
          <div className="my-space-md flex items-baseline gap-space-xs">
            <span className="font-display-metric text-display-metric font-bold text-[#00163a] tracking-tight">8</span>
            <span className="font-body-md text-[#44474f]">nhân viên</span>
          </div>
          <div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '28.5%' }} />
            </div>
            <p className="font-body-sm text-[#44474f] mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#375ba9]">build</span>
              Điện nước hạ tầng &amp; thiết bị PCCC
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow border border-[#dfe8ff]/60">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#e8eeff] rounded-full opacity-40 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[#747780] font-semibold uppercase tracking-wider">
              BẢO VỆ / AN NINH
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-label-sm bg-[#f0f3ff] text-[#375ba9] font-semibold">
              21.5%
            </span>
          </div>
          <div className="my-space-md flex items-baseline gap-space-xs">
            <span className="font-display-metric text-display-metric font-bold text-[#00163a] tracking-tight">6</span>
            <span className="font-body-md text-[#44474f]">nhân sự</span>
          </div>
          <div>
            <div className="w-full bg-[#f0f3ff] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#375ba9] h-full rounded-full" style={{ width: '21.5%' }} />
            </div>
            <p className="font-body-sm text-[#44474f] mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#375ba9]">shield</span>
              Trực cổng kiểm soát 24/7 &amp; tuần tra
            </p>
          </div>
        </div>
      </div>

      {/* Operational Filter Hub */}
      <div className="bg-white rounded-xl p-space-md shadow-xs space-y-space-md border border-[#dfe8ff]/60">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#747780] text-lg pointer-events-none">
              search
            </span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-space-md rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#747780] font-body-md text-body-md focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00163a]/20 border border-transparent focus:border-[#c4c6d0] transition-all"
              placeholder="Tìm tên nhân sự, mã NV, SĐT, email..."
              type="text"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-space-sm flex-1 justify-end">
            <div className="relative min-w-[160px]">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md appearance-none cursor-pointer focus:outline-none focus:bg-white border border-transparent hover:border-[#c4c6d0] transition-all"
              >
                <option value="">Tất cả Bộ phận</option>
                <option value="bql">Ban quản lý</option>
                <option value="gt">Giám thị tòa</option>
                <option value="kt">Kỹ thuật viên</option>
                <option value="tc">Kế toán - Thu ngân</option>
                <option value="bv">Bảo vệ - An ninh</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#747780] pointer-events-none text-base">
                expand_more
              </span>
            </div>

            <div className="relative min-w-[150px]">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md appearance-none cursor-pointer focus:outline-none focus:bg-white border border-transparent hover:border-[#c4c6d0] transition-all"
              >
                <option value="">Tất cả Quyền hạn</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="manager">Ban Quản lý</option>
                <option value="operator">Kỹ thuật</option>
                <option value="viewer">Chỉ xem (Viewer)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#747780] pointer-events-none text-base">
                expand_more
              </span>
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-label-md appearance-none cursor-pointer focus:outline-none focus:bg-white border border-transparent hover:border-[#c4c6d0] transition-all"
              >
                <option value="">Trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Tạm khóa</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#747780] pointer-events-none text-base">
                expand_more
              </span>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setDeptFilter('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="h-10 px-3 rounded-xl bg-[#f0f3ff] hover:bg-[#dfe8ff] text-[#44474f] hover:text-[#111c2d] transition-all flex items-center justify-center cursor-pointer"
              title="Làm mới bộ lọc"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">restart_alt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enterprise Data Matrix */}
      <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-[#dfe8ff]/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#44474f] font-label-sm uppercase tracking-wider text-xs">
                <th className="py-3 px-space-md font-semibold">Mã NV</th>
                <th className="py-3 px-space-md font-semibold">Họ và tên</th>
                <th className="py-3 px-space-md font-semibold">Chức vụ / Bộ phận</th>
                <th className="py-3 px-space-md font-semibold">Khu vực phụ trách</th>
                <th className="py-3 px-space-md font-semibold">Liên hệ công vụ</th>
                <th className="py-3 px-space-md font-semibold">Phân quyền</th>
                <th className="py-3 px-space-md font-semibold text-center">Trạng thái</th>
                <th className="py-3 px-space-md font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ff] font-body-md text-[#111c2d] text-sm">
              {filteredStaff.map((staff) => {
                const isLocked = staff.status === 'locked';

                return (
                  <tr
                    key={staff.id}
                    className={`hover:bg-[#f0f3ff]/60 transition-colors ${
                      isLocked ? 'bg-[#ffdad6]/10 opacity-80' : ''
                    }`}
                  >
                    <td className="py-3.5 px-space-md font-code-metric text-[#00163a] font-semibold">{staff.code}</td>
                    <td className="py-3.5 px-space-md">
                      <div className="flex items-center gap-space-sm">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm font-semibold shrink-0 shadow-xs ${
                            isLocked
                              ? 'bg-[#ffdad6] text-[#93000a]'
                              : staff.roleKey === 'admin'
                              ? 'bg-[#0b2a5b] text-white'
                              : 'bg-[#dfe8ff] text-[#00163a]'
                          }`}
                        >
                          {staff.avatarText}
                        </div>
                        <div>
                          <div className="font-headline-sm text-sm font-semibold text-[#00163a]">{staff.name}</div>
                          <div className={`text-xs font-label-sm ${isLocked ? 'text-[#ba1a1a]' : 'text-[#747780]'}`}>
                            {isLocked ? 'Đã đình chỉ công tác' : `Đăng nhập: ${staff.lastLogin}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-space-md">
                      <span className="font-medium text-[#111c2d]">{staff.position}</span>
                      <span className="block text-xs text-[#44474f]">{staff.department}</span>
                    </td>
                    <td className="py-3.5 px-space-md">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#dfe8ff] text-[#111c2d] font-label-sm text-xs">
                        {staff.managedArea}
                      </span>
                    </td>
                    <td className="py-3.5 px-space-md font-code-metric text-xs">
                      <div>{staff.phone}</div>
                      <div className="text-[#747780]">{staff.email}</div>
                    </td>
                    <td className="py-3.5 px-space-md">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-xs font-medium ${
                          staff.role === 'System Admin'
                            ? 'bg-[#0b2a5b] text-white'
                            : staff.role === 'Ban Quản lý'
                            ? 'bg-[#e8eeff] text-[#375ba9]'
                            : staff.role === 'Kỹ thuật viên'
                            ? 'bg-[#dfe8ff] text-[#111c2d]'
                            : 'bg-[#f0f3ff] text-[#44474f]'
                        }`}
                      >
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-space-md text-center">
                      {!isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-label-sm bg-[#e8eeff] text-[#375ba9] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#375ba9]" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-label-sm bg-[#ffdad6] text-[#ba1a1a] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
                          Tạm khóa
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-space-md text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingStaff(staff);
                            onShowToast(`Mở hộp thoại chỉnh sửa thông tin cho ${staff.name}`);
                          }}
                          className="p-1.5 rounded-lg text-[#747780] hover:text-[#00163a] hover:bg-[#e8eeff] transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => setPasswordStaff(staff)}
                          className="p-1.5 rounded-lg text-[#747780] hover:text-[#00163a] hover:bg-[#e8eeff] transition-colors cursor-pointer"
                          title="Đổi mật khẩu / Cấp lại mã PIN"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-base">key</span>
                        </button>
                        <button
                          onClick={() => handleToggleLock(staff)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isLocked
                              ? 'text-[#375ba9] hover:bg-[#e8eeff]'
                              : 'text-[#747780] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40'
                          }`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-base">
                            {isLocked ? 'lock_open' : 'lock'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Minimal Pagination Bar */}
        <div className="flex items-center justify-between px-space-md py-3 bg-[#f0f3ff] text-xs text-[#44474f] font-label-md border-t border-[#dfe8ff]/60">
          <div>
            Hiển thị <span className="font-semibold text-[#00163a]">1 - {filteredStaff.length}</span> trên tổng số{' '}
            <span className="font-semibold text-[#00163a]">28</span> nhân viên
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-[#e8eeff] hover:bg-[#dfe8ff] transition-colors disabled:opacity-40 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="px-2 py-1 rounded-lg bg-[#00163a] text-white font-semibold text-xs">1</span>
            <button
              onClick={() => setCurrentPage(2)}
              className="px-2 py-1 rounded-lg hover:bg-[#e8eeff] transition-colors text-xs font-medium cursor-pointer"
              type="button"
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className="px-2 py-1 rounded-lg hover:bg-[#e8eeff] transition-colors text-xs font-medium cursor-pointer"
              type="button"
            >
              3
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
              className="p-1.5 rounded-lg bg-[#e8eeff] hover:bg-[#dfe8ff] transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Thêm nhân sự mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">person_add</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Thêm Cán Bộ / Nhân Sự Mới</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#747780] hover:text-[#111c2d] p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Họ và Tên Nhân Sự *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Lê Thị Kim Chi"
                  required
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Chức Vụ</label>
                  <input
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    placeholder="VD: Giám thị ca tối"
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Bộ Phận</label>
                  <select
                    value={newDeptKey}
                    onChange={(e) => {
                      setNewDeptKey(e.target.value as any);
                      const opt = e.target.options[e.target.selectedIndex];
                      setNewDept(opt.text);
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  >
                    <option value="gt">Tổ Giám thị &amp; Sinh viên</option>
                    <option value="bql">Ban Quản trị KTX</option>
                    <option value="kt">Tổ Kỹ thuật - Vận hành</option>
                    <option value="tc">Tổ Thu chi &amp; Hóa đơn</option>
                    <option value="bv">Tổ An ninh Trật tự</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Khu Vực Phụ Trách</label>
                  <input
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="VD: Tòa B01 & B02"
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Phân Quyền Vai Trò</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  >
                    <option value="Ban Quản lý">Ban Quản lý</option>
                    <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                    <option value="Chỉ xem (Viewer)">Chỉ xem (Viewer)</option>
                    <option value="Kế toán">Kế toán</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Số Điện Thoại Công Vụ *</label>
                  <input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="09xx..."
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#44474f] mb-1">Email Học Viện (@utc2.edu.vn) *</label>
                  <input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ten.ho@utc2.edu.vn"
                    required
                    type="email"
                    className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#f0f3ff]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 h-9 rounded-xl bg-[#00163a] text-white font-semibold shadow-xs"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Đổi mật khẩu */}
      {passwordStaff && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">key</span>
                <h2 className="font-headline-sm text-base font-bold text-[#00163a]">
                  Đặt Lại Mật Khẩu / SSO PIN
                </h2>
              </div>
              <button
                onClick={() => setPasswordStaff(null)}
                className="text-[#747780] hover:text-[#111c2d] p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#44474f]">
                Tạo mật khẩu tạm thời hoặc gửi liên kết reset tài khoản cho cán bộ{' '}
                <strong className="text-[#00163a]">{passwordStaff.name}</strong> ({passwordStaff.email}).
              </p>
              <div>
                <label className="block font-semibold text-[#44474f] mb-1">Mật khẩu mới</label>
                <input
                  type="text"
                  defaultValue="UTC2@2026KTX"
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] font-code-metric text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPasswordStaff(null)}
                className="px-4 h-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setPasswordStaff(null);
                  onShowToast(`Đã gửi mật khẩu mới về email ${passwordStaff.email}!`);
                }}
                className="px-4 h-9 rounded-xl bg-[#00163a] text-white text-xs font-semibold"
              >
                Cập nhật mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Phân quyền vai trò */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163a]/40 backdrop-blur-xs flex items-center justify-center p-space-md animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-space-lg shadow-2xl space-y-space-md border border-[#dfe8ff]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f3ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#375ba9] text-2xl">admin_panel_settings</span>
                <h2 className="font-headline-sm text-lg font-bold text-[#00163a]">Ma Trận Phân Quyền Vai Trò</h2>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-[#747780] hover:text-[#111c2d] p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { role: 'System Admin', scope: 'Toàn quyền cấu hình, tài khoản, chốt kỳ thu phí, mở khóa phòng' },
                { role: 'Ban Quản lý', scope: 'Xét duyệt đơn đăng ký, lập biên bản kỷ luật, ký hợp đồng nội trú' },
                { role: 'Kỹ thuật viên', scope: 'Tiếp nhận phiếu sửa chữa, cập nhật tiến độ vật tư bảo trì' },
                { role: 'Kế toán viên', scope: 'Ghi số điện nước, thu phí, xác nhận phiếu thu, gửi nhắc nợ' },
                { role: 'Bảo vệ / An ninh', scope: 'Quẹt thẻ ra vào cổng, kiểm soát khách vãng lai, xem danh sách SV' },
              ].map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#f0f3ff] space-y-1">
                  <div className="font-bold text-[#00163a] text-sm">{r.role}</div>
                  <div className="text-[#44474f]">{r.scope}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 h-9 rounded-xl bg-[#00163a] text-white text-xs font-semibold"
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
