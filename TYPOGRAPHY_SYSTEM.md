# ClearBoard Typography System

## Overview
ClearBoard now features a modern, professional typography system designed specifically for an enterprise file storage platform. The font system uses carefully selected Google Fonts to create a clean, trustworthy, and sophisticated brand identity.

## Font Families

### Headings: **Outfit**
- **Purpose**: Used for all headings, titles, and brand elements
- **Characteristics**: 
  - Modern geometric sans-serif
  - Strong, confident presence
  - Excellent readability at large sizes
  - Professional and contemporary feel
- **Usage**: Brand logo, page titles, section headings, card titles, buttons

### Body Text: **Inter**
- **Purpose**: Used for all body text, UI elements, and descriptions
- **Characteristics**:
  - Optimized for screen readability
  - Clean and neutral
  - Excellent legibility at small sizes
  - Professional and approachable
- **Usage**: Paragraphs, labels, form inputs, navigation links, descriptions

### Monospace: **SF Mono / Monaco / Fira Code**
- **Purpose**: Used for code snippets and technical content
- **Usage**: File names, code blocks, technical data

## Font Weights

The system uses a comprehensive weight scale:
- **Light (300)**: Subtle text, less important information
- **Normal (400)**: Body text, standard UI elements
- **Medium (500)**: Navigation links, emphasized body text
- **Semibold (600)**: Labels, form elements, secondary headings
- **Bold (700)**: Feature titles, important headings
- **Extrabold (800)**: Main headings, brand elements
- **Black (900)**: Hero titles, maximum emphasis

## Typography Scale

### Headings (Outfit)
- **H1**: 56px / 900 weight / -0.03em letter-spacing
- **H2**: 40px / 800 weight / -0.02em letter-spacing
- **H3**: 32px / 700 weight / -0.02em letter-spacing
- **H4**: 24px / 700 weight / -0.01em letter-spacing
- **H5**: 20px / 600 weight / normal letter-spacing
- **H6**: 18px / 600 weight / normal letter-spacing

### Body Text (Inter)
- **Large**: 19px / 400 weight / 1.6 line-height
- **Base**: 16px / 400 weight / 1.5 line-height
- **Small**: 14px / 400 weight / 1.5 line-height
- **Caption**: 12px / 400 weight / 1.5 line-height

## CSS Variables

The typography system uses CSS custom properties for consistency:

```css
:root {
  /* Font Families */
  --font-heading: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  
  /* Font Weights */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  --font-weight-black: 900;
  
  /* Letter Spacing */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.02em;
  
  /* Line Heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}
```

## Usage Guidelines

### For Headings
Always use `var(--font-heading)` or the `.heading` class:
```css
.my-title {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-tight);
}
```

### For Body Text
Use `var(--font-body)` or rely on the default:
```css
.my-paragraph {
  font-family: var(--font-body);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
}
```

### Utility Classes
The system includes utility classes for quick styling:

**Font Families:**
- `.text-heading` - Outfit font
- `.text-body` - Inter font
- `.text-mono` - Monospace font

**Font Weights:**
- `.font-light` - 300
- `.font-normal` - 400
- `.font-medium` - 500
- `.font-semibold` - 600
- `.font-bold` - 700
- `.font-extrabold` - 800
- `.font-black` - 900

**Text Sizes:**
- `.text-xs` - 12px
- `.text-sm` - 14px
- `.text-base` - 16px
- `.text-lg` - 18px
- `.text-xl` - 20px
- `.text-2xl` - 24px
- `.text-3xl` - 30px
- `.text-4xl` - 36px
- `.text-5xl` - 48px

## Brand Identity

The typography system reinforces ClearBoard's brand values:

1. **Professional**: Outfit's geometric precision conveys expertise and reliability
2. **Modern**: Contemporary font choices signal innovation and forward-thinking
3. **Trustworthy**: Inter's clarity and readability build user confidence
4. **Enterprise-Ready**: The sophisticated pairing appeals to business clients
5. **Accessible**: Both fonts are highly legible across devices and sizes

## Performance

- **Google Fonts**: Loaded via CDN with preconnect for optimal performance
- **Font Display**: Set to `swap` for immediate text rendering
- **Fallbacks**: System fonts ensure text is always readable
- **Weights**: Only necessary weights are loaded to minimize file size

## Responsive Behavior

The typography scales appropriately on smaller screens:

**Tablet (≤768px):**
- H1: 48px → 40px
- H2: 40px → 36px
- H3: 32px → 28px

**Mobile (≤480px):**
- H1: 40px → 32px
- H2: 36px → 30px
- H3: 28px → 24px

## Implementation Files

1. **Typography.css**: Core typography system with variables and utilities
2. **index.css**: Updated to use new font variables
3. **index.html**: Google Fonts import links

## Migration Notes

The old 'Shree Devanagari 714' font has been completely replaced with the new modern system. All existing components will automatically inherit the new fonts through the global CSS cascade.

---

**Last Updated**: December 9, 2025
**Version**: 1.0.0
**Designer**: Vision71 Technologies
