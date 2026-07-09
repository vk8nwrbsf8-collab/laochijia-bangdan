import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Layout } from './components/Layout';
import Login from './views/Login';
import ShopList from './views/ShopList';
import DishList from './views/DishList';
import Profile from './views/Profile';
import AddRecord from './views/AddRecord';
import ShopDetail from './views/ShopDetail';
import DishDetail from './views/DishDetail';
import Poster from './views/Poster';
import SearchPage from './views/SearchPage';
import PublicList from './views/PublicList';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-secondary text-tertiary">加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/shops" replace />} />
            <Route path="shops" element={<ShopList />} />
            <Route path="dishes" element={<DishList />} />
          </Route>

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><AddRecord /></ProtectedRoute>} />
          <Route path="/shop/:id" element={<ProtectedRoute><ShopDetail /></ProtectedRoute>} />
          
          <Route path="/dish/:id" element={<ProtectedRoute><DishDetail /></ProtectedRoute>} />
          <Route path="/poster" element={<ProtectedRoute><Poster /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />

          {/* 公开榜单页 — 无需登录，任何人可访问 */}
          <Route path="/u/:uid/shops" element={<PublicList />} />
          <Route path="/u/:uid/dishes" element={<PublicList />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
