import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shop, Dish } from '../types';
import ShopCard from '../components/ShopCard';
import DishCard from '../components/DishCard';
import { Search, ChevronLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SearchPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStr = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(queryStr);

  useEffect(() => {
    if (!user) return;
    
    // Fetch shops
    const qShops = query(collection(db, `users/${user.uid}/shops`), orderBy('created_at', 'desc'));
    const unsubscribeShops = onSnapshot(qShops, (snapshot) => {
      const data: Shop[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Shop));
      setShops(data);
    });

    // Fetch dishes
    const qDishes = query(collection(db, `users/${user.uid}/dishes`), orderBy('created_at', 'desc'));
    const unsubscribeDishes = onSnapshot(qDishes, (snapshot) => {
      const data: Dish[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Dish));
      setDishes(data);
      setLoading(false);
    });

    return () => {
      unsubscribeShops();
      unsubscribeDishes();
    };
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: inputValue }, { replace: true });
  };

  const filteredShops = shops.filter(s => {
    if (!queryStr) return false;
    const q = queryStr.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q));
  });

  const filteredDishes = dishes.filter(d => {
    if (!queryStr) return false;
    const q = queryStr.toLowerCase();
    return d.name.toLowerCase().includes(q) || 
           (d.category && d.category.toLowerCase().includes(q)) || 
           (d.shop_name && d.shop_name.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col h-full bg-secondary">
      <div className="bg-primary px-4 py-2.5 flex items-center gap-3 border-b border-theme shrink-0">
        <button onClick={() => { if(window.history.length > 2) { navigate(-1); } else { navigate('/'); } }} className="p-1 -ml-1 text-tertiary active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <form onSubmit={handleSearch} className="flex-1 bg-secondary rounded-full flex items-center px-3 py-1.5 border border-theme">
          <Search className="w-4 h-4 text-tertiary mr-2" />
          <input 
            autoFocus
            type="text" 
            placeholder="搜索商户或餐品..." 
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            className="bg-transparent border-none outline-none text-[15px] w-full text-primary"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-sm text-tertiary mt-10">加载中...</div>
        ) : !queryStr ? (
          <div className="text-center text-sm text-tertiary mt-10">请输入关键词进行搜索</div>
        ) : filteredShops.length === 0 && filteredDishes.length === 0 ? (
          <div className="text-center text-sm text-tertiary mt-10">未找到相关结果</div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredShops.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-tertiary mb-3 uppercase tracking-widest">商家</h3>
                <div className="flex flex-col gap-3">
                  {filteredShops.map(shop => <ShopCard key={shop.id} shop={shop} />)}
                </div>
              </div>
            )}
            {filteredDishes.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-tertiary mb-3 uppercase tracking-widest mt-2">餐品</h3>
                <div className="flex flex-col gap-3">
                  {filteredDishes.map(dish => <DishCard key={dish.id} dish={dish} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
