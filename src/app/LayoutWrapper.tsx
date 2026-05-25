'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AIAssistant from '@/components/AIAssistant';
import ReviewAlerts from '@/components/ReviewAlerts';
import styles from './layout.module.css';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReceiptPage = pathname.startsWith('/receipt/');

  if (isReceiptPage) {
    return <main style={{ width: '100%', minHeight: '100vh' }}>{children}</main>;
  }

  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        {children}
      </main>
      <AIAssistant />
      <ReviewAlerts />
    </div>
  );
}
