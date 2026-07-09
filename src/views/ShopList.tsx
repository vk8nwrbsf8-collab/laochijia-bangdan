import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Shop } from '../types';
import ShopCard from '../components/ShopCard';
import { Search, Share, MapPin, User as UserIcon, Store } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../components/Layout';

const RATINGS = ['全部', '夯', '顶级', '人上人', 'NPC', '拉'];

export default function ShopList() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedRating, setSelectedRating] = useState('全部');
  const [city, setCity] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    const urlCity = searchParams.get('city');
    if (urlCity) setCity(urlCity);
    const urlRating = searchParams.get('rating');
    if (urlRating) setSelectedRating(urlRating);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/shops`),
      orderBy('created_at', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Shop[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Shop);
      });
      setShops(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const [allCities, setAllCities] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchAllCities = async () => {
      try {
        const shopsSnap = await getDocs(collection(db, `users/${user.uid}/shops`));
        const dishesSnap = await getDocs(collection(db, `users/${user.uid}/dishes`));
        const cities = new Set<string>();
        shopsSnap.forEach(doc => { if (doc.data().city) cities.add(doc.data().city); });
        dishesSnap.forEach(doc => { if (doc.data().city) cities.add(doc.data().city); });
        setAllCities(Array.from(cities));
      } catch (e) {
        console.error(e);
      }
    };
    fetchAllCities();
  }, [user, shops]); // re-run when shops update so it captures newly added shop cities

  const categories = ['全部', ...Array.from(new Set(shops.map(s => s.category)))];
  const availableCities = allCities.length > 0 ? allCities : Array.from(new Set(shops.map(s => s.city).filter(Boolean)));

  // No auto-select: default is "全部" (show all cities)

  const filteredShops = shops.filter(s => {
    if (selectedCategory !== '全部' && s.category !== selectedCategory) return false;
    if (selectedRating !== '全部' && s.rating !== selectedRating) return false;
    if (city && city !== '全部' && s.city && s.city !== city) return false;
    return true;
  });

  const handleChangeCity = () => {
    setShowCityPicker(true);
  };

  const handleCitySelect = (c: string) => {
    setCity(c);
    setShowCityPicker(false);
    const newParams = new URLSearchParams(searchParams);
    if (c) {
      newParams.set('city', c);
    } else {
      newParams.delete('city');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="flex flex-col h-full bg-secondary relative">
      {/* City Picker Modal */}
      {showCityPicker && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex flex-col justify-end transition-opacity" onClick={() => setShowCityPicker(false)}>
          <div className="bg-primary w-full rounded-t-3xl p-5 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-primary">选择城市</h3>
              <button onClick={() => setShowCityPicker(false)} className="text-tertiary text-sm">关闭</button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-8">
              <button 
                onClick={() => handleCitySelect('')}
                className={cn("py-3.5 rounded-xl text-center text-[15px] font-medium transition-colors", (!city || city === '全部') ? "bg-accent text-white" : "bg-secondary text-primary")}
              >
                全部城市
              </button>
              {availableCities.map(c => (
                <button 
                  key={c} 
                  onClick={() => handleCitySelect(c)}
                  className={cn("py-3.5 rounded-xl text-center text-[15px] font-medium transition-colors", c === city ? "bg-accent text-white" : "bg-secondary text-primary")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-primary px-4 py-3 flex items-center justify-between z-10 border-b border-theme shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
          </button>
          <div className="flex items-center font-medium text-sm cursor-pointer active:opacity-70 transition-opacity" onClick={handleChangeCity}>
            <MapPin className="w-4 h-4 mr-1 text-accent" />
            {city || '全部城市'}
          </div>
        </div>
        <div className="flex items-center gap-4 text-tertiary">
          <button onClick={() => navigate('/search')} className="active:scale-95 transition-transform"><Search className="w-5 h-5" /></button>
          <button onClick={() => navigate('/poster?type=shop')} className="active:scale-95 transition-transform"><Share className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Banner */}
      <div className="shrink-0 bg-primary px-4 pt-5 pb-4 text-center border-b border-theme/50 relative shadow-sm">
        {/* 装饰字：用 clip 裁成右侧半露效果 */}
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-20 overflow-hidden pointer-events-none select-none"
        >
          <span className="absolute right-[-12px] top-1/2 -translate-y-1/2 text-[88px] font-black leading-none italic"
            style={{ color: 'var(--accent)', opacity: 0.08 }}>
            榜
          </span>
        </div>
        <h1 className="relative z-10 text-xl font-black text-primary tracking-tight italic">
          {profile?.banner_title || '老吃家商户榜'}
        </h1>
      </div>

      {/* Category Filter (Horizontal) */}
      <div className="shrink-0 bg-primary px-4 py-3 border-b border-theme overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-2 z-10">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm transition-colors border",
              selectedCategory === cat 
                ? "bg-accent border-accent text-white" 
                : "bg-primary border-theme text-primary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Rating Filter (Vertical) */}
        <div className="w-16 bg-primary border-r border-theme overflow-y-auto absolute left-0 top-0 bottom-0 z-0 pt-2 pb-20">
          {RATINGS.map(rating => (
            <button
              key={rating}
              onClick={() => setSelectedRating(rating)}
              className={cn(
                "w-full py-4 text-xs flex justify-center items-center relative transition-colors",
                selectedRating === rating ? "text-accent font-medium bg-accent-light/30" : "text-tertiary"
              )}
            >
              {selectedRating === rating && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-md"></div>
              )}
              <span style={{ writingMode: rating !== '全部' ? 'vertical-rl' : 'horizontal-tb' }}>
                {rating}
              </span>
            </button>
          ))}
        </div>

        {/* Shop List */}
        <div className="flex-1 ml-16 p-4 pb-20 overflow-y-auto">
          {loading ? (
            <div className="text-center text-sm text-tertiary mt-10">加载中...</div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center text-sm text-tertiary mt-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
                <Store className="w-10 h-10 text-gray-400" />
              </div>
              还没有记录，点击 + 添加第一家
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredShops.map(shop => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
