import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { Shop } from '../types';
import { ChevronLeft, Edit, MapPin, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { cn } from '../components/Layout';

export default function ShopDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    if (!user || !id) return;
    getDoc(doc(db, `users/${user.uid}/shops/${id}`)).then(snap => {
      if (snap.exists()) setShop({ id: snap.id, ...snap.data() } as Shop);
    });
  }, [id, user]);

  if (!shop) return (
    <div className="p-10 text-center text-tertiary min-h-screen bg-secondary flex items-center justify-center">
      加载中...
    </div>
  );

  const images = shop.images && shop.images.length > 0 ? shop.images : [];

  return (
    <div className="flex flex-col h-screen bg-secondary w-full max-w-3xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary border-b border-theme sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary active:opacity-60 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate(`/add?type=shop&id=${shop.id}`)}
          className="flex items-center gap-1 text-accent font-medium px-3 py-1.5 rounded-full bg-accent-light/50 active:bg-accent-light transition-colors"
        >
          <Edit className="w-4 h-4" />
          编辑
        </button>
      </div>

      {/* Image Carousel */}
      {images.length > 0 ? (
        <div className="relative bg-gray-100 border-b border-theme shrink-0" style={{ aspectRatio: '16/10' }}>
          <img
            src={images[currentImg]}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              {/* Prev / Next buttons */}
              {currentImg > 0 && (
                <button
                  onClick={() => setCurrentImg(i => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  ‹
                </button>
              )}
              {currentImg < images.length - 1 && (
                <button
                  onClick={() => setCurrentImg(i => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  ›
                </button>
              )}
              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i === currentImg ? "bg-white w-4" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
              {/* Counter */}
              <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                {currentImg + 1}/{images.length}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-secondary border-b border-theme flex items-center justify-center text-tertiary text-sm shrink-0" style={{ aspectRatio: '16/10' }}>
          暂无图片
        </div>
      )}

      {/* Shop Info */}
      <div className="bg-primary p-4 mb-3 border-b border-theme">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-bold text-primary flex-1 pr-3">{shop.name}</h1>
          <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium shrink-0">
            {shop.rating}
          </span>
        </div>
        <div className="flex items-center text-secondary text-sm">
          <MapPin className="w-4 h-4 mr-1 text-accent shrink-0" />
          <span>{shop.city} · {shop.category}{shop.avg_price ? ` · ¥${shop.avg_price}/人` : ''}</span>
        </div>
      </div>

      {/* Comment */}
      {shop.comment && (
        <div className="bg-primary p-4 mb-3 border-y border-theme">
          <h3 className="font-semibold text-primary mb-2 flex items-center gap-1.5">
            <span className="w-1 h-4 bg-accent rounded-full inline-block" />
            我的评价
          </h3>
          <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {shop.comment}
          </p>
        </div>
      )}

      {/* Dish Reviews */}
      {shop.dishes && shop.dishes.length > 0 && (
        <div className="bg-primary p-4 mb-3 border-y border-theme">
          <h3 className="font-semibold text-primary mb-3 flex items-center gap-1.5">
            <span className="w-1 h-4 bg-accent rounded-full inline-block" />
            菜品点评
          </h3>
          <div className="space-y-2.5">
            {shop.dishes.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
                  d.like ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                )}>
                  {d.like ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                </span>
                <span className="text-primary">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dianping Link */}
      {shop.dianping_url && (
        <div className="p-4 mb-4">
          <a
            href={shop.dianping_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center w-full py-3.5 bg-primary border border-theme rounded-xl text-primary font-medium shadow-sm active:bg-secondary transition-colors"
          >
            <ExternalLink className="w-5 h-5 mr-2 text-accent" />
            在大众点评中查看
          </a>
        </div>
      )}

      <div className="h-8 shrink-0" />
    </div>
  );
}
