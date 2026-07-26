import React, { useEffect, useRef, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useHighDemand } from '../context/HighDemandContext';
import { AuthContext } from '../context/AuthContext';

export const HighDemandOverlay = () => {
  const { isHighDemandMode } = useHighDemand();
  const { user, loginType, isAdmin } = useContext(AuthContext);
  const location = useLocation();
  const videoRef = useRef(null);

  // Determine if current user or route is exempt (Admin authentication or Admin routes)
  const isExemptAdmin = Boolean(
    isAdmin ||
    user?.is_admin ||
    loginType === 'admin' ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login'
  );

  const shouldShowOverlay = isHighDemandMode && !isExemptAdmin;

  useEffect(() => {
    if (!shouldShowOverlay) return;

    // Prevent background scrolling while overlay is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Intercept and block all key events (keyboard navigation, shortcuts)
    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Intercept and block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Intercept and block mouse wheel & touch scrolling
    const handleScrollTouch = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Intercept all pointer / click events
    const handlePointerEvent = (e) => {
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('wheel', handleScrollTouch, { capture: true, passive: false });
    window.addEventListener('touchmove', handleScrollTouch, { capture: true, passive: false });
    window.addEventListener('click', handlePointerEvent, { capture: true });
    window.addEventListener('mousedown', handlePointerEvent, { capture: true });
    window.addEventListener('mouseup', handlePointerEvent, { capture: true });
    window.addEventListener('touchstart', handlePointerEvent, { capture: true });
    window.addEventListener('touchend', handlePointerEvent, { capture: true });

    // Attempt video play programmatically to ensure autoplay success across all browsers
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn("[HIGH_DEMAND] Video autoplay caught:", err);
      });
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('wheel', handleScrollTouch, { capture: true });
      window.removeEventListener('touchmove', handleScrollTouch, { capture: true });
      window.removeEventListener('click', handlePointerEvent, { capture: true });
      window.removeEventListener('mousedown', handlePointerEvent, { capture: true });
      window.removeEventListener('mouseup', handlePointerEvent, { capture: true });
      window.removeEventListener('touchstart', handlePointerEvent, { capture: true });
      window.removeEventListener('touchend', handlePointerEvent, { capture: true });
    };
  }, [shouldShowOverlay]);

  if (!shouldShowOverlay) return null;

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 top-0 left-0 w-screen h-screen z-[999999] bg-black overflow-hidden select-none pointer-events-auto flex items-center justify-center"
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 999999
      }}
    >
      <video
        ref={videoRef}
        src="/high_demand.mp4"
        preload="metadata"
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-contain md:object-cover block select-none pointer-events-none"
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};
