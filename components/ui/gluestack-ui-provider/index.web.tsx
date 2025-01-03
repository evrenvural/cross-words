'use client';

import React from 'react';

import { setFlushStyles } from '@gluestack-ui/nativewind-utils/flush';
import { OverlayProvider } from '@gluestack-ui/overlay';
import { ToastProvider } from '@gluestack-ui/toast';

import { config } from './config';

export function GluestackUIProvider({
  mode = 'light',
  ...props
}: {
  mode?: 'light' | 'dark';
  children?: any;
}) {
  const stringcssvars = Object.keys(config[mode]).reduce((acc, cur) => {
    acc += `${cur}:${config[mode][cur]};`;
    return acc;
  }, '');
  const styleToInject = `:root {${stringcssvars}} `;
  setFlushStyles(`:root {${stringcssvars}} `);

  if (config[mode] && typeof document !== 'undefined') {
    const element = document.documentElement;
    if (element) {
      const head = element.querySelector('head');
      const style = document.createElement('style');
      style.innerHTML = styleToInject;
      if (head) head.appendChild(style);
    }
  }

  return (
    <>
      <style>{styleToInject}</style>
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </>
  );
}
