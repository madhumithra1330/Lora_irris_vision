import { APP_NAME } from '../utils/constants';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-surface-900/90 backdrop-blur-lg border-b border-white/6">
      <div className="flex items-center justify-center h-12 px-4 gap-2">
        <img
          src="/LIV_Logo.png"
          alt="LIV Logo"
          className="w-6 h-6 object-contain rounded-md"
        />
        <h1 className="text-sm font-bold text-liv-400 font-[Outfit] tracking-wide">
          {APP_NAME}
        </h1>
      </div>
    </header>
  );
}
