import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../../src/components/Sidebar';
import { AppShell } from '../../src/app/AppShell';

describe('Sidebar keyboard navigation and focus accessibility', () => {
  it('keeps the edge toggle button accessible and locks hidden content when desktop sidebar is collapsed', () => {
    const onToggleSidebar = vi.fn();
    const { container, rerender } = render(
      <MemoryRouter>
        <Sidebar
          isOpen={true}
          isOverlay={false}
          onToggleSidebar={onToggleSidebar}
          user={null}
        />
      </MemoryRouter>
    );

    // When open on desktop, toggle button says "Thu gọn"
    const toggleBtn = screen.getByRole('button', { name: /Thu gọn thanh điều hướng/i });
    expect(toggleBtn).toBeTruthy();

    // Nav content container is NOT inert
    const navContent = container.querySelector('[inert]');
    expect(navContent).toBeNull();

    // Rerender as collapsed
    rerender(
      <MemoryRouter>
        <Sidebar
          isOpen={false}
          isOverlay={false}
          onToggleSidebar={onToggleSidebar}
          user={null}
        />
      </MemoryRouter>
    );

    // The edge button changes label to "Mở thanh điều hướng" and is NOT inside an inert container
    const openBtn = screen.getByRole('button', { name: /Mở thanh điều hướng/i });
    expect(openBtn).toBeTruthy();
    expect(openBtn.closest('[inert]')).toBeNull();

    // The inner content container IS marked inert so hidden links/buttons do not receive focus
    const inertContent = container.querySelector('div[inert]');
    expect(inertContent).not.toBeNull();

    // Clicking the open button calls onToggleSidebar
    fireEvent.click(openBtn);
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it('moves focus to the edge toggle button when desktop sidebar closes with focus inside', () => {
    const onToggleSidebar = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <Sidebar
          isOpen={true}
          isOverlay={false}
          onToggleSidebar={onToggleSidebar}
          user={null}
        />
      </MemoryRouter>
    );

    // Focus a button inside the sidebar (e.g. login button)
    const loginBtn = screen.getByRole('button', { name: /Đăng nhập/i });
    loginBtn.focus();
    expect(document.activeElement).toBe(loginBtn);

    // Collapse the sidebar
    rerender(
      <MemoryRouter>
        <Sidebar
          isOpen={false}
          isOverlay={false}
          onToggleSidebar={onToggleSidebar}
          user={null}
        />
      </MemoryRouter>
    );

    // Focus should now be transferred to the edge toggle button
    const toggleBtn = screen.getByRole('button', { name: /Mở thanh điều hướng/i });
    expect(document.activeElement).toBe(toggleBtn);
  });

  it('focuses close button on mobile drawer open and responds to close and Escape', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar
          isOpen={true}
          isOverlay={true}
          onClose={onClose}
          user={null}
        />
      </MemoryRouter>
    );

    const closeBtn = screen.getByRole('button', { name: /Đóng thanh điều hướng/i });
    expect(closeBtn).toBeTruthy();
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('AppShell marks main content inert when mobile drawer is open', () => {
    // Mock mobile matchMedia
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('900px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );

    // On mobile default, sidebar is closed, so main is not inert
    const mainEl = container.querySelector('main');
    expect(mainEl).toBeTruthy();
    expect(mainEl?.hasAttribute('inert')).toBe(false);

    // Open drawer
    const openMenuBtn = screen.getByRole('button', { name: /Mở thanh điều hướng/i });
    fireEvent.click(openMenuBtn);

    // Now main should have inert
    expect(mainEl?.hasAttribute('inert')).toBe(true);

    // Close drawer via Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mainEl?.hasAttribute('inert')).toBe(false);

    window.matchMedia = originalMatchMedia;
  });
});
