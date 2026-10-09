import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { LogOut, Menu, X, User, Sun, Moon } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E6EAF0] dark:border-slate-800 relative z-20 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Left: Buoyant Media Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="dark:bg-white/95 dark:px-2.5 dark:py-1 dark:rounded-xl dark:shadow-xs transition-all flex items-center">
              <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 sm:h-10 object-contain" />
            </div>
          </Link>

          {/* Right: Harmonious Navigation & Auth Action */}
          <div className="hidden sm:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-bold transition-colors ${
                  isActive('/')
                    ? 'text-[#1E3FA0] dark:text-blue-400 border-b-2 border-[#1E3FA0] dark:border-blue-400 pb-0.5'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#1E3FA0] dark:hover:text-blue-400'
                }`}
              >
                Home
              </Link>
              <Link
                to="/exhibitions"
                className={`text-sm font-bold transition-colors ${
                  isActive('/exhibitions')
                    ? 'text-[#1E3FA0] dark:text-blue-400 border-b-2 border-[#1E3FA0] dark:border-blue-400 pb-0.5'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#1E3FA0] dark:hover:text-blue-400'
                }`}
              >
                Exhibitions
              </Link>
            </nav>

            {/* Theme Switcher Button */}
            {/* <buttonl
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-600 hover:text-slate-900" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300" />
              )}
            </button> */}

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}>
                  <button className="inline-flex items-center gap-2 bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all">
                    <User className="w-3.5 h-3.5" />
                    {user?.role === 'ADMIN' ? 'Admin Dashboard' : 'Exhibitor Portal'}
                  </button>
                </Link>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login">
                <button className="inline-flex items-center gap-2 bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs transition-all transform hover:-translate-y-0.5">
                  Login
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-[#1E3FA0] dark:text-blue-400"
            >
              Home
            </Link>
            <Link
              to="/exhibitions"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Exhibitions
            </Link>
            {isAuthenticated ? (
              <Link
                to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
              >
                <button className="w-full font-bold bg-[#1E3FA0] dark:bg-blue-600 text-white py-2.5 rounded-xl">
                  Go to {user?.role === 'ADMIN' ? 'Admin Dashboard' : 'Dashboard'}
                </button>
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full font-bold bg-[#1E3FA0] dark:bg-blue-600 text-white py-2.5 rounded-xl">
                  Login
                </button>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirm Sign Out</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to sign out of your account?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
