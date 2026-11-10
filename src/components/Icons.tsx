import type { ReactNode } from 'react'

function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const TodayIcon = () => <Icon><circle cx="12" cy="8" r="3.2" /><path d="M5 20c.6-3.6 3.3-5.5 7-5.5s6.4 1.9 7 5.5" /></Icon>
export const ClosetIcon = () => <Icon><path d="M12 6.5a2 2 0 1 0-2-2" /><path d="M12 6.5v2l8.5 5.6a1.3 1.3 0 0 1-.7 2.4H4.2a1.3 1.3 0 0 1-.7-2.4L12 8.5" /></Icon>
export const PlannerIcon = () => <Icon><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></Icon>
export const AccountIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M8 14.2c.9 1.2 2.4 1.9 4 1.9s3.1-.7 4-1.9M9 9.8h.01M15 9.8h.01" /></Icon>
export const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>
export const CameraIcon = () => <Icon><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.2-1.6h6.2L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.5" r="3.2" /></Icon>
export const GalleryIcon = () => <Icon><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 3.5 3L16 12l4 4" /></Icon>
export const CloseIcon = () => <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>
export const DropIcon = () => <Icon size={16}><path d="M12 3.5c3 3.6 5.5 6.4 5.5 9.6a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6 5.5-9.6z" /></Icon>
export const TrashIcon = () => <Icon size={20}><path d="M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7M10.5 11v5M13.5 11v5" /></Icon>
