/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClientFilters.test.tsx — اختبارات للـ search + view mode + count.
 *
 * بدون @testing-library/react — نستخدم react-dom/client + act مباشرة.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import ClientFilters, { type ClientViewMode } from '../ClientFilters';

let lastContainer: HTMLDivElement | null = null;

function renderInContainer(element: React.ReactElement): {
  getByTestId: (id: string) => HTMLElement;
  getByLabelText: (label: string) => HTMLElement;
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
    getByLabelText: (label: string) => {
      const el = container.querySelector(`[aria-label="${label}"]`);
      if (!el) throw new Error(`No element with aria-label="${label}"`);
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

function fireInput(el: HTMLInputElement, value: string) {
  act(() => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    nativeInputValueSetter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('ClientFilters', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    viewMode: 'grid' as ClientViewMode,
    onViewModeChange: vi.fn(),
    totalCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (lastContainer) {
      act(() => {
        // unmount
      });
      lastContainer.remove();
      lastContainer = null;
    }
  });

  it('يعرض search input مع الـ id الصحيح', () => {
    const { getByTestId } = renderInContainer(<ClientFilters {...defaultProps} />);
    const input = getByTestId('clients-search-box');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).placeholder).toContain('بطاقة قومي');
  });

  it('يعرض إجمالي count', () => {
    const { queryAll } = renderInContainer(<ClientFilters {...defaultProps} totalCount={42} />);
    const allText = Array.from(queryAll('span')).map(s => s.textContent);
    expect(allText.some(t => t === 'إجمالي: 42 موكل')).toBe(true);
  });

  it('يعرض 5 view mode buttons', () => {
    const { getByLabelText } = renderInContainer(<ClientFilters {...defaultProps} />);
    expect(getByLabelText('عرض شبكة')).toBeTruthy();
    expect(getByLabelText('عرض تفاصيل')).toBeTruthy();
    expect(getByLabelText('عرض أيقونات كبيرة')).toBeTruthy();
    expect(getByLabelText('عرض متوسط')).toBeTruthy();
    expect(getByLabelText('عرض صغير')).toBeTruthy();
  });

  it('يضع aria-pressed=true على الـ view mode المحدد', () => {
    const { getByLabelText } = renderInContainer(<ClientFilters {...defaultProps} viewMode="grid" />);
    expect(getByLabelText('عرض شبكة').getAttribute('aria-pressed')).toBe('true');
  });

  it('ينادي onSearchChange لما الـ user يكتب', () => {
    const onSearchChange = vi.fn();
    const { getByLabelText } = renderInContainer(<ClientFilters {...defaultProps} onSearchChange={onSearchChange} />);
    const input = getByLabelText('البحث في الموكلين') as HTMLInputElement;
    fireInput(input, 'أحمد');
    expect(onSearchChange).toHaveBeenCalledWith('أحمد');
  });

  it('ينادي onViewModeChange لما يضغط على view mode button', () => {
    const onViewModeChange = vi.fn();
    const { getByLabelText } = renderInContainer(<ClientFilters {...defaultProps} onViewModeChange={onViewModeChange} />);
    fireClick(getByLabelText('عرض تفاصيل'));
    expect(onViewModeChange).toHaveBeenCalledWith('list');
  });
});
