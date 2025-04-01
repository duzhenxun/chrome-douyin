const fs = require('fs');

// 创建SVG图标
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="#2196F3" rx="12" ry="12"/>
  <text x="64" y="64" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">M2G</text>
  <path d="M30,80 L50,85 L70,78 L90,85 L100,80" stroke="white" stroke-width="4" fill="none" />
  <path d="M30,90 L50,95 L70,88 L90,95 L100,90" stroke="white" stroke-width="4" fill="none" />
</svg>
`;

// 将SVG保存到文件
fs.writeFileSync('icon.svg', svgContent);

console.log('SVG图标已创建。');
console.log('请使用在线工具如 https://convertio.co/svg-png/ 将SVG转换为PNG，并创建16x16, 48x48和128x128大小的图标。');
console.log('或者使用 Inkscape, GIMP 等工具创建适当大小的PNG文件。'); 