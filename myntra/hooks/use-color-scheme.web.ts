import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

class ColorSchemeString extends String {
  current: string;

  constructor(value: string) {
    super(value);
    this.current = value;

    // Ensure the current property is writable and configurable
    Object.defineProperty(this, 'current', {
      value: value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  toString() {
    return this.current;
  }

  valueOf() {
    return this.current;
  }

  [Symbol.toPrimitive](hint: string) {
    return this.current;
  }
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  let scheme: string = 'light';

  try {
    const { isDark } = useAppTheme();
    if (hasHydrated) {
      scheme = isDark ? 'dark' : 'light';
    }
  } catch (error) {
    // Fallback if context is not available (e.g., during initialization/testing)
    const colorScheme = useRNColorScheme();
    if (hasHydrated) {
      scheme = colorScheme ?? 'light';
    }
  }

  return new ColorSchemeString(scheme) as any;
}
