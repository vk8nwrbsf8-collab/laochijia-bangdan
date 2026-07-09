import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../AuthContext";
import { Shop, Dish } from "../types";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { X, Download, UtensilsCrossed, Link, Copy, Check } from "lucide-react";
import { cn } from "../components/Layout";

export default function Poster() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "shop";
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // 公开榜单链接 — 使用当前访问的 host，无论是 localhost、局域网IP还是正式域名都正确
  const publicUrl = `${window.location.protocol}//${window.location.host}/u/${user?.uid}/${type === "shop" ? "shops" : "dishes"}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级：选中提示
      prompt('复制以下链接分享给好友：', publicUrl);
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchTopItems = async () => {
      // Sort by rating? Since rating is a string ('夯', '顶级' etc), we can't easily orderBy it unless we have a sort_order.
      // We will just fetch the latest 10 for now.
      const q = query(
        collection(
          db,
          `users/${user.uid}/${type === "shop" ? "shops" : "dishes"}`,
        ),
        orderBy("created_at", "desc")
      );
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      const ratingOrder = ['夯', '顶级', '人上人', 'NPC', '拉'];
      data.sort((a, b) => {
        const rankA = ratingOrder.indexOf(a.rating);
        const rankB = ratingOrder.indexOf(b.rating);
        const validRankA = rankA === -1 ? 99 : rankA;
        const validRankB = rankB === -1 ? 99 : rankB;
        if (validRankA !== validRankB) {
          return validRankA - validRankB;
        }
        // If same rating, sort by created_at desc
        return b.created_at - a.created_at;
      });

      setItems(data.slice(0, 10));
    };
    fetchTopItems();
  }, [user, type]);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${profile?.nickname || "美食家"}的${type === "shop" ? "商家" : "餐品"}榜单.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate poster", err);
      alert("生成海报失败");
    } finally {
      setGenerating(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col h-screen bg-black w-full max-w-md mx-auto relative overflow-hidden">
      {/* Top Bar for App UI, not in poster */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-black/40 rounded-full text-white backdrop-blur-sm active:scale-95 transition-transform"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          {/* 复制公开链接 */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/40 text-white rounded-full text-xs backdrop-blur-sm active:scale-95 transition-transform"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link className="w-3.5 h-3.5" />}
            {copied ? '已复制' : '复制链接'}
          </button>
          {/* 下载海报 */}
          <button
            onClick={handleDownload}
            disabled={generating}
            className="w-10 h-10 flex items-center justify-center bg-accent text-white rounded-full font-medium shadow-lg active:scale-95 transition-transform disabled:opacity-70"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Poster Container */}
      <div className="flex-1 overflow-y-auto w-full hide-scrollbar pb-24">
        {/* The Actual Poster Element */}
        <div
          ref={posterRef}
          className="w-full bg-[#0B0A08] flex flex-col relative overflow-hidden font-sans"
          style={{ minHeight: "800px" }}
        >
          {/* Top Background Design */}
          <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-[#3E2514] via-[#1A1009] to-[#0B0A08] pointer-events-none z-0">
            {/* Ambient glows */}
            <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] bg-[#FF5722] rounded-full blur-[120px] opacity-20"></div>
            <div className="absolute top-[100px] right-[50px] w-[200px] h-[200px] bg-[#FFC107] rounded-full blur-[100px] opacity-10"></div>
            {/* Background pattern (10) as in image */}
            <div className="absolute -top-10 -left-10 text-[300px] font-black text-white/[0.03] leading-none tracking-tighter">
              10
            </div>

            {/* Golden beams */}
            <div className="absolute top-[350px] left-1/2 -translate-x-1/2 w-[800px] h-[200px] rotate-[15deg] bg-gradient-to-r from-transparent via-[#FFB74D]/10 to-transparent blur-md"></div>
            <div className="absolute top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[100px] -rotate-[15deg] bg-gradient-to-r from-transparent via-[#FF5722]/10 to-transparent blur-md"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center pt-16 px-6">
            {/* App Branding */}
            <div className="flex items-center space-x-2 mb-6 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
              <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold tracking-widest text-sm">
                老吃家·极选
              </span>
            </div>

            {/* Main Title Group */}
            <div className="relative mb-2 w-full text-center">
              <h1 className="text-4xl sm:text-5xl font-black italic tracking-wider text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] whitespace-nowrap overflow-hidden text-ellipsis">
                {type === 'shop' ? (profile?.banner_title || "老吃家商户榜") : (profile?.dish_banner_title || "老吃家餐品榜")}
              </h1>
            </div>

            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#FFF5D1] to-[#D4AF37] mb-2 tracking-widest">
              {currentYear}
            </div>

            <div className="flex items-center mb-2">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]"></div>
              <div className="px-4 text-[#D4AF37] font-medium tracking-[0.3em] text-lg">
                正式发布
              </div>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]"></div>
            </div>

            {/* Podium Graphic (CSS CSS simulation) */}
            <div className="relative w-full max-w-[280px] h-12 mb-4 mx-auto">
              {/* Top tier */}
              <div className="absolute bottom-4 left-[10%] right-[10%] h-6 bg-gradient-to-r from-[#8C6D53] via-[#C49A7A] to-[#8C6D53] transform perspective-[200px] rotateX-[40deg] shadow-lg"></div>
              {/* Bottom tier */}
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-[#735A45] via-[#A67B5B] to-[#735A45] transform perspective-[200px] rotateX-[20deg] shadow-xl"></div>
            </div>

            {/* List Section — 暖米色底，匹配整体色调 */}
            <div className="w-full bg-[#F4EAE0] rounded-t-3xl p-6 shadow-[0_-10px_30px_rgba(166,123,91,0.18)] min-h-[400px]">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-[#3C2A21]">
                  {type === "shop" ? "上榜商家 TOP10" : "上榜餐品 TOP10"}
                </h2>
                <div className="text-xs text-[#8C7A6B] bg-[#EFE4D6] px-2.5 py-1 rounded-full border border-[#D4BCA8]">
                  由 {profile?.nickname} 严选
                </div>
              </div>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center text-[#8C7A6B] py-10 text-sm">
                    暂无上榜记录
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.id} className="flex items-start">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-t-lg rounded-bl-lg rounded-br-sm flex items-center justify-center text-white font-bold text-lg shrink-0 mr-3 mt-0.5 shadow-sm",
                          index === 0
                            ? "bg-gradient-to-br from-[#FFD700] to-[#FFA000]"
                            : index === 1
                              ? "bg-gradient-to-br from-[#D0D0D0] to-[#9E9E9E]"
                              : index === 2
                                ? "bg-gradient-to-br from-[#FFB74D] to-[#F57C00]"
                                : "bg-[#6D5546]",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-dashed border-[#D4BCA8] pb-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-[#3C2A21] text-base truncate pr-2 leading-tight mb-0.5">
                            {item.name}
                          </h3>
                          <span className="shrink-0 bg-[#A67B5B] text-white text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5">
                            {item.rating}
                          </span>
                        </div>
                        <p className="text-xs text-[#8C7A6B] truncate">
                          {item.city} · {item.category}{" "}
                          {item.avg_price ? `· ¥${item.avg_price}/人` : ""}{" "}
                          {item.price ? `· ¥${item.price}` : ""}
                        </p>
                        {item.comment && (
                          <p className="text-[11px] text-[#8C7A6B] mt-1 line-clamp-1 bg-[#EAD9CC] px-1.5 py-0.5 rounded italic">
                            "{item.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="w-full bg-[#A67B5B] p-6 text-white flex justify-between items-end">
              <div className="flex-1 mr-4">
                <h3 className="text-2xl font-black mb-1 tracking-wider leading-tight text-[#EFE4D6]">
                  {profile?.nickname} 的<br />
                  私人美食图鉴
                </h3>
                <p className="text-sm opacity-90 mb-4 text-white">
                  {profile?.banner_slogan?.replace(
                    "{nickname}",
                    profile?.nickname || "美食家",
                  ) || "童叟无欺，真实品鉴"}
                </p>
                <div className="flex items-end font-mono">
                  <div className="text-4xl font-bold leading-none">
                    {new Date().getMonth() + 1}.{new Date().getDate()}
                  </div>
                  <div className="text-sm ml-2 opacity-80 mb-1">更新</div>
                </div>
              </div>
              {/* 二维码：指向该用户公开榜单页 */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div className="w-20 h-20 bg-white p-1.5 rounded-xl shadow-md">
                  <QRCodeSVG
                    value={publicUrl}
                    size={200}
                    style={{ width: "100%", height: "100%" }}
                    fgColor="#3C2A21"
                  />
                </div>
                <span className="text-[10px] text-white/70 mt-0.5">扫码查看榜单</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
