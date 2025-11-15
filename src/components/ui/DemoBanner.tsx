import { AlertTriangle } from 'lucide-react';

interface DemoBannerProps {
  message?: string;
}

export default function DemoBanner({
  message = 'デモモードでログイン中です。入力内容は端末内にのみ保存されます。',
}: DemoBannerProps) {
  return (
    <div className="w-full flex justify-center mb-4">
      <div className="relative flex items-center space-x-3 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-800/90 text-white shadow-lg shadow-indigo-200 px-4 py-3 max-w-sm w-full">
        <AlertTriangle className="h-5 w-5 text-amber-300 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold tracking-wide uppercase text-amber-200">
            Demo User
          </p>
          <p className="text-sm leading-snug">{message}</p>
        </div>
      </div>
    </div>
  );
}
