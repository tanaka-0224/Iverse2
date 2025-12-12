import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import Button from './Button';
import lonelyEngineerImg from '../../assets/lonely-engineer.png';
import connectedEngineersImg from '../../assets/connected-engineers.png';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 2;

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    setCurrentPage(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* モーダル */}
      <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">このアプリについて</h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            aria-label="閉じる"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* ページインジケーター */}
        <div className="px-6 pt-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index + 1 <= currentPage
                    ? 'bg-blue-600'
                    : 'bg-gray-300/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentPage === 1 && (
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <div className="text-center mb-8">
                <div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center rounded-2xl p-4 shadow-lg bg-gradient-to-br from-[#2563EB] to-[#9333EA]">
                  <img 
                    src={lonelyEngineerImg} 
                    alt="孤独なエンジニア" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  こんな経験、ありませんか？
                </h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-lg">
                  「本気で技術を極めたいのに、<br />
                  互いに刺激し合えるエンジニアがいない」
                </p>
                
                <p>
                  私にとって、それは「AIの学習」でした。
                </p>
                
                <p>
                  勉強会を主催し、エンジニアを集めました。<br />
                  でも、そこには大きな「温度差」が。
                </p>
                
                <p>
                  私は夜通しコードを書いて、論文を読み込んで、<br />
                  深く議論するような「没頭」をしたかった。<br />
                  でも、集まった仲間は「少し触れてみたい」レベル。
                </p>
                
                <p className="text-xl font-bold text-gray-900 pt-4">
                  「集まっているのに、一人ぼっち」
                </p>
                
                <p className="text-lg font-semibold text-gray-900">
                  その時、痛感しました。<br />
                  「ただ『エンジニア』が集まるだけでは意味がない。<br />
                  <span className="text-blue-600">『熱量』が合わなければ、何も生まれない</span>」
                </p>
              </div>
            </div>
          )}

          {currentPage === 2 && (
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <div className="text-center mb-8">
                <div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center rounded-2xl p-4 shadow-lg bg-gradient-to-br from-[#2563EB] to-[#9333EA]">
                  <img 
                    src={connectedEngineersImg} 
                    alt="繋がるエンジニア" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  だから、作りました
                </h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-lg">
                  スキルや目的でマッチングするのではなく、<br />
                  <span className="text-xl font-bold text-blue-600">「熱量」で繋がれる場所</span>
                </p>
                
                <p>
                  同じ熱量を持つエンジニアと出会い、<br />
                  共に技術を追求し、高め合える。
                </p>
                
                <p className="text-lg font-semibold text-gray-900 pt-4">
                  それが、このアプリです。
                </p>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mt-6">
                  <p className="text-center text-lg font-semibold text-gray-900">
                    あなたの「熱量」に共感するエンジニアが、<br />
                    きっと見つかります。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t border-gray-300/50 px-6 py-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
          <Button 
            onClick={handleNext} 
            className="w-full" 
            size="lg"
          >
            {currentPage < totalPages ? (
              <>
                次へ
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            ) : (
              '始める'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
