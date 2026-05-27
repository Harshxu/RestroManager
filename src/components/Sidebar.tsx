import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Receipt,
  BarChart3,
  Settings, 
  UtensilsCrossed,
  ChevronRight,
  ArrowDownCircle,
  Users,
  Star,
  BookOpen
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { useAuth } from '@/context/AuthContext';

const menuItems = [
  { name: 'Dashboard',  icon: LayoutDashboard,   href: '/' },
  { name: 'Manage',     icon: UtensilsCrossed,    href: '/manage',    restaurantOnly: true },
  { name: 'Menu',       icon: BookOpen,           href: '/menu',      restaurantOnly: true },
  { name: 'Inventory',  icon: Package,            href: '/inventory' },
  { name: 'Billing',    icon: Receipt,            href: '/billing' },
  { name: 'Reviews',    icon: Star,               href: '/reviews',   restaurantOnly: true },
  { name: 'Reports',   icon: BarChart3,           href: '/reports' },
  { name: 'Finance',    icon: ArrowDownCircle,    href: '/expenses' },
  { name: 'Customers',  icon: Users,              href: '/customers' },
  { name: 'Settings',   icon: Settings,           href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (pathname === '/login') return null;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>R</div>
        <span className={styles.logoText}>Restrofy</span>
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isRestaurantItem = (item as any).restaurantOnly;
          if (isRestaurantItem && user?.businessType !== 'Restaurant') return null;

          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <div className={styles.iconWrapper}>
                <Icon size={20} />
              </div>
              <span className={styles.navText}>{item.name}</span>
              {isActive && <ChevronRight className={styles.activeIndicator} size={16} />}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.name || 'User'}</p>
            <p className={styles.userRole}>{user?.businessType || 'Role'}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          style={{ width: '100%', marginTop: '12px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
