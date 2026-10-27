// src/Components/Sidebar.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, Box, Collapse, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import ChangePasswordDialog from '@/Components/ChangePasswordDialog';
import useAuth from '@/Hooks/useAuth';
import useLocales from '@/Hooks/useLocales';
import { ROLE, RoleId } from '@/constants/roles';

export const SIDEBAR_WIDTH = 280;
const BG = '#1a3291';
const DIVIDER = '1px dashed rgba(255, 255, 255, 0.3)';
type MenuItem = { label: string; href: string; roles?: RoleId[] };
type MenuGroup = { title: string; roles: RoleId[]; items: MenuItem[] };

// title / label là key dịch (locales/*.json → menu.*), khi render mới gọi translate
// Đường dẫn tạm thời – đổi theo route thật khi có trang
const MENU: MenuGroup[] = [
  {
    title: 'menu.groupAdmin',
    roles: [ROLE.ADMIN],
    items: [
      { label: 'menu.users', href: '/admin/users' },
      { label: 'menu.companies', href: '/admin/companies' },
      { label: 'menu.reportPeriods', href: '/admin/report-periods' },
    ],
  },
  {
    title: 'menu.groupSystem',
    roles: [ROLE.ENTERPRISE],
    items: [
      { label: 'menu.companyInfo', href: '/account' },
    ],
  },
  {
    title: 'menu.groupAccidents',
    roles: [ROLE.ADMIN, ROLE.ENTERPRISE],
    items: [
      { label: 'menu.accidentCategories', href: '/accidents/categories',roles: [ROLE.ADMIN]  },
      { label: 'menu.accidentLaborContracts', href: '/accidents/labor-contracts' },
    ],
  },
];

export default function Sidebar({ onToggle }: { onToggle?: () => void }) {
  const { user, logout } = useAuth();
  const { translate } = useLocales();
  const pathname = usePathname();
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const canSee = (roles: RoleId[] | undefined, roleId: number) => !roles || (roles as number[]).includes(roleId);
  const menu = user
  ? MENU.filter((g) => canSee(g.roles, user.roleId))
    .map((g) => ({ ...g, items: g.items.filter((i) => canSee(i.roles, user.roleId)) }))
  : [];
  const goLogin = async () => {
    await logout();
    router.replace('/login');
  };
  // Mặc định mở hết các nhóm
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MENU.map((g) => [g.title, true])),
  );

  const toggleGroup = (title: string) => setOpen((o) => ({ ...o, [title]: !o[title] }));

  return (
    <Box
      component="nav"
      sx={{
        width: SIDEBAR_WIDTH, height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
        display: 'flex', flexDirection: 'column', bgcolor: BG, color: 'common.white',
      }}
    >
      {/* Logo + tên đơn vị + nút thu gọn */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, p: 2, borderBottom: DIVIDER }}>
        <Box component="img" src="/images/quoc-huy.png" alt="Quốc huy" sx={{ width: 48, height: 48 }} />
        <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 14, lineHeight: 1.4, textAlign: 'center' }}>
          {translate('common.orgName')}
        </Typography>
        <IconButton onClick={onToggle} sx={{ color: 'inherit' }} aria-label={translate('menu.toggle')}>
          <MenuIcon />
        </IconButton>
      </Stack>

      {/* Menu: nhóm có icon bánh răng, mục con có dấu chấm */}
      <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {menu.map((group) => (
          <Box key={group.title}>
            <ListItemButton onClick={() => toggleGroup(group.title)}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><SettingsOutlinedIcon /></ListItemIcon>
              <ListItemText primary={translate(group.title)} />
              {open[group.title] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={open[group.title]}>
              {group.items.map((item) => (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={pathname.startsWith(item.href)}
                  sx={{ pl: 3, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)' } }}
                >
                  <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor', mr: 3 }} />
                  <ListItemText primary={translate(item.label)} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
                </ListItemButton>
              ))}
            </Collapse>
          </Box>
        ))}
      </List>

      {/* Người dùng đang đăng nhập: bấm để mở menu tài khoản */}
      <Box sx={{ flexShrink: 0, borderTop: DIVIDER }}>
        <ListItemButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ py: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, mr: 1.5 }}>{user?.username?.[0]?.toUpperCase()}</Avatar>
          <ListItemText primary={user?.username} slotProps={{ primary: { noWrap: true, sx: { fontSize: 14 } } }} />
          <ChevronRightIcon />
        </ListItemButton>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem component={Link} href="/account" onClick={() => setMenuAnchor(null)}>
          <ListItemIcon><PersonOutlinedIcon fontSize="small" /></ListItemIcon>{translate('menu.account')}
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); setPasswordOpen(true); }}>
          <ListItemIcon><KeyOutlinedIcon fontSize="small" /></ListItemIcon>{translate('changePassword.title')}
        </MenuItem>
        <MenuItem onClick={goLogin} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>{translate('common.logout')}
        </MenuItem>
      </Menu>

      {/* Đổi mật khẩu xong backend đã xoá cookie → về trang đăng nhập */}
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} onSuccess={goLogin} />
    </Box>
  );
}