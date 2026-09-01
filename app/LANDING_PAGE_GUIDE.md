# MDMIS Interactive Landing Page Guide

## 🎬 Overview

The MDMIS landing page is now a fully interactive, animated experience featuring all 6 videos from your `/videos` directory. Each section includes scroll-based animations, hover effects, and video backgrounds that create an immersive showcase of the platform.

## 🎥 Video Placement Map

### 1. Hero Section (Top)
- **Video**: `istockphoto-1689123730-640_adpp_is.mp4`
- **Effect**: Full-screen background with 75% overlay
- **Animation**: Parallax scrolling - content moves independently from background
- **Features**: 
  - Animated badge with live status
  - Gradient text for main heading
  - Animated statistics cards with counting effect
  - Bouncing scroll indicator

### 2. Features Section
Each of the 6 feature cards has its own video that appears on hover:

| Feature | Video | Color Theme |
|---------|-------|-------------|
| 3D Subsurface Mapping | `istockphoto-1689123730-640_adpp_is.mp4` | Accent (Cyan) |
| AI Mineral Classification | `istockphoto-1223706310-640_adpp_is.mp4` | Primary (Gold) |
| Chain of Custody | `13476-248644895_medium.mp4` | Success (Green) |
| Live Transport Tracking | `40030-424911975_medium.mp4` | Primary (Gold) |
| Compliance Automation | `istockphoto-1453371060-640_adpp_is.mp4` | Accent (Cyan) |
| Role-Based Access Control | `istockphoto-1977219422-640_adpp_is.mp4` | Destructive (Red) |

**Interaction**: Hover over any card to see its video background fade in at 20% opacity

### 3. CTA Section (Call to Action)
- **Video**: `istockphoto-1453371060-640_adpp_is.mp4`
- **Effect**: Full-section background with 80% overlay
- **Features**: Gradient text, AI badge, animated buttons

## ✨ Animation Catalog

### Entry Animations (Scroll-triggered)
- **Fade Up**: Elements slide up while fading in
- **Fade Left/Right**: Cards slide from sides
- **Scale In**: Elements grow from center
- **Staggered**: Sequential delays for lists

### Hover Animations
- **Scale Up**: Elements grow slightly (1.02-1.05x)
- **Icon Rotation**: Icons spin 360° on hover
- **Video Reveal**: Background videos fade in
- **Border Glow**: Primary color border appears

### Continuous Animations
- **Pulse**: Live badges and status indicators
- **Bounce**: Scroll indicator
- **Counter**: Statistics count up from 0
- **Role Rotation**: RBAC roles cycle every 3.5s

## 🎮 Interactive Elements

### Navigation Bar
- Logo rotates and scales on hover
- Menu items scale up on hover
- CTA button scales and changes shade
- Sticky positioning with blur backdrop

### Statistics Cards
- Auto-count animation when visible
- Hover scales card up
- Border changes to primary color

### Feature Cards
- Hover reveals video background
- Icon rotates 360°
- Card lifts up with shadow
- Border color transitions

### Role Cards (RBAC)
- Click to select active role
- Active card gets pulse animation
- Cards slide in from left/right
- Permission items stagger in

### Mineral Tags
- Staggered fade-in on scroll
- Hover scales and lifts card
- Color dot spins 360° on hover

### Contact Cards
- Staggered entry animation
- Icon rotates on hover
- Card scales on hover

## 🎨 Visual Effects

### Overlays
- **Scanning Beam**: Horizontal line sweeps across videos
- **Grid Backdrop**: Technical grid pattern overlay
- **Gradient Layers**: Multiple gradients for depth

### Parallax Scrolling
- Hero section content moves slower than scroll
- Creates depth perception
- Smooth spring physics

### Color System
All animations respect the theme:
- Primary: Mining gold (#e6b84d)
- Accent: Tech cyan (#4bc5d6)
- Success: Compliance green (#3fcf8e)
- Destructive: Warning red-orange (#e65a46)

## 🔧 Customization Options

### Adjust Video Overlay Darkness
In `VideoBackground` component:
```tsx
<VideoBackground 
  videoSrc="/videos/your-video.mp4" 
  overlay={0.75}  // 0 = no overlay, 1 = completely dark
/>
```

### Change Animation Speed
For counters:
```tsx
// In AnimatedCounter component
const duration = 2000  // milliseconds (default: 2000)
```

For role rotation:
```tsx
// In LandingPage component
const t = setInterval(() => ..., 3500)  // milliseconds (default: 3500)
```

### Modify Parallax Effect
In hero section:
```tsx
const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])  // Fade out range
const heroScale = useTransform(scrollY, [0, 400], [1, 0.9])  // Scale down range
```

## 📱 Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Reduced animations for performance
- Touch-optimized hover states
- Simplified video backgrounds

### Tablet (768px - 1024px)
- Two-column grids
- Medium animation complexity
- Balanced video quality

### Desktop (> 1024px)
- Full three-column layout
- All animations enabled
- High-quality videos
- Maximum visual effects

## 🚀 Performance Tips

### Video Optimization
1. Compress videos to < 5MB each
2. Use H.264 codec for compatibility
3. Set appropriate resolution (640p-1080p)
4. Add `preload="metadata"` for faster loading

### Animation Performance
1. Animations use GPU-accelerated properties (transform, opacity)
2. Intersection Observer only triggers once
3. Videos lazy-load on demand
4. Framer Motion optimizes repaints

### Loading Strategy
1. Hero video loads first
2. Feature videos load on hover
3. CTA video loads when scrolled into view
4. Progressive enhancement approach

## 🎯 User Flow

1. **Landing**: Hero with parallax, stats counting up
2. **Scroll Down**: Bounce indicator guides user
3. **Features**: Cards reveal videos on hover
4. **Roles**: Auto-rotating demo, click to explore
5. **Minerals**: Smooth staggered appearance
6. **CTA**: Strong call-to-action with video backdrop
7. **Contact**: Easy access to support channels

## 🐛 Troubleshooting

### Videos Not Playing
- Check browser autoplay policies
- Ensure videos are in `/public/videos/` or `/app/videos/`
- Verify MP4 format and H.264 codec
- Add `muted` attribute for autoplay

### Animations Stuttering
- Reduce animation complexity on low-end devices
- Check for too many simultaneous videos
- Optimize video file sizes
- Disable parallax on mobile

### Layout Issues
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`
- Check for CSS conflicts
- Verify Tailwind compilation

## 📊 Analytics Recommendations

Track these interactions:
- Hero CTA click rate
- Feature card hovers
- Role card clicks
- Video play events
- Scroll depth
- Contact card interactions

## 🎓 Learning Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [React Intersection Observer](https://github.com/thebuilder/react-intersection-observer)
- [Next.js Video Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Author**: MDMIS Development Team
