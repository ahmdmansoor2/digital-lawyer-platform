/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ActionBtn.test.tsx — اختبارات الـ ActionBtn/ActionBtnSmall الموحدين.
 */
import { describe, it, expect, vi } from 'vitest';
import React, { useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { Eye } from 'lucide-react';
import { ActionBtn, ActionBtnSmall } from '../ActionBtn';

let lastContainer: HTMLDivElement | null = null;

function renderInContainer(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  lastContainer = container;
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(<div>{element}</div>);
  });
  return { container, root };
}

function fireClick(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function getByTitle(container: HTMLElement, title: string) {
  const el = container.querySelector(`[title="${title}"]`);
  if (!el) throw new Error(`No element with title="${title}"`);
  return el as HTMLElement;
}

function getByTestId(container: HTMLElement, testId: string) {
  const el = container.querySelector(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`No element with data-testid="${testId}"`);
  return el as HTMLElement;
}

describe('ActionBtn', () => {
  it('renders with the given title', () => {
    const { container } = renderInContainer(<ActionBtn icon={Eye} onClick={() => {}} title="عرض" color="slate" />);
    expect(getByTitle(container, 'عرض')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = renderInContainer(<ActionBtn icon={Eye} onClick={handleClick} title="t" color="slate" />);
    fireClick(getByTitle(container, 't'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('passes the click event to the handler', () => {
    const handleClick = vi.fn();
    const { container } = renderInContainer(<ActionBtn icon={Eye} onClick={handleClick} title="t" color="slate" />);
    fireClick(getByTitle(container, 't'));
    const arg = handleClick.mock.calls[0]?.[0];
    expect(arg).toBeDefined();
    expect(arg.type).toBe('click');
  });

  it('applies different colors via className', () => {
    const colors: Array<'slate' | 'indigo' | 'red' | 'blue'> = ['slate', 'red', 'indigo', 'blue'];
    colors.forEach(color => {
      const { container } = renderInContainer(<ActionBtn icon={Eye} onClick={() => {}} title={`btn-${color}`} color={color} />);
      const btn = getByTitle(container, `btn-${color}`);
      expect(btn.className).toMatch(new RegExp(color, 'i'));
    });
  });
});

describe('ActionBtnSmall', () => {
  it('renders with the given title', () => {
    const { container } = renderInContainer(<ActionBtnSmall icon={Eye} onClick={() => {}} title="عرض" color="slate" />);
    expect(getByTitle(container, 'عرض')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = renderInContainer(<ActionBtnSmall icon={Eye} onClick={handleClick} title="t" color="slate" />);
    fireClick(getByTitle(container, 't'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not require a click event argument', () => {
    const handleClick = vi.fn();
    const { container } = renderInContainer(<ActionBtnSmall icon={Eye} onClick={handleClick} title="t" color="indigo" />);
    const btn = getByTitle(container, 't');
    expect(btn.className).toMatch(/indigo/i);
    fireClick(btn);
    expect(handleClick).toHaveBeenCalled();
  });
});
