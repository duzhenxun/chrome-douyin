const fs = require('fs');

// 定义不同尺寸的图标
const sizes = [16, 32, 48, 128];

// 创建SVG图标函数
function createSvgIcon(size) {
  const fontSize = Math.floor(size * 0.56); // 保持文字大小比例
  const radius = Math.floor(size * 0.22); // 保持圆角比例
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#000000" rx="${radius}" ry="${radius}"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">抖</text>
</svg>
`;
}

// 为每个尺寸创建并保存SVG文件
sizes.forEach(size => {
  const svgContent = createSvgIcon(size);
  fs.writeFileSync(`icon${size}.svg`, svgContent);
  console.log(`${size}x${size} SVG图标已创建。`);
});