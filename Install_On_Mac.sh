#!/usr/bin/env bash
#
# Dock Your Boat - Logitech Wheel setup for macOS.
# Double-click is not reliable for .sh files on a Mac, so the easy way is:
#   1) Open the "Terminal" app
#   2) Type:  bash    (with a space after it)
#   3) Drag THIS file into the Terminal window, then press Return
#
# It installs everything the wheel needs. Run it once.

# Always work from the folder this script lives in.
cd "$(dirname "$0")" || exit 1

echo ""
echo "==============================================="
echo "  Dock Your Boat - Logitech Wheel - Mac Setup"
echo "==============================================="
echo ""

# 1. Make sure Node.js is installed.
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed yet."
    echo ""
    echo "Please install it first (it is free):"
    echo "  1) A web page will open now."
    echo "  2) Download the big green 'LTS' button and install it."
    echo "  3) Then run this setup again."
    echo ""
    open "https://nodejs.org/en/download/" 2>/dev/null
    echo "Press Return to close."
    read -r _
    exit 1
fi

echo "Found Node.js $(node -v)."
echo ""

# 2. Install the project dependencies.
echo "Installing... (this can take a minute the first time)"
if ! npm install; then
    echo ""
    echo "Something went wrong during install. Please send the text above for help."
    echo "Press Return to close."
    read -r _
    exit 1
fi

echo ""
echo "Setup complete!  You are ready to use the wheel."
echo ""
echo "To start the wheel now, type:  npm run drive"
echo "(See LOGITECH_WHEEL.md for the full guide.)"
echo ""

# 3. Offer to start right away.
printf "Start the wheel now? [y/N] "
read -r answer
case "$answer" in
    [yY]*)
        echo ""
        npm run drive
        ;;
    *)
        echo "OK. Run 'npm run drive' whenever you want to play."
        ;;
esac
