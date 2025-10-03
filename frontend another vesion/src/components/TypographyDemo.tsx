import React from 'react';
import Heading from './typography/Heading';
import Text from './typography/Text';

export function TypographyDemo() {
  return (
    <div className="p-8 space-y-8">
      <Heading variant="h1">Responsive Typography Demo</Heading>
      
      <div className="space-y-4">
        <Heading variant="h1">Heading 1</Heading>
        <Heading variant="h2">Heading 2</Heading>
        <Heading variant="h3">Heading 3</Heading>
        <Heading variant="h4">Heading 4</Heading>
      </div>
      
      <div className="space-y-4">
        <Text variant="body">
          This is body text. The font size should scale responsively based on the viewport width. 
          On smaller screens, the text will be smaller, and on larger screens, it will be larger.
        </Text>
        <Text variant="caption">
          This is caption text. It's smaller than body text and should also scale responsively.
        </Text>
        <Text variant="overline">
          This is overline text. It's the smallest text variant and should scale responsively as well.
        </Text>
      </div>
      
      <div className="space-y-4">
        <h1 className="text-[--text-4xl] leading-[--leading-tight] font-[--font-heading]">
          Direct CSS Variable Usage - H1
        </h1>
        <h2 className="text-[--text-3xl] leading-[--leading-normal] font-[--font-heading]">
          Direct CSS Variable Usage - H2
        </h2>
        <p className="text-[--text-base] leading-[--leading-normal] font-[--font-body]">
          This paragraph uses CSS variables directly. The text should scale responsively based on the viewport width.
        </p>
      </div>
    </div>
  );
}