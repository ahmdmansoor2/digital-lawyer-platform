/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { Eye } from 'lucide-react';
import { ActionBtn, ActionBtnSmall } from '../ClientsListShared';

// Test harness: renders component + exposes ref to access rendered DOM
function TestHarness({ component }: { component: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return <div ref={ref}>{component}</div>;
}

let lastContainer: HTMLDivElement | null = null;

function renderInContainer(element: React.ReactElement): { root: ReactDOM.Root; getByTitle: (title: string) => HTMLElement } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  lastContainer = container;
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(<TestHarness component={element} />);
  });
  return {
    root,
    getByTitle: (title: string) => {
      const el = container.querySelector(`[title="${title}"]`);
      if (!el) throw new Error(`No element with title="${title}"`);
      return el as HTMLElement;
    },
  };
}

function fireClick(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('ActionBtn', () => {
  it('renders with the given title', () => {
    const { getByTitle } = renderInContainer(
      <ActionBtn icon={Eye} onClick={() => {}} title="عرض" color="slate" />
    );
    expect(getByTitle('عرض')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { getByTitle } = renderInContainer(
      <ActionBtn icon={Eye} onClick={handleClick} title="t" color="slate" />
    );
    fireClick(getByTitle('t'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies different colors', () => {
    const colors: Array<'slate' | 'indigo' | 'red' | 'emerald' | 'blue'> = ['slate', 'red', 'indigo', 'emerald', 'blue'];
    colors.forEach((color) => {
      const { getByTitle } = renderInContainer(
        <ActionBtn icon={Eye} onClick={() => {}} title={`btn-${color}`} color={color} />
      );
      const btn = getByTitle(`btn-${color}`);
      // Check that the className contains something related to the color
      expect(btn.className).toMatch(new RegExp(color, 'i'));
    });
  });

  it('passes the click event to the handler', () => {
    const handleClick = vi.fn();
    const { getByTitle } = renderInContainer(
      <ActionBtn icon={Eye} onClick={handleClick} title="t" color="slate" />
    );
    fireClick(getByTitle('t'));
    expect(handleClick).toHaveBeenCalled();
    const arg = handleClick.mock.calls[0]?.[0];
    expect(arg).toBeDefined();
    expect(arg.type).toBe('click');
  });
});

describe('ActionBtnSmall', () => {
  it('renders with the given title', () => {
    const { getByTitle } = renderInContainer(
      <ActionBtnSmall icon={Eye} onClick={() => {}} title="عرض" color="slate" />
    );
    expect(getByTitle('عرض')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { getByTitle } = renderInContainer(
      <ActionBtnSmall icon={Eye} onClick={handleClick} title="t" color="slate" />
    );
    fireClick(getByTitle('t'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies different colors', () => {
    const colors = ['slate', 'indigo', 'emerald'];
    colors.forEach((color) => {
      const { getByTitle } = renderInContainer(
        <ActionBtnSmall icon={Eye} onClick={() => {}} title={`btn-${color}`} color={color} />
      );
      const btn = getByTitle(`btn-${color}`);
      expect(btn.className).toMatch(new RegExp(color, 'i'));
    });
  });
});
