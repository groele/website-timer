#!/bin/bash
# 网站使用时长统计器 - 快速测试脚本

echo "🚀 开始测试网站使用时长统计器..."
echo ""

# 检查项目结构
echo "📁 检查项目结构..."
if [ -f "manifest.json" ] && [ -f "background.js" ] && [ -f "content.js" ] && [ -d "popup" ]; then
    echo "✅ 所有核心文件存在"
else
    echo "❌ 缺少核心文件"
    exit 1
fi

# 验证manifest.json语法
echo "🔍 验证manifest.json语法..."
if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo "✅ manifest.json语法正确"
else
    echo "❌ manifest.json语法错误"
    exit 1
fi

# 检查popup文件
echo "🎨 检查popup文件..."
if [ -f "popup/popup.html" ] && [ -f "popup/popup.js" ] && [ -f "popup/popup.css" ]; then
    echo "✅ popup文件完整"
else
    echo "❌ popup文件不完整"
    exit 1
fi

# 统计代码行数
echo "📊 代码统计..."
echo "- JavaScript文件: $(find . -name "*.js" | wc -l | tr -d ' ')个"
echo "- 总代码行数: $(find . -name "*.js" -o -name "*.html" -o -name "*.css" | xargs wc -l | tail -1 | awk '{print $1}')行"

echo ""
echo "🎉 测试完成！扩展已准备就绪。"
echo ""
echo "📝 安装说明："
echo "1. 打开Chrome -> chrome://extensions/"
echo "2. 开启开发者模式"
echo "3. 加载已解压的扩展程序"
echo "4. 选择当前目录"
echo ""
echo "⚠️  注意：图标文件需要手动准备（参考icons/README.md）"