# 扩展图标说明

## 图标要求

Chrome扩展需要以下尺寸的PNG图标文件：
- `icon16.png` - 16x16像素
- `icon32.png` - 32x32像素  
- `icon48.png` - 48x48像素
- `icon128.png` - 128x128像素

## 准备图标文件

### 方法1: 使用在线工具转换SVG

1. 使用提供的 `icon-template.svg` 作为基础
2. 访问在线SVG转PNG工具，如：
   - https://svgtopng.com/
   - https://convertio.co/svg-png/
   - https://cloudconvert.com/svg-to-png

3. 分别转换为所需的4个尺寸

### 方法2: 使用设计软件

使用Figma、Adobe Illustrator、或Canva等工具：
1. 导入SVG文件
2. 调整画布大小为所需尺寸
3. 导出为PNG格式

### 方法3: 使用命令行工具

如果你安装了ImageMagick或Inkscape：

```bash
# 使用Inkscape
inkscape -w 16 -h 16 icon-template.svg -o icon16.png
inkscape -w 32 -h 32 icon-template.svg -o icon32.png
inkscape -w 48 -h 48 icon-template.svg -o icon48.png
inkscape -w 128 -h 128 icon-template.svg -o icon128.png

# 或使用ImageMagick
convert icon-template.svg -resize 16x16 icon16.png
convert icon-template.svg -resize 32x32 icon32.png
convert icon-template.svg -resize 48x48 icon48.png
convert icon-template.svg -resize 128x128 icon128.png
```

## 图标设计理念

当前图标设计包含：
- **时钟元素**：表示时间统计功能
- **条形图**：表示数据统计分析
- **渐变背景**：现代化的视觉效果
- **清晰简洁**：在小尺寸下依然清晰可辨

## 临时解决方案

如果暂时无法准备图标文件，可以：
1. 在manifest.json中暂时注释掉图标配置
2. 或者使用浏览器的默认图标
3. 扩展功能不受影响，只是视觉效果会受影响

完成图标文件准备后，确保所有PNG文件都放在 `icons/` 目录下。