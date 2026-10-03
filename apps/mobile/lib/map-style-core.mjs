const DAY_COLORS = {
  '#111516': '#F3F5EE', '#151B1B': '#E8EDE4', '#1C2A23': '#C6DCC0',
  '#23382C': '#B8D5B4', '#192C35': '#B9DCE5', '#31515A': '#78AEB8',
  '#202828': '#E0E6DE', '#293434': '#C8D2C9', '#34413E': '#AAB7AA',
  '#4A5A54': '#89998D', '#647268': '#738276', '#A6B5AA': '#52655A',
  '#E7EDE5': '#29372E', '#85A9AD': '#4D8290',
};

function recolor(value) {
  if (typeof value === 'string') return DAY_COLORS[value.toUpperCase()] ?? value;
  if (Array.isArray(value)) return value.map(recolor);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, recolor(child)]));
  }
  return value;
}

/** Pure JSON transformation shared by the native adapter and its Node tests. */
export function makeMapStyleFrom(baseStyle, theme) {
  const style = JSON.parse(JSON.stringify(baseStyle));
  style.name = theme === 'light' ? 'NearHere Daylight Playground v1' : 'NearHere Night Arcade v1';
  if (theme === 'light') {
    style.metadata = { ...style.metadata, 'nearhere:theme': 'Daylight Playground' };
    for (const layer of style.layers) {
      if (layer.paint) layer.paint = recolor(layer.paint);
    }
  }
  return style;
}
