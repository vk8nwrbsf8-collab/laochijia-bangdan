import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { Dish } from '../types';
import { ChevronLeft, Edit, MapPin, Store, ExternalLink } from 'lucide-react';
import { cn } from '../components/Layout';

export default function DishDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dish, setDish] = useState<Dish | null>(null);
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    if (!user || !id) return;
    getDoc(doc(db, `users/${user.uid}/dishes/${id}`)).then(snap => {
      if (snap.exists()) setDish({ id: snap.id, ...snap.data() } as Dish);
    });
  }, [id, user]);

  if (!dish) return (
    <div className="p-10 text-center text-tertiary min-h-screen bg-secondary flex items-center justify-center">
      加载中...
    </div>
  );

  const images = dish.images && dish.images.length > 0 ? dish.images : [];

  return (
    <div className="flex flex-col h-screen bg-secondary w-full max-w-3xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary border-b border-theme sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary active:opacity-60 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate(`/add?type=dish&id=${dish.id}`)}
          className="flex items-center gap-1 text-accent font-medium px-3 py-1.5 rounded-full bg-accent-light/50 active:bg-accent-light transition-colors"
        >
          <Edit className="w-4 h-4" />
          编辑
        </button>
      </div>

      {/* Image Carousel */}
      {images.length > 0 ? (
        <div className="relative bg-gray-100 border-b border-theme shrink-0" style={{ aspectRatio: '1/1', maxHeight: '360px' }}>
          <img
            src={images[currentImg]}
            alt={dish.name}
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
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
              <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                {currentImg + 1}/{images.length}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-secondary border-b border-theme flex items-center justify-center text-tertiary text-sm shrink-0" style={{ aspectRatio: '1/1', maxHeight: '360px' }}>
          暂无图片
        </div>
      )}

      {/* Dish Info */}
      <div className="bg-primary p-4 mb-3 border-b border-theme">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-bold text-primary flex-1 pr-3">{dish.name}</h1>
          <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium shrink-0">
            {dish.rating}
          </span>
        </div>

        {dish.shop_name && (
          <div className="flex items-center text-secondary text-sm mb-2">
            <Store className="w-4 h-4 mr-1 text-tertiary shrink-0" />
            <span>{dish.shop_name}</span>
          </div>
        )}

        <div className="flex items-center text-secondary text-sm gap-3 flex-wrap">
          <span className="flex items-center">
            <MapPin className="w-4 h-4 mr-1 text-accent shrink-0" />
            {dish.city} · {dish.category}
          </span>
          {dish.price && (
            <span className="text-primary font-semibold">¥{dish.price}</span>
          )}
        </div>
      </div>

      {/* Comment */}
      {dish.comment && (
        <div className="bg-primary p-4 mb-3 border-y border-theme">
          <h3 className="font-semibold text-primary mb-2 flex items-center gap-1.5">
            <span className="w-1 h-4 bg-accent rounded-full inline-block" />
            我的评价
          </h3>
          <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {dish.comment}
          </p>
        </div>
      )}

      {/* Dianping Link */}
      {dish.dianping_url && (
        <div className="p-4 mb-4">
          <a
            href={dish.dianping_url}
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
