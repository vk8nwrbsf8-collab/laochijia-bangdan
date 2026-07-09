import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { X, ThumbsUp, ThumbsDown, Plus, Trash2, Camera } from 'lucide-react';
import { cn } from '../components/Layout';
import { Shop, Dish, Rating, DishEvaluation } from '../types';

const RATINGS: Rating[] = ['夯', '顶级', '人上人', 'NPC', '拉'];

export default function AddRecord() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'dish' ? 'dish' : 'shop';
  const idToEdit = searchParams.get('id');
  
  const [type, setType] = useState<'shop' | 'dish'>(initialType);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!idToEdit);

  // Form State
  const [name, setName] = useState('');
  const [city, setCity] = useState('深圳');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [rating, setRating] = useState<Rating>('夯');
  const [comment, setComment] = useState('');
  const [dianpingUrl, setDianpingUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  // Specific to Shop
  const [dishes, setDishes] = useState<DishEvaluation[]>([]);
  
  // Specific to Dish
  const [shopName, setShopName] = useState('');

  const [historicalCities, setHistoricalCities] = useState<string[]>([]);
  const [historicalCategories, setHistoricalCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchHistoricalData = async () => {
      try {
        const shopsSnap = await getDocs(collection(db, `users/${user.uid}/shops`));
        const dishesSnap = await getDocs(collection(db, `users/${user.uid}/dishes`));
        
        const cities = new Set<string>();
        const categories = new Set<string>();
        
        shopsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.city) cities.add(data.city);
          if (data.category) categories.add(data.category);
        });
        
        dishesSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.city) cities.add(data.city);
          if (data.category) categories.add(data.category);
        });
        
        setHistoricalCities(Array.from(cities));
        setHistoricalCategories(Array.from(categories));
      } catch (e) {
        console.error('Error fetching historical data:', e);
      }
    };
    fetchHistoricalData();
  }, [user]);

  useEffect(() => {
    if (!idToEdit || !user) return;
    const fetchData = async () => {
      try {
        const docRef = doc(db, `users/${user.uid}/${type === 'shop' ? 'shops' : 'dishes'}/${idToEdit}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || '');
          setCity(data.city || '深圳');
          setCategory(data.category || '');
          setPrice(data.avg_price?.toString() || data.price?.toString() || '');
          setRating(data.rating || '夯');
          setComment(data.comment || '');
          setDianpingUrl(data.dianping_url || '');
          setImages(data.images || []);
          if (type === 'shop') {
            setDishes(data.dishes || []);
          } else {
            setShopName(data.shop_name || '');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [idToEdit, user, type]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImages(prev => [...prev, dataUrl]);
        };
      };
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDianpingUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    
    // 如果粘贴的是包含【】和链接的分享文案
    if (val.includes('【') && val.includes('】') && (val.includes('dianping.com') || val.includes('http'))) {
      const matchName = val.match(/【(.*?)】/);
      if (matchName && matchName[1]) {
        if (type === 'shop') setName(matchName[1]);
        else setShopName(matchName[1]);
      }

      const matchPrice = val.match(/¥(\d+)/);
      if (matchPrice && matchPrice[1]) {
        setPrice(matchPrice[1]);
      }

      // 提取链接
      const urlMatch = val.match(/(https?:\/\/[^\s]+)/);
      const extractedUrl = urlMatch ? urlMatch[1] : val;

      // 尝试提取分类
      // 常见格式是把空格分割，例如: "五角场/大学路 韩式料理"
      // 分割成行或者空格
      const textForCategory = val.replace(/【.*?】/g, '').replace(/(https?:\/\/[^\s]+)/g, '');
      const words = textForCategory.split(/[\s\n]+/).filter(Boolean);
      
      // 一般类别在价格之后，地址之前。简单策略：找包含特定词的，或者没数字没特殊符号的词
      // 但上面点评文案： "五角场/大学路 韩式料理" -> words: [ "★★★☆☆", "3.9", "¥103/人", "五角场/大学路", "韩式料理", "大学路88弄32、40号1层A、2层（智星路与大学路交叉口）" ]
      for (const w of words) {
        if (!w.includes('★') && !w.includes('¥') && !/\d/.test(w) && w.length <= 6 && !w.includes('路') && !w.includes('弄')) {
           // 这是一个潜在的category，比如 "韩式料理"
           setCategory(w);
           break;
        }
      }

      setDianpingUrl(extractedUrl);
    } else {
      setDianpingUrl(val);
    }
  };

  const handleSave = async () => {
    if (!user || !name || !city || !category) {
      alert('请填写必填项');
      return;
    }

    setLoading(true);
    const id = idToEdit || uuidv4();
    try {
      if (type === 'shop') {
        const shopData: Partial<Shop> = {
          name,
          city,
          category,
          rating,
          comment,
          dianping_url: dianpingUrl,
          dishes,
          images,
          updated_at: Date.now()
        };
        if (price) shopData.avg_price = Number(price);
        if (!idToEdit) shopData.created_at = Date.now();
        
        await setDoc(doc(db, `users/${user.uid}/shops/${id}`), shopData, { merge: true });
      } else {
        const dishData: Partial<Dish> = {
          name,
          city,
          category,
          shop_name: shopName,
          rating,
          comment,
          dianping_url: dianpingUrl,
          images,
          updated_at: Date.now()
        };
        if (price) dishData.price = Number(price);
        if (!idToEdit) dishData.created_at = Date.now();
        
        await setDoc(doc(db, `users/${user.uid}/dishes/${id}`), dishData, { merge: true });
      }
      if (type === 'shop') {
        navigate(`/shops?city=${encodeURIComponent(city)}&rating=${encodeURIComponent('全部')}`);
      } else {
        navigate(`/dishes?city=${encodeURIComponent(city)}&rating=${encodeURIComponent('全部')}`);
      }
    } catch (err) {
      handleFirestoreError(err, idToEdit ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/${type === 'shop' ? 'shops' : 'dishes'}/${id}`);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="min-h-screen flex items-center justify-center bg-primary text-tertiary">加载中...</div>;

  return (
    <div className="flex flex-col h-screen bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme sticky top-0 bg-primary z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-tertiary">
          <X className="w-6 h-6" />
        </button>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="text-accent font-medium px-4 py-1.5 rounded-full hover:bg-accent-light/50 active:bg-accent-light"
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Type Toggle - disabled in edit mode */}
      <div className="p-4 flex justify-center">
        <div className="bg-secondary p-1 rounded-lg flex w-48">
          <button
            disabled={!!idToEdit}
            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", type === 'shop' ? "bg-white shadow-sm text-primary" : "text-tertiary", !!idToEdit && type !== 'shop' && "opacity-50")}
            onClick={() => setType('shop')}
          >
            商家
          </button>
          <button
            disabled={!!idToEdit}
            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", type === 'dish' ? "bg-white shadow-sm text-primary" : "text-tertiary", !!idToEdit && type !== 'dish' && "opacity-50")}
            onClick={() => setType('dish')}
          >
            餐品
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">
        {/* Image Upload */}
        <div>
          <label className="block text-xs font-medium text-tertiary mb-2">添加图片</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-theme">
                <img src={img} alt="upload" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 shrink-0 flex flex-col items-center justify-center bg-secondary rounded-lg border border-dashed border-theme cursor-pointer active:bg-gray-200 transition-colors">
              <Camera className="w-6 h-6 text-tertiary mb-1" />
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-tertiary mb-1">大众点评链接 (选填，可粘贴分享文案自动识别)</label>
          <textarea 
            value={dianpingUrl} onChange={handleDianpingUrlChange}
            rows={2} placeholder="粘贴链接或点评分享文案"
            className="w-full bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-tertiary mb-1">{type === 'shop' ? '商家' : '餐品'}名称 <span className="text-danger">*</span></label>
          <input 
            value={name} onChange={e => setName(e.target.value)}
            type="text" placeholder="最多30字" maxLength={30}
            className="w-full bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          />
        </div>

        {type === 'dish' && (
          <div>
            <label className="block text-xs font-medium text-tertiary mb-1">所属商家 (选填)</label>
            <input 
              value={shopName} onChange={e => setShopName(e.target.value)}
              type="text" placeholder="商家名称"
              className="w-full bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            />
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-tertiary mb-1">所在城市 <span className="text-danger">*</span></label>
            <input 
              value={city} onChange={e => setCity(e.target.value)}
              type="text" placeholder="如：深圳"
              className="w-full bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            />
            {historicalCities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {historicalCities.map(c => (
                  <button 
                    key={c} onClick={() => setCity(c)}
                    className="px-2 py-1 text-xs bg-secondary text-tertiary border border-theme rounded-md whitespace-nowrap active:bg-gray-200 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-tertiary mb-1">{type === 'shop' ? '类别' : '品类'} <span className="text-danger">*</span></label>
            <input 
              value={category} onChange={e => setCategory(e.target.value)}
              type="text" placeholder={type === 'shop' ? "如：火锅" : "如：川菜"}
              className="w-full bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            />
            {historicalCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {historicalCategories.map(c => (
                  <button 
                    key={c} onClick={() => setCategory(c)}
                    className="px-2 py-1 text-xs bg-secondary text-tertiary border border-theme rounded-md whitespace-nowrap active:bg-gray-200 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-tertiary mb-1">{type === 'shop' ? '人均' : ''}价格 (元)</label>
          <input 
            value={price} onChange={e => setPrice(e.target.value)}
            type="number" placeholder="0"
            className="w-full bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-tertiary mb-2">评分档次 <span className="text-danger">*</span></label>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map(r => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  rating === r ? "bg-accent border-accent text-white" : "bg-transparent border-theme text-tertiary"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {type === 'shop' && (
          <div>
            <label className="block text-xs font-medium text-tertiary mb-2">菜品评价</label>
            <div className="space-y-2">
              {dishes.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={d.name}
                    onChange={e => {
                      const newD = [...dishes];
                      newD[i].name = e.target.value;
                      setDishes(newD);
                    }}
                    placeholder="菜品名称"
                    className="flex-1 bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none"
                  />
                  <button 
                    onClick={() => {
                      const newD = [...dishes];
                      newD[i].like = true;
                      setDishes(newD);
                    }}
                    className={cn("p-2 rounded-lg", d.like ? "bg-success/10 text-success" : "bg-secondary text-tertiary")}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const newD = [...dishes];
                      newD[i].like = false;
                      setDishes(newD);
                    }}
                    className={cn("p-2 rounded-lg", !d.like ? "bg-danger/10 text-danger" : "bg-secondary text-tertiary")}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDishes(dishes.filter((_, idx) => idx !== i))}
                    className="p-2 text-tertiary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setDishes([...dishes, { name: '', like: true }])}
                className="text-accent text-sm flex items-center font-medium mt-2"
              >
                <Plus className="w-4 h-4 mr-1" /> 添加菜品
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-tertiary mb-1">个人评语</label>
          <textarea 
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="最多200字" maxLength={200} rows={4}
            className="w-full bg-secondary border border-transparent focus:border-accent rounded-lg px-3 py-2 text-sm outline-none transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}
