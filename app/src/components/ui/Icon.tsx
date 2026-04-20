import React from 'react';
import Svg, { Path, SvgProps, Circle, Polyline, Rect, Line, Polygon } from 'react-native-svg';
import { colors } from '../../theme';

export type IconName =
  | 'home' | 'path' | 'discover' | 'profile' | 'close' | 'check' | 'settings' | 'gear'
  | 'chevron-left' | 'chevron-right' | 'coffee' | 'book' | 'globe' | 'volume' | 'volume-up'
  | 'sparkle' | 'info' | 'cube' | 'link' | 'unlock' | 'lock' | 'mic' | 'chart' | 'trophy'
  | 'fast-forward' | 'stop' | 'refresh' | 'arrow-left';

interface IconProps extends SvgProps {
  name: IconName;
  size?: number;
  color?: string;
}

// Basic feather/lucide styled paths (purely geometric 1.5px stroke, no fill)
export function Icon({ name, size = 24, color = colors.textPrimary, ...props }: IconProps) {
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const renderPath = () => {
    switch (name) {
      case 'home': return <Path {...strokeProps} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;
      case 'path': return <Path {...strokeProps} d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />;
      case 'discover': return <><Circle cx="12" cy="12" r="10" {...strokeProps} /><Path {...strokeProps} d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></>;
      case 'profile': return <><Path {...strokeProps} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" {...strokeProps}/></>;
      case 'close': return <><Line x1="18" y1="6" x2="6" y2="18" {...strokeProps} /><Line x1="6" y1="6" x2="18" y2="18" {...strokeProps} /></>;
      case 'check': return <Polyline {...strokeProps} points="20 6 9 17 4 12" />;
      case 'settings': case 'gear': return <><Circle cx="12" cy="12" r="3" {...strokeProps}/><Path {...strokeProps} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>;
      case 'chevron-left': return <Polyline {...strokeProps} points="15 18 9 12 15 6" />;
      case 'chevron-right': return <Polyline {...strokeProps} points="9 18 15 12 9 6" />;
      case 'coffee': return <Path {...strokeProps} d="M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3" />;
      case 'book': return <Path {...strokeProps} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />;
      case 'globe': return <><Circle cx="12" cy="12" r="10" {...strokeProps}/><Line x1="2" y1="12" x2="22" y2="12" {...strokeProps}/><Path {...strokeProps} d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>;
      case 'volume': return <><Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" {...strokeProps}/><Path {...strokeProps} d="M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07"/></>;
      case 'sparkle': return <Path {...strokeProps} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>;
      case 'info': return <><Circle cx="12" cy="12" r="10" {...strokeProps}/><Line x1="12" y1="16" x2="12" y2="12" {...strokeProps}/><Line x1="12" y1="8" x2="12.01" y2="8" {...strokeProps}/></>;
      case 'cube': return <><Path {...strokeProps} d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><Polyline {...strokeProps} points="3.27 6.96 12 12.01 20.73 6.96"/><Line x1="12" y1="22.08" x2="12" y2="12" {...strokeProps}/></>;
      case 'link': return <><Path {...strokeProps} d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><Path {...strokeProps} d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>;
      case 'unlock': return <><Rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...strokeProps}/><Path {...strokeProps} d="M7 11V7a5 5 0 0 1 9.9-1"/></>;
      case 'lock': return <><Rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...strokeProps}/><Path {...strokeProps} d="M7 11V7a5 5 0 0 1 10 0v4"/></>;
      case 'mic': return <><Path {...strokeProps} d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><Path {...strokeProps} d="M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8"/></>;
      case 'chart': return <><Line x1="18" y1="20" x2="18" y2="10" {...strokeProps}/><Line x1="12" y1="20" x2="12" y2="4" {...strokeProps}/><Line x1="6" y1="20" x2="6" y2="14" {...strokeProps}/></>;
      case 'trophy': return <><Path {...strokeProps} d="M8 21h8 M12 17v4 M7 4h10 M2 8h20 M12 2A10 10 0 0 1 12 22 10 10 0 0 1 12 2z" /></>;
      case 'fast-forward': return <><Polygon points="13 19 22 12 13 5 13 19" {...strokeProps}/><Polygon points="2 19 11 12 2 5 2 19" {...strokeProps}/></>;
      case 'volume-up': return <><Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" {...strokeProps}/><Path {...strokeProps} d="M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07"/></>;
      case 'stop': return <Rect x="6" y="6" width="12" height="12" rx="1" {...strokeProps} />;
      case 'refresh': return <><Polyline {...strokeProps} points="23 4 23 10 17 10" /><Path {...strokeProps} d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>;
      case 'arrow-left': return <><Line x1="19" y1="12" x2="5" y2="12" {...strokeProps} /><Polyline {...strokeProps} points="12 19 5 12 12 5" /></>;
      default: return <Circle cx="12" cy="12" r="10" {...strokeProps} />;
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...props}>
      {renderPath()}
    </Svg>
  );
}
