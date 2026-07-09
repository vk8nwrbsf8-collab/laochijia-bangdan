import React, { useState } from 'react';
import { Dish } from '../types';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit } from 'lucide-react';
import { motion, useAnimation, PanInfo, useMotionValue } from 'framer-motion';
import ConfirmDialog from './ConfirmDialog';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

const DishCard: React.FC<{ dish: Dish }> = ({ dish }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const controls = useAnimation();
  const x = useMotionValue(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60) {
      controls.start({ x: -140 });
    } else {
      controls.start({ x: 0 });
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/dishes/${dish.id}`));
      setShowConfirm(false);
    } catch (e) {
      console.error(e);
      alert('删除失败');
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-card border border-theme bg-danger">
      {/* Background actions */}
      <div className="absolute right-0 top-0 bottom-0 flex w-[140px]">
        <button 
          onClick={() => navigate(`/add?type=dish&id=${dish.id}`)}
          className="flex-1 bg-blue-500 text-white flex flex-col items-center justify-center active:bg-blue-600"
        >
          <Edit className="w-5 h-5 mb-1" />
          <span className="text-xs">编辑</span>
        </button>
        <button 
          onClick={() => setShowConfirm(true)}
          className="flex-1 bg-danger text-white flex flex-col items-center justify-center active:bg-red-600"
        >
          <Trash2 className="w-5 h-5 mb-1" />
          <span className="text-xs">删除</span>
        </button>
      </div>

      <motion.div 
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        onClick={(e) => {
          if (Math.abs(x.get()) < 5) {
            navigate(`/dish/${dish.id}`);
          } else {
            controls.start({ x: 0 });
          }
        }}
        className="bg-primary flex h-24 relative z-10 w-full cursor-pointer"
      >
        <div className="w-24 h-full flex-shrink-0 bg-secondary overflow-hidden pointer-events-none">
          {dish.images && dish.images.length > 0 ? (
            <img src={dish.images[0]} alt={dish.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">暂无图片</div>
          )}
        </div>
        
        <div className="flex-1 p-2.5 flex flex-col min-w-0 relative pointer-events-none">
          <h3 className="font-bold text-[15px] text-primary truncate pr-2 mb-0.5 leading-tight">{dish.name}</h3>
          
          <div className="text-xs text-secondary mb-0.5 truncate">
            {dish.shop_name || '未知商家'}
          </div>
          
          <div className="text-sm font-medium text-primary mb-1">
            {dish.price ? `¥${dish.price}` : '价格未知'}
          </div>
          
          <p className="text-xs text-tertiary truncate mt-auto">{dish.comment || '暂无评价'}</p>

          <div className="absolute right-3 bottom-3 bg-accent text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            {dish.rating}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog 
        isOpen={showConfirm}
        title="确认删除"
        message={`确定要删除餐品「${dish.name}」吗？删除后不可恢复。`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirm(false);
          controls.start({ x: 0 });
        }}
      />
    </div>
  );
};

export default DishCard;
