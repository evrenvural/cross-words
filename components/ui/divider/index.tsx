import { cssInterop } from 'react-native-css-interop';

import React from 'react';

import { View } from 'react-native';

import { createDivider } from '@gluestack-ui/divider';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const dividerStyle = tva({
  base: 'bg-background-200',
  variants: {
    orientation: {
      vertical: 'w-px h-full',
      horizontal: 'h-px w-full',
    },
  },
});

const UIDivider = createDivider({ Root: View });

cssInterop(UIDivider, { className: 'style' });

const Divider = React.forwardRef(
  ({ className, orientation = 'horizontal', ...props }: any, ref?: any) => {
    return (
      <UIDivider
        ref={ref}
        className={dividerStyle({
          orientation,
          class: className,
        })}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';

export { Divider };
