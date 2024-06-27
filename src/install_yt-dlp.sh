#!/bin/bash

# تحقق من الصلاحيات قبل التنفيذ الآلي
if [ ! -x "$0" ]; then
    chmod +x "$0"
    exec "$0" "$@"
    exit 0
fi

# وظيفة للطباعة باللون الأخضر
print_green() {
    echo -e "\e[32m$1\e[0m"
}

# وظيفة للطباعة باللون الأحمر
print_red() {
    echo -e "\e[31m$1\e[0m"
}

# دالة لفحص نوع الطرفية
check_terminal_type() {
    SHELL_TYPE=$(basename "$SHELL")
    case "$SHELL_TYPE" in
        "bash")
            CONFIG_FILE=".bashrc"
            PROFILE_FILE=".bash_profile"
            print_green "Terminal type detected: Bash"
            ;;
        "zsh")
            CONFIG_FILE=".zshrc"
            print_green "Terminal type detected: Zsh"
            ;;
        *)
            print_red "Unsupported terminal type: $SHELL_TYPE"
            exit 1
            ;;
    esac

    # تحديد مسار الملف التهيئة
    CONFIG_PATH="$HOME/$CONFIG_FILE"
    PROFILE_PATH="$HOME/$PROFILE_FILE"
}

# تحقق من نوع الطرفية الحالية
check_terminal_type

# إذا كانت الطرفية bash، تحقق من وجود تضمين لـ ~/.bashrc في ~/.bash_profile
if [ "$SHELL_TYPE" = "bash" ] && [ ! -f "$PROFILE_PATH" ]; then
    echo "" >> "$PROFILE_PATH"
    echo "if [ -f ~/.bashrc ]; then" >> "$PROFILE_PATH"
    echo "    . ~/.bashrc" >> "$PROFILE_PATH"
    echo "fi" >> "$PROFILE_PATH"
    print_green "Added ~/.bashrc source inclusion to $PROFILE_PATH"
fi

# تحديد المجلد المستهدف
SCRIPT_DIR=$(dirname "$(realpath "$0" 2>/dev/null || readlink -f "$0")")
INSTALL_DIR="$SCRIPT_DIR/yt-dlp"
mkdir -p "$INSTALL_DIR"  # إنشاء المجلد إذا لم يكن موجوداً

# تعريف مسار yt-dlp كاملاً
YT_DLP_PATH="$INSTALL_DIR/yt-dlp"
if [[ "$OSTYPE" == "darwin"* ]]; then
    YT_DLP_PATH="$INSTALL_DIR/yt-dlp_macos"
fi

# إنشاء رابط رمزي إلى yt-dlp في ~/bin
SYMLINK_PATH="$HOME/bin/yt-dlp"
if [ ! -d "$HOME/bin" ]; then
    mkdir -p "$HOME/bin"
fi

if [ ! -f "$SYMLINK_PATH" ]; then
    ln -sf "$YT_DLP_PATH" "$SYMLINK_PATH"
    print_green "Created symlink to yt-dlp in $SYMLINK_PATH"
else
    print_red "Symlink to yt-dlp already exists in $SYMLINK_PATH"
fi

# إضافة الأوامر إلى ملف التهيئة المناسب
echo "" >> "$CONFIG_PATH"
echo "# إعدادات yt-dlp" >> "$CONFIG_PATH"
echo "export PATH=\"\$PATH:$HOME/bin\"" >> "$CONFIG_PATH"
print_green "Added yt-dlp settings to $CONFIG_PATH"

# تحديث المتغيرات في الحالية وتفعيلها
source "$CONFIG_PATH"
print_green "Environment variables updated"

# تثبيت yt-dlp حسب نظام التشغيل
install_yt_dlp() {
    URL=$1
    FILENAME=$2
    TARGET="$INSTALL_DIR/$FILENAME"

    # التحقق مما إذا كان الملف موجودًا بالفعل وليس نفسه
    if [ ! -f "$TARGET" ]; then
        curl -L "$URL" -o "$TARGET"
        chmod +x "$TARGET"
        print_green "yt-dlp installed successfully in $INSTALL_DIR"
    else
        print_green "yt-dlp already exists in $INSTALL_DIR"
    fi
}

# التحقق من نظام التشغيل وتثبيت yt-dlp
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$(uname -s)" == "Linux" ]]; then
    print_green "Detected Linux OS"
    install_yt_dlp "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" "yt-dlp"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    print_green "Detected macOS"
    install_yt_dlp "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" "yt-dlp_macos"
else
    print_red "Unsupported OS. Please install yt-dlp manually."
    exit 1
fi