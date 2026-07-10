/**
 * 公开榜单页 — 无需登录，扫二维码可查看他人榜单
 * 路由: /u/:uid/shops  /u/:uid/dishes
 */
import React, { useEffect, useState } from 'react';
import { useParams, NavLink, useLocation } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shop, Dish, UserProfile } from '../types';
import { MapPin, UtensilsCrossed, Store, Utensils, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../components/Layout';

const RATINGS = ['全部', '夯', '顶级', '人上人', 'NPC', '拉'];
const RATING_ORDER = ['夯', '顶级', '人上人', 'NPC', '拉'];

function RatingBadge({ rating }: { rating: string }) {
  return (
    <span className="bg-accent text-white text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0">
      {rating}
    </span>
  );
}

export default function PublicList() {
  const { uid, listType } = useParams<{ uid: string; listType: 'shops' | 'dishes' }>();
  const location = useLocation();
  const type = listType === 'dishes' ? 'dishes' : 'shops';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState('全部');
  const [selectedCategory, setSelectedCategory] = useState('全部');

  useEffect(() => {
    if (!uid) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        // 获取用户资料
        const profileSnap = await getDoc(doc(db, 'users', uid));
        if (profileSnap.exists()) setProfile(profileSnap.data() as UserProfile);

        // 获取商家和餐品
        const [shopsSnap, dishesSnap] = await Promise.all([
          getDocs(query(collection(db, `users/${uid}/shops`), orderBy('created_at', 'desc'))),
          getDocs(query(collection(db, `users/${uid}/dishes`), orderBy('created_at', 'desc'))),
        ]);

        const shopData: Shop[] = [];
        shopsSnap.forEach(d => shopData.push({ id: d.id, ...d.data() } as Shop));

        const dishData: Dish[] = [];
        dishesSnap.forEach(d => dishData.push({ id: d.id, ...d.data() } as Dish));

        // 按评分排序
        const sortByRating = (a: any, b: any) => {
          const ra = RATING_ORDER.indexOf(a.rating);
          const rb = RATING_ORDER.indexOf(b.rating);
          if (ra !== rb) return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
          return b.created_at - a.created_at;
        };

        setShops(shopData.sort(sortByRating));
        setDishes(dishData.sort(sortByRating));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [uid]);

  // 切换 tab 时重置筛选
  useEffect(() => {
    setSelectedRating('全部');
    setSelectedCategory('全部');
  }, [type]);

  const currentItems = type === 'shops' ? shops : dishes;
  const categories = ['全部', ...Array.from(new Set(currentItems.map((s: any) => s.category).filter(Boolean)))];

  const filtered = currentItems.filter((item: any) => {
    if (selectedRating !== '全部' && item.rating !== selectedRating) return false;
    if (selectedCategory !== '全部' && item.category !== selectedCategory) return false;
    return true;
  });

  const bannerTitle = type === 'shops'
    ? (profile?.banner_title || '老吃家商户榜')
    : (profile?.dish_banner_title || '老吃家餐品榜');

  const slogan = profile?.banner_slogan
    ? profile.banner_slogan.replace('{nickname}', profile.nickname)
    : `${profile?.nickname || '美食家'} 的私人美食图鉴`;

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-tertiary text-sm animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary w-full max-w-3xl mx-auto">
      {/* ── 顶部品牌栏 ── */}
      <div className="bg-primary border-b border-theme px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-bold text-primary">老吃家榜单</span>
        </div>
        <span className="text-xs text-tertiary bg-secondary px-2 py-1 rounded-full">只读浏览</span>
      </div>

      {/* ── Banner ── */}
      <div className="bg-primary px-4 pt-5 pb-4 border-b border-theme/50 relative shadow-sm shrink-0">
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-20 overflow-hidden pointer-events-none select-none"
        >
          <span
            className="absolute right-[-12px] top-1/2 -translate-y-1/2 text-[88px] font-black leading-none italic"
            style={{ color: 'var(--accent)', opacity: 0.08 }}
          >
            榜
          </span>
        </div>
        <h1 className="relative z-10 text-xl font-black text-primary tracking-tight italic">
          {bannerTitle}
        </h1>
        <p className="text-xs text-secondary mt-1 relative z-10">{slogan}</p>
      </div>

      {/* ── Tab：商家榜 / 餐品榜 ── */}
      <div className="bg-primary border-b border-theme shrink-0 px-4 py-2 flex gap-3">
        <NavLink
          to={`/u/${uid}/shops`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            type === 'shops' ? "bg-accent text-white" : "text-tertiary bg-secondary"
          )}
        >
          <Store className="w-3.5 h-3.5" /> 商家榜 ({shops.length})
        </NavLink>
        <NavLink
          to={`/u/${uid}/dishes`}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            type === 'dishes' ? "bg-accent text-white" : "text-tertiary bg-secondary"
          )}
        >
          <Utensils className="w-3.5 h-3.5" /> 餐品榜 ({dishes.length})
        </NavLink>
      </div>

      {/* ── 横向类目筛选 ── */}
      <div className="shrink-0 bg-primary px-4 py-2.5 border-b border-theme overflow-x-auto whitespace-nowrap flex gap-2" style={{ scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3.5 py-1 rounded-full text-sm transition-colors border shrink-0",
              selectedCategory === cat
                ? "bg-accent border-accent text-white"
                : "bg-primary border-theme text-secondary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── 内容区：竖向评分 + 列表 ── */}
      <div className="flex flex-1 relative">
        {/* 竖向评分筛选 */}
        <div className="w-14 bg-primary border-r border-theme flex flex-col py-2 shrink-0">
          {RATINGS.map(r => (
            <button
              key={r}
              onClick={() => setSelectedRating(r)}
              className={cn(
                "w-full py-3.5 text-xs flex justify-center items-center relative transition-colors",
                selectedRating === r ? "text-accent font-semibold" : "text-tertiary"
              )}
            >
              {selectedRating === r && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent rounded-r" />
              )}
              <span style={{ writingMode: r !== '全部' ? 'vertical-rl' : 'horizontal-tb' }}>
                {r}
              </span>
            </button>
          ))}
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-3 pb-10">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-tertiary text-sm">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-3">
                {type === 'shops'
                  ? <Store className="w-8 h-8 text-tertiary" />
                  : <Utensils className="w-8 h-8 text-tertiary" />}
              </div>
              暂无记录
            </div>
          ) : type === 'shops' ? (
            <div className="flex flex-col gap-2.5">
              {(filtered as Shop[]).map(shop => (
                <PublicShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {(filtered as Dish[]).map(dish => (
                <PublicDishCard key={dish.id} dish={dish} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 底部来源标注 ── */}
      <div className="shrink-0 py-4 text-center text-xs text-tertiary border-t border-theme bg-primary">
        由&nbsp;<span className="text-accent font-medium">老吃家榜单</span>&nbsp;生成 · 数据来自 {profile?.nickname || '美食家'} 的真实品鉴
      </div>
    </div>
  );
}

// ── 只读商家卡片 ──
function PublicShopCard({ shop }: { shop: Shop; key?: React.Key }) {
  return (
    <div className="bg-primary rounded-xl shadow-card border border-theme flex h-24 overflow-hidden">
      <div className="w-24 h-full shrink-0 bg-secondary overflow-hidden">
        {shop.images?.[0] ? (
          <img src={shop.images[0]} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">暂无图片</div>
        )}
      </div>
      <div className="flex-1 p-2.5 flex flex-col min-w-0 relative">
        <div className="flex items-start justify-between mb-0.5">
          <h3 className="font-bold text-[15px] text-primary truncate pr-2 leading-tight">{shop.name}</h3>
        </div>
        <div className="text-xs text-secondary mb-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">{shop.city} · {shop.category}{shop.avg_price ? ` · ¥${shop.avg_price}/人` : ''}</span>
        </div>
        <p className="text-xs text-tertiary truncate mb-1">{shop.comment || '暂无评价'}</p>
        <div className="flex gap-2 mt-auto overflow-hidden">
          {shop.dishes?.slice(0, 2).map((d, i) => (
            <span key={i} className={cn("text-xs flex items-center shrink-0", d.like ? "text-success" : "text-danger")}>
              {d.like ? <ThumbsUp className="w-3 h-3 mr-0.5" /> : <ThumbsDown className="w-3 h-3 mr-0.5" />}
              <span className="truncate max-w-[60px]">{d.name}</span>
            </span>
          ))}
        </div>
        <div className="absolute right-2.5 bottom-2.5">
          <RatingBadge rating={shop.rating} />
        </div>
      </div>
    </div>
  );
}

// ── 只读餐品卡片 ──
function PublicDishCard({ dish }: { dish: Dish; key?: React.Key }) {
  return (
    <div className="bg-primary rounded-xl shadow-card border border-theme flex h-24 overflow-hidden">
      <div className="w-24 h-full shrink-0 bg-secondary overflow-hidden">
        {dish.images?.[0] ? (
          <img src={dish.images[0]} alt={dish.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">暂无图片</div>
        )}
      </div>
      <div className="flex-1 p-2.5 flex flex-col min-w-0 relative">
        <h3 className="font-bold text-[15px] text-primary truncate pr-2 mb-0.5 leading-tight">{dish.name}</h3>
        <div className="text-xs text-secondary mb-0.5 truncate">{dish.shop_name || '—'}</div>
        <div className="text-xs text-secondary mb-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">{dish.city} · {dish.category}{dish.price ? ` · ¥${dish.price}` : ''}</span>
        </div>
        <p className="text-xs text-tertiary truncate mt-auto">{dish.comment || '暂无评价'}</p>
        <div className="absolute right-2.5 bottom-2.5">
          <RatingBadge rating={dish.rating} />
        </div>
      </div>
    </div>
  );
}
