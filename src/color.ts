type Rgb = { red: number; green: number; blue: number };

function parseHexColor(input: string): Rgb | null {
  const value = input.trim().replace(/^#/, "");
  if (![3, 6].includes(value.length)) {
    return null;
  }

  const normalized = value.length === 3
    ? value.split("").map((part) => `${part}${part}`).join("")
    : value;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { red, green, blue };
}

function parseRgbColor(input: string): Rgb | null {
  const match = input.trim().match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    return null;
  }

  const red = Number.parseInt(match[1] ?? "", 10);
  const green = Number.parseInt(match[2] ?? "", 10);
  const blue = Number.parseInt(match[3] ?? "", 10);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { red, green, blue };
}

function toLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function getContrastTextColor(
  backgroundColor: string,
  lightText = "#ffffff",
  darkText = "#111318",
): string {
  const rgb = parseHexColor(backgroundColor) ?? parseRgbColor(backgroundColor);

  if (!rgb) {
    return lightText;
  }

  const luminance =
    0.2126 * toLinear(rgb.red) +
    0.7152 * toLinear(rgb.green) +
    0.0722 * toLinear(rgb.blue);

  return luminance > 0.58 ? darkText : lightText;
}