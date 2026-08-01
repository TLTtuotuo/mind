interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

export default function Spinner({ size = 'md', text, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <div className={`${sizeMap[size]} border-3 border-warm-200 border-t-warm-500 rounded-full animate-spin`}
        style={{ borderWidth: '3px' }} />
      {text && <p className="text-sm text-gray-400 animate-pulse">{text}</p>}
    </div>
  );
}
