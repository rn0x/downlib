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

# تحديد المجلد المستهدف
SCRIPT_DIR=$(dirname "$(realpath "$0" 2>/dev/null || readlink -f "$0")")
INSTALL_DIR="$SCRIPT_DIR/yt-dlp"
mkdir -p "$INSTALL_DIR"

# تعريف مسار yt-dlp كاملاً
YT_DLP_PATH="$INSTALL_DIR/yt-dlp"
if [[ "$OSTYPE" == "darwin"* ]]; then
    YT_DLP_PATH="$INSTALL_DIR/yt-dlp_macos"
fi

# التحقق من نوع الطرفية (bash أو zsh أو bashrc)
if [[ -n "$BASH_VERSION" ]]; then
    profile_file=~/.bash_profile
elif [[ -n "$ZSH_VERSION" ]]; then
    profile_file=~/.zshrc
elif [[ -f ~/.bashrc ]]; then
    profile_file=~/.bashrc
else
    print_red "Unsupported shell. Please add yt-dlp to your PATH manually."
    exit 1
fi

# التحقق مما إذا كان المتغير معرف بالفعل
if grep -q "export yt-dlp=\"$YT_DLP_PATH\"" "$profile_file"; then
    print_green "yt-dlp already exists in $profile_file"
else
    echo "export yt-dlp=\"$YT_DLP_PATH\"" >> "$profile_file"
    print_green "yt-dlp added to $profile_file"
fi

# إضافة yt-dlp إلى مسار البيئة إذا لم يتم ذلك بالفعل
if ! command -v yt-dlp &>/dev/null; then
    export PATH="$YT_DLP_PATH:$PATH"
    if grep -q "export PATH=\"$YT_DLP_PATH:\$PATH\"" "$profile_file"; then
        print_green "PATH already includes $YT_DLP_PATH"
    else
        echo "export PATH=\"$YT_DLP_PATH:\$PATH\"" >> "$profile_file"
        print_green "PATH updated in $profile_file"
    fi
else
    print_green "yt-dlp already exists in PATH"
fi

# تحديث المتغيرات في الحالية وتفعيلها
source "$profile_file"
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