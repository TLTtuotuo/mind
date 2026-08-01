import { useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** 动画类型，默认 fade+slide */
  type?: 'page' | 'fade' | 'slideUp' | 'scale';
}

const classMap = {
  page: 'animate-page-enter',
  fade: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  scale: 'animate-scale-in',
};

export default function PageTransition({ children, type = 'page' }: Props) {
  const [key, setKey] = useState(0);

  // 每次 children 变化时重新触发动画
  useEffect(() => {
    setKey(k => k + 1);
  }, []);

  return (
    <div key={key} className={classMap[type]}>
      {children}
    </div>
  );
}

/** 列表项交错动画容器 */
export function StaggerList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`stagger-list ${className}`}>
      {children}
    </div>
  );
}
