import React from "react";

export const MEDIA_BREAKPOINTS = ["2xs", "xs", "sm", "md", "lg", "xl"] as const;
export type MediaBreakpoint = typeof MEDIA_BREAKPOINTS[number];
export type MediaBreakpointValues = { [key in MediaBreakpoint]: number };

export function useMediaBreakpoint(): MediaBreakpoint | undefined {
  const [mediaBreakpoint, setMediaBreakpoint] = React.useState<MediaBreakpoint | undefined>(undefined);

  React.useEffect(() => {
    const breakpointValues = retrieveMediaBreakpointValues();
    Object.values(breakpointValues).forEach(bpValue => {
      setMatchMediaCallback(bpValue, breakpointValues, setMediaBreakpoint);
    });
    setMediaBreakpoint(calculateCurrentBreakpoint(breakpointValues));
  }, []);
  return mediaBreakpoint;
}

function retrieveMediaBreakpointValues(): MediaBreakpointValues {
  const breakpointValues: { [key in MediaBreakpoint]?: number } = {};
  for (let bp of MEDIA_BREAKPOINTS) {
    const propertyName = '--breakpoint-' + bp;
    const bpValue = window.getComputedStyle(document.body).getPropertyValue(propertyName);
    if (bpValue == undefined) {
      throw new Error("Breakpoint value is not defined: " + propertyName);
    }
    breakpointValues[bp] = toPixels(bpValue);
  }
  return breakpointValues as MediaBreakpointValues;
}

function setMatchMediaCallback(breakpointSize: number, breakpointValues: MediaBreakpointValues, setMediaBreakpoint: (arg: MediaBreakpoint) => void) {
  const mql = window.matchMedia(`(max-width: ${breakpointSize}px)`);
  const onChange = () => {
    setMediaBreakpoint(calculateCurrentBreakpoint(breakpointValues));
  }
  mql.addEventListener("change", onChange)
}

function calculateCurrentBreakpoint(breakpointValues: MediaBreakpointValues): MediaBreakpoint {
  const w = window.innerWidth;
  for (let bp of MEDIA_BREAKPOINTS.toReversed()) {
    if (w > breakpointValues[bp]) {
      return bp;
    }
  }
  return MEDIA_BREAKPOINTS[0];
}

function toPixels(prop: string): number {
  const value = prop.trim().toLowerCase();
  // handle pixel values: '2px' -> 2
  if (value.endsWith('px')) {
    return parseFloat(value) || 0;
  }
  // handle rem values: '0.2rem' -> 0.2 * 16 = 3.2
  if (value.endsWith('rem')) {
    const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const remValue = parseFloat(value) || 0;
    return remValue * remSize;
  }
  // handle unitless numbers: '445' -> 445
  return parseFloat(value) || 0;
}

