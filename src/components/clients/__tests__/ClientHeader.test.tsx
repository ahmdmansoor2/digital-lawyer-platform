/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClientHeader.test.tsx — اختبارات للـ header bar + add button.
 *
 * بدون @testing-library/react — نستخدم react-dom/client + act مباشرة.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import ClientHeader from '../ClientHeader';

let lastContainer: HTMLDivElement | null = null;

function renderInContainer(element: React.ReactElement): {
  getByTestId: (id: string) => HTMLElement;
  queryAll: (selector: string) => NodeListOf<Element>;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  lastContainer = container;
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    getByTestId: (id: string) => {
      const el = container.querySelector(`[id="${id}"]`);
      if (!el) throw new Error(`No element with id="${id}"`);
      return el as HTMLElement;
    },
    queryAll: (selector: string) => container.querySelectorAll(selector),
  };
}

function fireClick(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('ClientHeader', () => {
  afterEach(() => {
    if (lastContainer) {
      lastContainer.remove();
      lastContainer = null;
    }
  });

  it('يعرض العنوان والوصف', () => {
    const { queryAll } = renderInContainer(<ClientHeader onAddClient={vi.fn()} />);
    const allText = Array.from(queryAll('h1, p')).map(e => e.textContent);
    expect(allText.some(t => t?.includes('دليل الموكلين والشركات'))).toBe(true);
    expect(allText.some(t => t?.includes('فهرس هويات الموكلين'))).toBe(true);
  });

  it('يعرض زر الإضافة', () => {
    const { getByTestId } = renderInContainer(<ClientHeader onAddClient={vi.fn()} />);
    const btn = getByTestId('btn-add-client-panel');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('إضافة موكل وتوثيق جديد');
  });

  it('ينادي onAddClient لما يضغط على زر الإضافة', () => {
    const onAddClient = vi.fn();
    const { getByTestId } = renderInContainer(<ClientHeader onAddClient={onAddClient} />);
    fireClick(getByTestId('btn-add-client-panel'));
    expect(onAddClient).toHaveBeenCalledTimes(1);
  });
});
