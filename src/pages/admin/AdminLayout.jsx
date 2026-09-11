import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  DoorOpen,
  BedDouble,
  Users,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  Home,
  Shield,
  Settings as SettingsIcon,
  ScrollText,
  BarChart3,
  Menu,
  X,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/admin/beds', label: 'Beds', icon: BedDouble },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/semesters', label: 'Semesters', icon: GraduationCap },
  { to: '/admin/accommodation-types', label: 'Accommodation Types', icon: Home },
  { to: '/admin/admins', label: 'Admins', icon: Shield },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

const roleBadgeMap = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-green-100 text-green-700',
};

function roleBadgeClass(role) {
  return roleBadgeMap[role] || roleBadgeMap.ADMIN;
}

export default function AdminLayout() {
  const { currentUser, userRole, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const role = userRole || 'ADMIN';
  const name =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin';
  const initial = (name || 'A').charAt(0).toUpperCase();

  const activeItem = [...navItems]
    .reverse()
    .find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    );

  async function handleLogout() {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-indigo-950 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-y-auto lg:h-screen ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-5 h-16 border-b border-indigo-900 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold leading-tight truncate">Hostel Manager</div>
              <div className="text-xs text-indigo-300">Admin Console</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-indigo-300 hover:text-white"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="px-5 py-4 border-t border-indigo-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold uppercase">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{name}</div>
                <span
                  className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass(role)}`}
                >
                  {role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4 px-4 sm:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {activeItem?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-gray-500 truncate">
                Manage your hostel bookings and operations
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900 truncate max-w-[160px]">
                  {name}
                </div>
                <div className="text-xs text-gray-500">
                  {currentUser?.email || 'Administrator'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold uppercase">
                {initial}
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>

        <footer className="px-6 py-4 text-xs text-gray-400 border-t border-gray-200">
          &copy; {new Date().getFullYear()} Hostel Management System — Admin Console
        </footer>
      </div>
    </div>
  );
}